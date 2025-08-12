const express = require('express');
const router = express.Router();
const { sendBulkSMS, getLogs } = require('../controllers/smsController');

router.post('/send', sendBulkSMS);
router.get('/logs', getLogs);

module.exports = router;