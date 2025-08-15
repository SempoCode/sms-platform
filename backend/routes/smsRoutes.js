const express = require('express');
const router = express.Router();
const { sendBulkSMS, getLogs, runATCommand } = require('../controllers/smsController');

router.post('/send', sendBulkSMS);
router.post('/run-at', runATCommand); // New AT command route
router.get('/logs', getLogs);

module.exports = router;