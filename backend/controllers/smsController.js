const SMS = require('../models/smsModel');
const { port } = require('../config/serial');
const at = require('../utils/atCommands');

const delay = ms => new Promise(res => setTimeout(res, ms));

const sendSingleSMS = async (number, message) => {
  // Initialize modem
  for (let cmd of at.init()) {
    port.write(cmd + '\r');
    await delay(500);
  }
  // Send SMS
  for (let cmd of at.sendSMS(number, message)) {
    port.write(cmd + '\r');
    await delay(1000);
  }
};

exports.sendBulkSMS = async (req, res) => {
  try {
    const { numbers, message } = req.body;
    for (let num of numbers) {
      await sendSingleSMS(num, message);
      await SMS.create({ number: num, message });
    }
    res.json({ status: 'Messages sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLogs = async (req, res) => {
  const logs = await SMS.find().sort({ sentAt: -1 });
  res.json(logs);
};