require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const smsRoutes = require('./routes/smsRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// DB connection
connectDB();

// Routes
app.use('/api/sms', smsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
