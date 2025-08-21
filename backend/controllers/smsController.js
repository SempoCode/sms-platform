const SMS = require('../models/smsModel');
const { port } = require('../config/serial');
const at = require('../utils/atCommands');



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

const clearSerialBuffer = async () => {
  while (port.readableLength > 0) {
    port.read(); // read and discard
    await new Promise(r => setTimeout(r, 5));
  }
};

const initModem = async () => {
  // Disable new SMS indications
  port.write('AT+CNMI=0,0,0,0,0\r');
  await waitFor(['OK'], 3000).catch(() => {});

  // Auto-reject incoming calls (if supported by your modem)
  port.write('AT+GSMBUSY=1\r');
  await waitFor(['OK'], 3000).catch(() => {});

  // verbose +CMS ERROR text/codes
  port.write('AT+CMEE=2\r');     
  await waitFor(['OK'], 3000).catch(() => {});

};



// --- Helpers for UCS2/PDU ----

const toUCS2BEHex = (str) =>
  Buffer.from(str, 'utf16le').swap16().toString('hex').toUpperCase();

/** Encode international number (e.g. +256712345678) to semi-octets for PDU */
const encodeNumberToSemiOctets = (e164) => {
  const digits = e164.replace(/^\+/, '');
  const padded = digits.length % 2 === 0 ? digits : digits + 'F';
  let semi = '';
  for (let i = 0; i < padded.length; i += 2) {
    semi += padded[i + 1] + padded[i];
  }
  return { semi, lengthDigits: digits.length };
};

/** Build a single-part UCS2 PDU (no UDH) */
const buildPDU_UCS2_Single = (recipient, message) => {
  // Use SMSC from SIM => SCA=00
  const SCA = '00';

  // First octet: MTI=01 (SMS-SUBMIT), VPF=00 (no validity), RD=0, SRR=0, UDHI=0
  const firstOctet = '11';

  const mr = '00';
  const { semi, lengthDigits } = encodeNumberToSemiOctets(recipient);

  // TP-DA
  const da_len = lengthDigits.toString(16).padStart(2, '0');
  const da_ton_npi = '91'; // international
  const da_digits = semi;

  const pid = '00';
  const dcs = '08'; // UCS2
  // No validity period (since VPF=00) => omit VP

  const ud = toUCS2BEHex(message);
  const udl = (ud.length / 2).toString(16).padStart(2, '0'); // octets

  const tpdu =
    firstOctet +
    mr +
    da_len +
    da_ton_npi +
    da_digits +
    pid +
    dcs +
    udl +
    ud;

  // Length passed to AT+CMGS is TPDU length in OCTETS (not including SCA)
  const tpduLenOctets = (tpdu.length / 2).toString(10);

  const pdu = SCA + tpdu; // full PDU to send after '>'

  return { pdu, tpduLenOctets };
};

/** Build concatenated UCS2 PDUs with UDH for long messages */
const buildPDU_UCS2_Concat = (recipient, message) => {
  const MAX_UCS2_CHARS = 67; // 70 - UDH(6 bytes) cost
  const parts = [];
  const totalParts = Math.ceil(message.length / MAX_UCS2_CHARS);
  const ref = Math.floor(Math.random() * 255); // 00..FF

  for (let i = 0; i < totalParts; i++) {
    const seg = message.slice(i * MAX_UCS2_CHARS, (i + 1) * MAX_UCS2_CHARS);

    // UDH: 05 00 03 <ref> <total> <seq>
    const udh =
      '050003' +
      ref.toString(16).padStart(2, '0') +
      totalParts.toString(16).padStart(2, '0') +
      (i + 1).toString(16).padStart(2, '0');

    const ud = udh + toUCS2BEHex(seg);
    const SCA = '00';
    // First octet with UDHI=1 (bit6) => 0x11 | 0x40 = 0x51
    const firstOctet = '51';
    const mr = '00';

    const { semi, lengthDigits } = encodeNumberToSemiOctets(recipient);
    const da_len = lengthDigits.toString(16).padStart(2, '0');
    const da_ton_npi = '91';
    const pid = '00';
    const dcs = '08';

    const udl = (ud.length / 2).toString(16).padStart(2, '0');

    const tpdu =
      firstOctet +
      mr +
      da_len +
      da_ton_npi +
      semi +
      pid +
      dcs +
      udl +
      ud;

    const tpduLenOctets = (tpdu.length / 2).toString(10);
    const pdu = SCA + tpdu;

    parts.push({ pdu, tpduLenOctets });
  }

  return parts;
};

