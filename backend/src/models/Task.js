const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Task name is required'],
      trim: true,
      maxlength: [100, 'Task name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    type: {
      type: String,
      enum: ['EMAIL', 'IMAGE_PROCESSING', 'DATA_EXPORT', 'REPORT_GENERATION', 'NOTIFICATION', 'CUSTOM'],
      default: 'CUSTOM',
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD'],
      default: 'PENDING',
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    workerId: {
      type: String,
      default: null,
    },
    workerHost: {
      type: String,
      default: null,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // milliseconds
      default: null,
    },
    tags: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ workerId: 1 });

// Virtual for formatted duration
taskSchema.virtual('durationFormatted').get(function () {
  if (!this.duration) return null;
  if (this.duration < 1000) return `${this.duration}ms`;
  return `${(this.duration / 1000).toFixed(2)}s`;
});

taskSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Task', taskSchema);
