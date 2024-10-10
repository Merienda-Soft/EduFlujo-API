const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(env.DB_URI)
    console.log('MongoDB connected successfully')
  } catch (err) {
    console.error('MongoDB connection error', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