/** Check if message is strictly GSM-7 */
const isGSM7 = (s) => /^[\u0000-\u007F]*$/.test(s);

// -- Normalizes modem send responses --
const parseSendResp = (respRaw) => {
  const resp = (respRaw || '').replace(/\r/g, '').trim();

  // success (any line containing +CMGS)
  if (/\+CMGS/i.test(resp)) return { success: true };

  // explicit CMS errors
  const cms = resp.match(/\+CMS ERROR:\s*([0-9]+)/i);
  if (cms) return { success: false, error: `+CMS ERROR: ${cms[1]}` };

  // generic ERROR
  if (/ERROR/i.test(resp)) return { success: false, error: 'ERROR' };

  // unknown (but still return something meaningful)
  return { success: false, error: resp || 'Unknown modem response' };
};



// --- Refactored sender ----
const sendSingleSMS = async (number, message) => {
  try {
    await clearSerialBuffer();

    // Block incoming notifications before sending
    await initModem();

    if (isGSM7(message)) {
      // ===== TEXT MODE (GSM-7) =====
      // Keep it simple & robust
      port.write('AT+CMGF=1\r');
      await waitFor(['OK'], 3000);

      port.write('AT+CSCS="GSM"\r');
      await waitFor(['OK'], 3000);

      port.write(`AT+CMGS="${number}"\r`);
      await waitFor(['>'], 5000);

      // chunked write (as you requested to keep)
      const chunkSize = 10;
      for (let i = 0; i < message.length; i += chunkSize) {
        port.write(message.slice(i, i + chunkSize));
        await new Promise((r) => setTimeout(r, 10));
      }

      port.write(String.fromCharCode(26)); // Ctrl+Z
     
      const resp = await waitFor(['+CMGS', '+CMS ERROR', 'ERROR'], 20000);
      const out = parseSendResp(resp);

      if (out.success) {
        // don't fail if OK is late/missing
        waitFor(['OK'], 10000).catch(() => {
          console.log(`⚠️ No final OK after CMGS for ${number}, but SMS was sent`);
        });
        return { success: true, log: `✅ Sent successfully to ${number}` };
      }
      return { success: false, error: out.error, log: `❌ Failed to send to ${number}` };



    } else {
      // ===== PDU MODE (UCS2) =====
      port.write('AT+CMGF=0\r');
      await waitFor(['OK'], 3000);

      // short vs long
      if (message.length <= 70) {
        const { pdu, tpduLenOctets } = buildPDU_UCS2_Single(number, message);

        port.write(`AT+CMGS=${tpduLenOctets}\r`);
        await waitFor(['>'], 5000);

        // chunked write (keep as-is)
        const chunkSize = 64;
        for (let i = 0; i < pdu.length; i += chunkSize) {
          port.write(pdu.slice(i, i + chunkSize));
          await new Promise((r) => setTimeout(r, 20));
        }
        port.write(String.fromCharCode(26));

        // const resp = await waitFor(['+CMGS', 'ERROR'], 30000);
        // if (resp.includes('+CMGS')) {
        //   await waitFor(['OK'], 10000).catch(() => {});
        //   return { success: true, log: `✅ Sent successfully to ${number}` };
        // }
        // return { success: false, error: resp.trim(), log: `❌ Failed to send to ${number}` };

        const resp = await waitFor(['+CMGS', '+CMS ERROR', 'ERROR'], 20000);
        const out = parseSendResp(resp);

        if (out.success) {
          waitFor(['OK'], 10000).catch(() => {
            console.log(`⚠️ No final OK after CMGS for ${number}, but SMS was sent`);
          });
          return { success: true, log: `✅ Sent successfully to ${number}` };
        }
        return { success: false, error: out.error, log: `❌ Failed to send to ${number}` };


      } else {
        // Concatenated UCS2
        const parts = buildPDU_UCS2_Concat(number, message);
        for (const { pdu, tpduLenOctets } of parts) {
          port.write(`AT+CMGS=${tpduLenOctets}\r`);
          await waitFor(['>'], 5000);

          const chunkSize = 20;
          for (let i = 0; i < pdu.length; i += chunkSize) {
            port.write(pdu.slice(i, i + chunkSize));
            await new Promise((r) => setTimeout(r, 20));
          }
          port.write(String.fromCharCode(26));

          const resp = await waitFor(['+CMGS', '+CMS ERROR', 'ERROR'], 40000);
          const out = parseSendResp(resp);
          if (!out.success) {
            return { success: false, error: out.error, log: `❌ Failed to send (part) to ${number}` };
          }

          await waitFor(['OK'], 10000).catch(() => {});
          // Pace sends between parts
          await new Promise((r) => setTimeout(r, 500));
        }
        return { success: true, log: `✅ Sent successfully to ${number}` };
      }
    }
  } catch (err) {
    return { success: false, error: err.message, log: `❌ Failed to send to ${number}: ${err.message}` };
  }
};


