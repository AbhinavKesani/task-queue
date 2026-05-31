const Task = require('../models/Task');
const { publishTask } = require('../config/rabbitmq');

// @desc  Create and enqueue a task
// @route POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { name, description, type, payload, priority, maxRetries, scheduledAt, tags } = req.body;

    const task = await Task.create({
      name,
      description,
      type: type || 'CUSTOM',
      payload: payload || {},
      priority: priority || 'medium',
      maxRetries: maxRetries || 3,
      scheduledAt: scheduledAt || null,
      tags: tags || [],
      status: 'PENDING',
    });

// Publish to RabbitMQ (if available)
try {
  await publishTask(task, task.priority);
  task.status = 'QUEUED';
} catch (err) {
  console.log('RabbitMQ unavailable, storing task in MongoDB only');
  task.status = 'QUEUED';
}

await task.save();

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get all tasks with filters and pagination
// @route GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      type,
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Task.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get single task
// @route GET /api/tasks/:id
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Retry a failed task
// @route POST /api/tasks/:id/retry
const retryTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (!['FAILED', 'DEAD'].includes(task.status)) {
      return res.status(400).json({ success: false, message: 'Only FAILED or DEAD tasks can be retried' });
    }

    task.status = 'QUEUED';
    task.error = null;
    task.retryCount += 1;
    task.startedAt = null;
    task.completedAt = null;
    task.workerId = null;
    task.workerHost = null;
    await task.save();

    await publishTask(task, task.priority);

    res.json({ success: true, data: task, message: 'Task re-queued successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Cancel a pending/queued task
// @route POST /api/tasks/:id/cancel
const cancelTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (!['PENDING', 'QUEUED'].includes(task.status)) {
      return res.status(400).json({ success: false, message: 'Only PENDING or QUEUED tasks can be cancelled' });
    }

    task.status = 'FAILED';
    task.error = 'Cancelled by user';
    task.completedAt = new Date();
    await task.save();

    res.json({ success: true, data: task, message: 'Task cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete a task
// @route DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get dashboard stats
// @route GET /api/tasks/stats
const getStats = async (req, res) => {
  try {
    const [statusCounts, priorityCounts, typeCounts, recentTasks, avgDuration] = await Promise.all([
      Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Task.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Task.find().sort({ createdAt: -1 }).limit(5).lean(),
      Task.aggregate([
        { $match: { status: 'COMPLETED', duration: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ]),
    ]);

    const stats = {
      byStatus: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      byPriority: priorityCounts.reduce((acc, p) => ({ ...acc, [p._id]: p.count }), {}),
      byType: typeCounts.reduce((acc, t) => ({ ...acc, [t._id]: t.count }), {}),
      recentTasks,
      avgDuration: avgDuration[0]?.avg || 0,
      total: await Task.countDocuments(),
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createTask, getTasks, getTask, retryTask, cancelTask, deleteTask, getStats };
