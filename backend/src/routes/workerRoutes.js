const express = require('express');
const router = express.Router();
const { getWorkers, workerHeartbeat, deleteWorker } = require('../controllers/workerController');

router.get('/', getWorkers);
router.post('/heartbeat', workerHeartbeat);
router.delete('/:workerId', deleteWorker);

module.exports = router;
