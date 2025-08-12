const mongoose = require('mongoose');

const smsSchema = new mongoose.Schema({
  number: String,
  message: String,
  sentAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SMS', smsSchema);
