require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const amqp = require('amqplib');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const axios = require('axios').default;

const Task = require('../models/Task');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taskqueue';
const QUEUE_NAME = process.env.QUEUE_NAME || 'task_queue';
const DEAD_LETTER_QUEUE = process.env.DEAD_LETTER_QUEUE || 'dead_letter_queue';
const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const PRIORITY_QUEUES = {
  high: 'task_queue_high',
  medium: 'task_queue_medium',
  low: 'task_queue_low',
};

const WORKER_ID = `worker-${uuidv4().slice(0, 8)}`;
const HOST = os.hostname();

let tasksProcessed = 0;
let tasksFailed = 0;
let currentTaskId = null;

// ─── Task Handlers ────────────────────────────────────────────────────────────
const taskHandlers = {
  EMAIL: async (payload) => {
    await sleep(1000 + Math.random() * 2000);
    return { sent: true, to: payload.to || 'user@example.com', timestamp: new Date() };
  },
  IMAGE_PROCESSING: async (payload) => {
    await sleep(2000 + Math.random() * 3000);
    return { processed: true, imageUrl: payload.imageUrl, dimensions: '1920x1080' };
  },
  DATA_EXPORT: async (payload) => {
    await sleep(1500 + Math.random() * 2500);
    return { exported: true, rows: Math.floor(Math.random() * 10000), format: payload.format || 'CSV' };
  },
  REPORT_GENERATION: async (payload) => {
    await sleep(3000 + Math.random() * 4000);
    return { report: 'generated', pages: Math.floor(Math.random() * 50) + 1, type: payload.reportType };
  },
  NOTIFICATION: async (payload) => {
    await sleep(500 + Math.random() * 1000);
    return { notified: true, channel: payload.channel || 'push', recipients: payload.recipients || 1 };
  },
  CUSTOM: async (payload) => {
    await sleep(1000 + Math.random() * 3000);
    // Simulate 15% failure rate for demo
    if (Math.random() < 0.15) throw new Error('Simulated processing failure');
    return { processed: true, payload };
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Process a single task ────────────────────────────────────────────────────
const processTask = async (task) => {
  const handler = taskHandlers[task.type] || taskHandlers.CUSTOM;
  const startedAt = new Date();

  await Task.findByIdAndUpdate(task._id, {
    status: 'PROCESSING',
    workerId: WORKER_ID,
    workerHost: HOST,
    startedAt,
  });

  currentTaskId = task._id;
  console.log(`⚙️  [${WORKER_ID}] Processing task: ${task.name} (${task.type})`);

  const result = await handler(task.payload || {});
  const completedAt = new Date();
  const duration = completedAt - startedAt;

  await Task.findByIdAndUpdate(task._id, {
    status: 'COMPLETED',
    result,
    completedAt,
    duration,
  });

  tasksProcessed++;
  currentTaskId = null;
  console.log(`✅ [${WORKER_ID}] Completed: ${task.name} in ${duration}ms`);
};

// ─── Handle task failure / retry ─────────────────────────────────────────────
const handleFailure = async (task, error, channel, msg) => {
  tasksFailed++;
  currentTaskId = null;
  const retryCount = (task.retryCount || 0) + 1;
  const maxRetries = task.maxRetries || 3;

  console.error(`❌ [${WORKER_ID}] Failed: ${task.name} — ${error.message} (attempt ${retryCount}/${maxRetries})`);

  if (retryCount <= maxRetries) {
    await Task.findByIdAndUpdate(task._id, {
      status: 'QUEUED',
      retryCount,
      error: error.message,
      workerId: null,
      startedAt: null,
    });

    const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
    await sleep(delay);

    const queueName = PRIORITY_QUEUES[task.priority] || QUEUE_NAME;
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify({ ...task, retryCount })), {
      persistent: true,
      headers: { retryCount },
    });
    console.log(`🔄 [${WORKER_ID}] Re-queued ${task.name} (retry ${retryCount})`);
  } else {
    await Task.findByIdAndUpdate(task._id, {
      status: 'DEAD',
      error: error.message,
      completedAt: new Date(),
    });
    console.log(`💀 [${WORKER_ID}] Task ${task.name} moved to DEAD state`);
  }
};

// ─── Heartbeat ────────────────────────────────────────────────────────────────
const sendHeartbeat = async () => {
  try {
    await axios.post(`${API_BASE}/workers/heartbeat`, {
      workerId: WORKER_ID,
      host: HOST,
      status: currentTaskId ? 'BUSY' : 'IDLE',
      currentTaskId,
      tasksProcessed,
      tasksFailed,
      queues: Object.values(PRIORITY_QUEUES),
    });
  } catch {
    // Silently fail heartbeat — server may be temporarily down
  }
};

// ─── Consumer setup ───────────────────────────────────────────────────────────
const startWorker = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ [${WORKER_ID}] MongoDB connected`);

    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Assert all queues
    await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    for (const q of Object.values(PRIORITY_QUEUES)) {
      await channel.assertQueue(q, { durable: true });
    }

    channel.prefetch(1); // Process one task at a time per worker

    const consumeQueue = (queueName) => {
      channel.consume(queueName, async (msg) => {
        if (!msg) return;
        let task;
        try {
          task = JSON.parse(msg.content.toString());
          await processTask(task);
          channel.ack(msg);
        } catch (error) {
          channel.ack(msg); // ack to remove from queue, handle retry manually
          if (task) await handleFailure(task, error, channel, msg);
        }
      });
    };

    // Consume all priority queues (high first by convention)
    consumeQueue(PRIORITY_QUEUES.high);
    consumeQueue(PRIORITY_QUEUES.medium);
    consumeQueue(PRIORITY_QUEUES.low);
    consumeQueue(QUEUE_NAME);

    console.log(`🚀 [${WORKER_ID}] Worker started on host: ${HOST}`);
    console.log(`📥 Listening on queues: ${Object.values(PRIORITY_QUEUES).join(', ')}`);

    // Send heartbeat every 10 seconds
    setInterval(sendHeartbeat, 10000);
    sendHeartbeat();

    process.on('SIGINT', async () => {
      console.log(`\n🛑 [${WORKER_ID}] Shutting down...`);
      await channel.close();
      await connection.close();
      await mongoose.connection.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Worker startup failed:', error.message);
    setTimeout(startWorker, 5000);
  }
};

startWorker();
