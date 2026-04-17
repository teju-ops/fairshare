const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`MongoDB: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.warn(`MongoDB unavailable, using in-memory demo store. ${err.message}`);
    return false;
  }
};

module.exports = connectDB;
