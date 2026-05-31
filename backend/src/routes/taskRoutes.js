const express = require('express');
const router = express.Router();
const {
  createTask,
  getTasks,
  getTask,
  retryTask,
  cancelTask,
  deleteTask,
  getStats,
} = require('../controllers/taskController');

router.get('/stats', getStats);
router.route('/').get(getTasks).post(createTask);
router.route('/:id').get(getTask).delete(deleteTask);
router.post('/:id/retry', retryTask);
router.post('/:id/cancel', cancelTask);

module.exports = router;
