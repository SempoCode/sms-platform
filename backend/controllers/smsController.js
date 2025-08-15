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

// const sendSingleSMS = async (number, message) => {
//   try {
//     await clearSerialBuffer();

//     // Init sequence
//     for (let cmd of at.init()) {
//       port.write(cmd + '\r');
//       await waitFor(['OK'], 2000);
//     }

//     // SMS mode
//     port.write('AT+CMGF=1\r');
//     await waitFor(['OK'], 2000);

//     // Set recipient
//     port.write(`AT+CMGS="${number}"\r`);
//     await waitFor(['>'], 4000); // Wait for prompt

//     // Send message
//     // port.write(message + String.fromCharCode(26)); 
//     port.write(message);
//     await new Promise(r => setTimeout(r, 3000)); // 3000ms delay
//     port.write(String.fromCharCode(26)); // CTRL+Z

//     await waitFor(['OK'], 10000); // Wait for send confirmation

//     return { success: true, log: `✅ Sent successfully to ${number}` };
//   } catch (err) {
//     return { success: false, error: err.message, log: `❌ Failed to send to ${number}: ${err.message}` };
//   }
// };

// const sendSingleSMS = async (number, message) => {
//   try {
//     await clearSerialBuffer();
    
//     // Init sequence
//     for (let cmd of at.init()) {
//       port.write(cmd + '\r');
//       await waitFor(['OK'], 2000);
//     }

//     // Set SMS text mode
//     port.write('AT+CMGF=1\r');
//     await waitFor(['OK'], 2000);

//     // Optional: set UCS2 character set if needed for special characters
//     port.write('AT+CSCS="UCS2"\r');
//     await waitFor(['OK'], 2000);

//     port.write('AT+CMGF=1\r'); // reset text mode for UCS2
//     await waitFor(['OK'], 2000);
    
//     message = toUCS2(message); // convert to UCS2 hex if enabled

//     // Set recipient
//     port.write(`AT+CMGS="${number}"\r`);
//     await waitFor(['>'], 4000); // Wait for the > prompt

//     // Send message in small chunks to prevent dropped characters
//     const chunkSize = 50; // number of characters per write
//     for (let i = 0; i < message.length; i += chunkSize) {
//       const chunk = message.slice(i, i + chunkSize);
//       port.write(chunk);
//       await new Promise((r) => setTimeout(r, 10)); // tiny pause
//     }

//     // End message with CTRL+Z
//     port.write(String.fromCharCode(26));
//     const response = await waitFor(['OK', 'ERROR'], 10000);

//     return { success: true, log: `✅ Sent successfully to ${number}` };
//   } catch (err) {
//     return { success: false, error: err.message, log: `❌ Failed to send to ${number}: ${err.message}` };
//   }
// };


// const sendSingleSMS = async (number, message) => {
//   try {
//     await clearSerialBuffer();

//     const gsm7bitRegex = /^[\u0000-\u007F]*$/;

//     const toUCS2 = (str) => {
//       return Buffer.from(str, 'utf16le')
//         .swap16()
//         .toString('hex')
//         .toUpperCase();
//     };

//     // Init sequence
//     for (let cmd of at.init()) {
//       port.write(cmd + '\r');
//       await waitFor(['OK'], 2000);
//     }

//     const isUCS2 = !gsm7bitRegex.test(message);

//     if (isUCS2) {
//       port.write('AT+CSCS="UCS2"\r');
//       await waitFor(['OK'], 2000);
//       port.write('AT+CMGF=1\r');
//       await waitFor(['OK'], 2000);
//       message = toUCS2(message);
//     } else {
//       port.write('AT+CSCS="GSM"\r');
//       await waitFor(['OK'], 2000);
//       port.write('AT+CMGF=1\r');
//       await waitFor(['OK'], 2000);
//     }

//     // Send recipient
//     port.write(`AT+CMGS="${isUCS2 ? toUCS2(number) : number}"\r`);
//     await waitFor(['>'], 4000);

//     // Send message in small UCS2-safe chunks
//     const chunkSize = 20; // Adjust for serial stability
//     for (let i = 0; i < message.length; i += chunkSize) {
//       const chunk = message.slice(i, i + chunkSize);
//       port.write(chunk);
//       await new Promise((r) => setTimeout(r, 50)); // 50ms pause between chunks
//     }

//     // End message
//     await new Promise(r => setTimeout(r, 3000));
//     port.write(String.fromCharCode(26));
//     await waitFor(['OK', 'ERROR'], 15000); // allow more time for long messages

//     return { success: true, log: `✅ Sent successfully to ${number}` };
//   } catch (err) {
//     return { success: false, error: err.message, log: `❌ Failed to send to ${number}: ${err.message}` };
//   }
// };

const sendSingleSMS = async (number, message) => {
  try {
    await clearSerialBuffer();

    const gsm7bitRegex = /^[\u0000-\u007F]*$/;

    const toUCS2 = (str) => {
      return Buffer.from(str, 'utf16le')
        .swap16()
        .toString('hex')
        .toUpperCase();
    };

    // Init sequence
    for (let cmd of at.init()) {
      port.write(cmd + '\r');
      await waitFor(['OK'], 2000);
    }

    const isUCS2 = !gsm7bitRegex.test(message);

    if (isUCS2) {
      port.write('AT+CSCS="UCS2"\r');
      await waitFor(['OK'], 2000);
      port.write('AT+CMGF=1\r');
      await waitFor(['OK'], 2000);
    } else {
      port.write('AT+CSCS="GSM"\r');
      await waitFor(['OK'], 2000);
      port.write('AT+CMGF=1\r');
      await waitFor(['OK'], 2000);
    }

    // Determine maximum chars per part
    const MAX_UCS2_CHARS = 67; // leaving 3 for UDH
    const MAX_GSM_CHARS = 153; // 7-bit multi-part SMS

    if (isUCS2 && message.length > 70) {
      // Concatenated UCS2 SMS
      const totalParts = Math.ceil(message.length / MAX_UCS2_CHARS);
      const ref = Math.floor(Math.random() * 255); // Random reference number

      for (let i = 0; i < totalParts; i++) {
        const part = message.slice(i * MAX_UCS2_CHARS, (i + 1) * MAX_UCS2_CHARS);
        const udh = `050003${ref.toString(16).padStart(2, '0')}${totalParts.toString(16).padStart(2,'0')}${(i+1).toString(16).padStart(2,'0')}`;
        const hexMessage = udh + toUCS2(part);

        port.write(`AT+CMGS="${toUCS2(number)}"\r`);
        await waitFor(['>'], 4000);

        // Chunked write for serial stability
        const chunkSize = 20;
        for (let j = 0; j < hexMessage.length; j += chunkSize) {
          port.write(hexMessage.slice(j, j + chunkSize));
          await new Promise(r => setTimeout(r, 50));
        }

        port.write(String.fromCharCode(26));
        await waitFor(['OK', 'ERROR'], 15000);
      }
    } else {
      // Single-part message (GSM or short UCS2)
      const sendMsg = isUCS2 ? toUCS2(message) : message;
      port.write(`AT+CMGS="${isUCS2 ? toUCS2(number) : number}"\r`);
      await waitFor(['>'], 4000);

      // Chunked write
      const chunkSize = 20;
      for (let i = 0; i < sendMsg.length; i += chunkSize) {
        port.write(sendMsg.slice(i, i + chunkSize));
        await new Promise(r => setTimeout(r, 50));
      }

      await new Promise(r => setTimeout(r, 2000));
      port.write(String.fromCharCode(26));
      await waitFor(['OK', 'ERROR'], 15000);
    }

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



