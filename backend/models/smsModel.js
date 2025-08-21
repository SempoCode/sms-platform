// smsModel.js
const mongoose = require('mongoose');

// delete mongoose.connection.models["SMS"];
// delete mongoose.models["SMS"];

const smsSchema = new mongoose.Schema({
  number: String,
  message: String,
  success: { type: Boolean, default: true }, // ✅ true if sent successfully
  error: { type: String, default: null },   // ❌ only for failures
  sentAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SMS', smsSchema);
