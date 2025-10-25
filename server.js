const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');

const { verifyToken, blocklist } = require('./middlewares/authMiddleware');
const { uploadMiddleware, handleUploadErrors } = require('./middlewares/uploadMiddleware');

// ✅ Load environment variables
dotenv.config();

// ✅ Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ CORS Configuration
const allowedOrigins = [
  "https://mall-map-frontend.vercel.app",
  "http://localhost:5173",
  "https://mall-b8iiv0987-andrews-projects-a1becd8a.vercel.app",
];

app.use(cors({
  origin: (origin, callback) => {
    console.log("🌐 Incoming Origin:", origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));

// ✅ Handle preflight OPTIONS requests globally
app.options('*', cors());

// ✅ Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
      res.setHeader("Content-Type", "image/jpeg");
    } else if (filePath.endsWith(".png")) {
      res.setHeader("Content-Type", "image/png");
    } else {
      res.setHeader("Content-Type", "application/octet-stream");
    }
  }
}));

// ✅ Connect to MongoDB
const connectDB = require('./config/db');
connectDB().catch((err) => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});

// ✅ Routes
const mallRoutes = require('./routes/mallRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api/malls', mallRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

// ✅ Image upload route
app.post('/api/malls/:id/upload', verifyToken, uploadMiddleware, handleUploadErrors, async (req, res) => {
  try {
    if (!req.file) {
      console.error("🚨 No file uploaded.");
      return res.status(400).json({ message: "No file uploaded." });
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    console.log("✅ Image successfully uploaded:", imageUrl);

    res.status(200).json({
      message: "✅ Image uploaded successfully!",
      imageUrl,
    });
  } catch (err) {
    console.error('❌ Image upload error:', err.message);
    res.status(500).json({ message: 'Image upload failed', error: err.message });
  }
});

// ✅ Refresh token route
app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ status: false, message: 'Refresh token missing. Please log in again.' });
  }

  try {
    const verifiedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      { id: verifiedRefresh.id, role: verifiedRefresh.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({ status: true, accessToken: newAccessToken });
  } catch (err) {
    console.error('Refresh token verification error:', err.message);
    return res.status(403).json({ status: false, message: 'Invalid refresh token. Please log in again.' });
  }
});

// ✅ Protected route example
app.get('/api/profile', verifyToken, (req, res) => {
  res.status(200).json({ message: '✅ Profile accessed', user: req.user });
});

// ✅ Auth status route
app.get('/api/auth/status', (req, res) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(200).json({ status: false, message: "User is not authenticated." });
  }

  const token = authHeader.split(" ")[1];
  if (blocklist.has(token)) {
    return res.status(200).json({ status: false, message: "User is logged out." });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ status: true, user: verified });
  } catch (err) {
    return res.status(200).json({ status: false, message: "Invalid or expired token." });
  }
});

// ✅ Root endpoint
app.get('/', (req, res) => {
  res.send('🚀 The server is running!');
});

// ✅ Handle unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: '❌ Route not found' });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('⚠️ Server Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});