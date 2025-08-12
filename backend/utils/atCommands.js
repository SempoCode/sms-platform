module.exports = {
  init: () => ['AT', 'AT+CMGF=1'],
  sendSMS: (number, message) => [
    `AT+CMGS="${number}"`,
    `${message}${String.fromCharCode(26)}`
  ]
};
