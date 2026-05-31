const amqp = require('amqplib');

let connection = null;
let channel = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = process.env.QUEUE_NAME || 'task_queue';
const DEAD_LETTER_QUEUE = process.env.DEAD_LETTER_QUEUE || 'dead_letter_queue';
const PRIORITY_QUEUES = {
  high: 'task_queue_high',
  medium: 'task_queue_medium',
  low: 'task_queue_low',
};

const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Dead Letter Queue
    await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });

    // Main queue with DLQ support
    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': DEAD_LETTER_QUEUE,
      },
    });

    // Priority queues
    for (const q of Object.values(PRIORITY_QUEUES)) {
      await channel.assertQueue(q, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': DEAD_LETTER_QUEUE,
        },
      });
    }

    console.log('✅ RabbitMQ Connected & Queues Asserted');

    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err.message);
    });
    connection.on('close', () => {
      console.warn('RabbitMQ connection closed. Reconnecting...');
      setTimeout(connectRabbitMQ, 5000);
    });

    return channel;
  } catch (error) {
    console.error('❌ RabbitMQ Connection Failed:', error.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectRabbitMQ, 5000);
  }
};

const getChannel = () => channel;

const publishTask = async (task, priority = 'medium') => {
  const ch = getChannel();
  if (!ch) throw new Error('RabbitMQ channel not available');

  const queueName = PRIORITY_QUEUES[priority] || QUEUE_NAME;
  const message = Buffer.from(JSON.stringify(task));

  ch.sendToQueue(queueName, message, {
    persistent: true,
    messageId: task._id.toString(),
    timestamp: Date.now(),
    headers: { priority, retryCount: 0 },
  });

  console.log(`📤 Task ${task._id} published to [${queueName}]`);
};

const closeConnection = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    console.error('Error closing RabbitMQ:', err.message);
  }
};

module.exports = {
  connectRabbitMQ,
  getChannel,
  publishTask,
  closeConnection,
  QUEUE_NAME,
  DEAD_LETTER_QUEUE,
  PRIORITY_QUEUES,
};
