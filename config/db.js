const mongoose = require('mongoose');

const mongoURI =
  process.env.NODE_ENV === 'production'
    ? process.env.CLOUD_MONGO_URI
    : process.env.LOCAL_MONGO_URI;

console.log(`🌐 Connecting to MongoDB: ${mongoURI}`);

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ MongoDB connection established successfully.');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

module.exports = mongoose;