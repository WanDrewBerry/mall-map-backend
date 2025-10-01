const mongoose = require('mongoose');

const mongoURI =
  process.env.NODE_ENV === 'production'
    ? process.env.CLOUD_MONGO_URI
    : process.env.LOCAL_MONGO_URI;

const connectDB = async () => {
  console.log(`🌐 Connecting to MongoDB: ${mongoURI}`);
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connection established successfully.');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
};

module.exports = connectDB;