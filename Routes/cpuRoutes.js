// Routes/cpuRoutes.js
const express = require('express');
const router = express.Router();
const cpuController = require('../Controllers/cpuController'); // ensure path accuracy

// to handle CPU data fetching
router.post('/usage', cpuController.getCpuUsage);

module.exports = router;
