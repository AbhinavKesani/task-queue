const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema(
  {
    workerId: {
      type: String,
      required: true,
      unique: true,
    },
    host: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['IDLE', 'BUSY', 'OFFLINE'],
      default: 'IDLE',
    },
    currentTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    tasksProcessed: {
      type: Number,
      default: 0,
    },
    tasksFailed: {
      type: Number,
      default: 0,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    concurrency: {
      type: Number,
      default: 1,
    },
    queues: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Worker', workerSchema);
