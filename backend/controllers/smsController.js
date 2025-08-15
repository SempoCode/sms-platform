const SMS = require('../models/smsModel');
const { port } = require('../config/serial');
const at = require('../utils/atCommands');

// const waitFor = (expected, timeout = 5000) => {
//   return new Promise((resolve, reject) => {
//     let buffer = '';
//     const onData = data => {
//       buffer += data.toString();
//       if (buffer.includes(expected)) {
//         port.removeListener('data', onData);
//         resolve(buffer);
//       }
//     };
//     port.on('data', onData);
//     setTimeout(() => {
//       port.removeListener('data', onData);
//       reject(new Error(`Timeout waiting for: ${expected}`));
//     }, timeout);
//   });
// };

const waitFor = (expectedList = ['OK', 'ERROR'], timeout = 5000) => {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = data => {
      buffer += data.toString();
      // Check if buffer contains any of the expected end markers
      if (expectedList.some(expected => buffer.includes(expected))) {
        port.removeListener('data', onData);
        resolve(buffer);
      }
    };
    port.on('data', onData);
    setTimeout(() => {
      port.removeListener('data', onData);
      reject(new Error(`Timeout waiting for: ${expectedList.join(' or ')}`));
    }, timeout);
  });
};

const clearSerialBuffer = () => {
  return new Promise(resolve => {
    port.flush(() => resolve());
  });
};

const sendSingleSMS = async (number, message) => {
  try {
    await clearSerialBuffer();

    // Init sequence
    for (let cmd of at.init()) {
      port.write(cmd + '\r');
      await waitFor(['OK'], 2000);
    }

    // SMS mode
    port.write('AT+CMGF=1\r');
    await waitFor(['OK'], 2000);

    // Set recipient
    port.write(`AT+CMGS="${number}"\r`);
    await waitFor(['>'], 4000); // Wait for prompt

    // Send message
    // port.write(message + String.fromCharCode(26)); 
    port.write(message);
    await new Promise(r => setTimeout(r, 3000)); // 3000ms delay
    port.write(String.fromCharCode(26)); // CTRL+Z

    await waitFor(['OK'], 10000); // Wait for send confirmation

    return { success: true, log: `✅ Sent successfully to ${number}` };
  } catch (err) {
    return { success: false, error: err.message, log: `❌ Failed to send to ${number}: ${err.message}` };
  }
};

exports.sendBulkSMS = async (req, res) => {
  const { numbers, message } = req.body;
  const results = [];

  for (let num of numbers) {
    console.log(`--- Sending to ${num} ---`);
    const result = await sendSingleSMS(num, message);

    // Log in console clearly
    console.log(result.log);

    // Push structured result for frontend
    results.push({
      number: num,
      success: result.success,
      error: result.error || null,
      log: result.log
    });

    // Save only if sent successfully
    if (result.success) {
      await SMS.create({ number: num, message });
    }
  }

  // Final backend response
  res.json({
    status: 'Bulk send complete',
    total: numbers.length,
    results
  });
};

exports.getLogs = async (req, res) => {
  const logs = await SMS.find().sort({ sentAt: -1 });
  res.json(logs);
};

// AT Command terminal endpoint
// exports.runATCommand = async (req, res) => {
//   try {
//     const { command } = req.body;
//     if (!command) {
//       return res.status(400).json({ error: 'No AT command provided' });
//     }

//     console.log('Sending AT Command:', command);
//     lastResponse = ''; // Clear old responses

//     // Send AT command
//     port.write(command + '\r');

//     // Wait for modem to respond
//     setTimeout(() => {
//       res.json({ response: lastResponse.trim() || 'No response received' });
//     }, 500); // Adjust delay if responses are slow
//   } catch (err) {
//     console.error('AT Command Error:', err);
//     res.status(500).json({ error: err.message });
//   }
// };


// exports.runATCommand = async (req, res) => {
//   try {
//     const { command } = req.body;
//     if (!command) {
//       return res.status(400).json({ error: 'No AT command provided' });
//     }

//     console.log('Sending AT Command:', command);

//     await clearSerialBuffer();
//     port.write(command + '\r');

//     try {
//       // Wait for modem to respond with OK or ERROR
//       const response = await waitFor('OK', 2000).catch(() => waitFor('ERROR', 2000));
//       res.json({ response: response.trim() });
//     } catch (err) {
//       res.json({ response: 'No response received' });
//     }

//   } catch (err) {
//     console.error('AT Command Error:', err);
//     res.status(500).json({ error: err.message });
//   }
// };


exports.runATCommand = async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'No AT command provided' });
    }

    console.log('Sending AT Command:', command);

    await clearSerialBuffer();
    port.write(command + '\r');

    try {
      // Wait for either OK, ERROR, or the SMS prompt
      const response = await waitFor(['OK', 'ERROR', '>'], 3000);
      res.json({ response: response.trim() });
    } catch (err) {
      res.json({ response: 'No response received' });
    }

  } catch (err) {
    console.error('AT Command Error:', err);
    res.status(500).json({ error: err.message });
  }
};