// // Wrapper with one retry attempt
// const sendWithRetry = async (number, message) => {
//   let result = await sendSingleSMS(number, message);

//   if (!result.success) {
//     console.log(`⚠️ Failed to send to ${number}. Retrying once...`);
//     // wait a bit before retry (helps if modem is busy)
//     await new Promise((r) => setTimeout(r, 2000));

//     result = await sendSingleSMS(number, message);
//     if (result.success) {
//       result.retried = true;
//       result.log = `✅ Sent successfully to ${number} (after retry)`;
//     } else {
//       result.log = `❌ Final failure for ${number} after retry`;
//     }
//   }

//   return result;
// };


// Wrapper with up to 2 retries (total 3 attempts)
const sendWithRetry = async (number, message) => {
  let attempts = 0;
  let result;

  while (attempts < 3) {   // 1st try + 2 retries
    result = await sendSingleSMS(number, message);
    attempts++;

    if (result.success) {
      result.attempts = attempts;
      if (attempts === 1) {
        result.log = `✅ Sent successfully to ${number} on first attempt`;
      } else {
        result.log = `✅ Sent successfully to ${number} after ${attempts} attempts`;
      }
      return result;
    }

    if (attempts < 3) {
      console.log(`⚠️ Attempt ${attempts} failed for ${number}. Retrying...`);
      await new Promise((r) => setTimeout(r, 2000)); // wait before retry
    }
  }

  // If all attempts fail
  result.attempts = attempts;
  result.log = `❌ Final failure for ${number} after ${attempts} attempts`;
  return result;
};

exports.sendBulkSMS = async (req, res) => {
  const { numbers, message } = req.body;
  const results = [];

  for (let num of numbers) {
    console.log(`--- Sending to ${num} ---`);
    //const result = await sendSingleSMS(num, message);

    const result = await sendWithRetry(num, message);
    console.log(result.log);

    // Log in console clearly
    console.log(result.log);

    // Push structured result for frontend
    results.push({
      number: num,
      success: result.success,
      error: result.error || null,
      log: result.log
    });

    // Save **all messages** in the database
    await SMS.create({
      number: num,
      message,
      success: result.success,
      error: result.error || null
    });
  
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