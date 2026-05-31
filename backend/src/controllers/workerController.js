const Worker = require('../models/Worker');

// @desc  Get all workers
// @route GET /api/workers
const getWorkers = async (req, res) => {
  try {
    // Mark workers offline if no heartbeat in 30s
    const cutoff = new Date(Date.now() - 30000);
    await Worker.updateMany(
      { lastHeartbeat: { $lt: cutoff }, status: { $ne: 'OFFLINE' } },
      { status: 'OFFLINE' }
    );

    const workers = await Worker.find().sort({ startedAt: -1 });
    res.json({ success: true, data: workers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Worker heartbeat (called by workers)
// @route POST /api/workers/heartbeat
const workerHeartbeat = async (req, res) => {
  try {
    const { workerId, host, status, currentTaskId, tasksProcessed, tasksFailed, queues } = req.body;

    const worker = await Worker.findOneAndUpdate(
      { workerId },
      {
        host,
        status: status || 'IDLE',
        currentTaskId: currentTaskId || null,
        tasksProcessed: tasksProcessed || 0,
        tasksFailed: tasksFailed || 0,
        lastHeartbeat: new Date(),
        queues: queues || [],
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete/deregister a worker
// @route DELETE /api/workers/:workerId
const deleteWorker = async (req, res) => {
  try {
    await Worker.findOneAndDelete({ workerId: req.params.workerId });
    res.json({ success: true, message: 'Worker removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getWorkers, workerHeartbeat, deleteWorker };
