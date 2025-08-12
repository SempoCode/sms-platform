const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const port = new SerialPort({
  path: process.env.SERIAL_PORT, // e.g. "/dev/ttyUSB0" or "COM3"
  baudRate: 9600
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

parser.on('data', (data) => console.log('SIM800C:', data));

module.exports = { port, parser };
