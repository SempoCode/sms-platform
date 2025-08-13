//controllers/smsController.js
const SMS = require('../models/smsModel');
const { port, parser } = require('../config/serial');
const at = require('../utils/atCommands');

const delay = ms => new Promise(res => setTimeout(res, ms));

// Helper to wait for OK or ERROR from modem
const waitForResponse = () => {
  return new Promise((resolve) => {
    const onData = (data) => {
      console.log("SIM800C Response:", data);
      if (data.includes("OK")) {
        parser.off("data", onData);
        resolve(true);
      }
      if (data.includes("ERROR")) {
        parser.off("data", onData);
        resolve(false);
      }
    };
    parser.on("data", onData);
  });
};

const sendSingleSMS = async (number, message) => {
  // Initialize modem
  for (let cmd of at.init()) {
    port.write(cmd + '\r');
    const ok = await waitForResponse();
    if (!ok) return false;
    await delay(200);
  }

  // Send SMS
  for (let cmd of at.sendSMS(number, message)) {
    port.write(cmd + '\r');
    const ok = await waitForResponse();
    if (!ok) return false;
    await delay(200);
  }

  return true;
};

exports.sendBulkSMS = async (req, res) => {
  try {
    const { numbers, message } = req.body;
    let results = [];

    for (let num of numbers) {
      const success = await sendSingleSMS(num, message);
      results.push({ number: num, success });

      if (success) {
        await SMS.create({ number: num, message });
      }
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLogs = async (req, res) => {
  const logs = await SMS.find().sort({ sentAt: -1 });
  res.json(logs);
};
