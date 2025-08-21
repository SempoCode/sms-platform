const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://BulkSMSPlatform:Losse1234@cluster0.uy0fqwq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Define schema here directly (so no caching issue)
const smsSchema = new mongoose.Schema({
  number: String,
  message: String,
  success: { type: Boolean, default: true },
  error: { type: String, default: null },
  sentAt: { type: Date, default: Date.now }
});

const SMS = mongoose.model("SMSTest", smsSchema); // 👈 Use a new collection (SMSTest)

async function run() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    const doc = new SMS({
      number: "+256700000000",
      message: "Schema test message",
      success: false,
      error: "Simulated failure"
    });

    const saved = await doc.save();
    console.log("📌 Saved document:", saved);

    await mongoose.disconnect();
    console.log("🔌 Disconnected");
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

run();
