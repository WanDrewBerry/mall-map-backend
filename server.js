const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // For handling cookies
const session = require('express-session'); // Secure sessions package
const { verifyToken, blocklist } = require('./middlewares/authMiddleware'); // Import authentication middleware
const { uploadMiddleware, handleUploadErrors } = require("./middlewares/uploadMiddleware");
const path = require('path'); // For serving static files
const jwt = require('jsonwebtoken'); // Required for refresh token logic

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json()); // Parse JSON requests
app.use(cookieParser()); // Parse cookies
app.use(cors({
  origin: process.env.CLIENT_URL, // Allow only requests from your frontend
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Specify allowed headers
}));


// Serve static files for uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res, path) => {
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
      res.setHeader("Content-Type", "image/jpeg");
    } else if (path.endsWith(".png")) {
      res.setHeader("Content-Type", "image/png");
    } else {
      res.setHeader("Content-Type", "application/octet-stream"); // ✅ Prevent incorrect MIME type
    }
  }
}));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'yourSecretKey', // Strong secret from .env
    resave: false, // Avoid resaving session if nothing has changed
    saveUninitialized: false, // Don't create sessions for unauthenticated users
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Secure cookies in production
      httpOnly: true, // Prevent cookies from being accessed via JavaScript
      maxAge: 3600000, // Session expiration: 1 hour (in milliseconds)
    },
  })
);

// Connect to MongoDB
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1); // Exit process if DB connection fails
  });

// Routes
const mallRoutes = require('./routes/mallRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api/malls', mallRoutes); // Mall routes
app.use('/api/users', userRoutes); // User management routes
app.use('/api/auth', authRoutes); // Authentication routes

// Image upload route
app.post('/api/malls/:id/upload', verifyToken, uploadMiddleware, handleUploadErrors, async (req, res) => {
  try {
    // ✅ Check if a file was uploaded
    if (!req.file) {
      console.error("🚨 No file uploaded.");
      return res.status(400).json({ message: "No file uploaded." });
    }

    // ✅ Construct Image URL
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    console.log("✅ Image successfully uploaded:", imageUrl);
    
    // ✅ Respond with the uploaded image URL
    res.status(200).json({
      message: "✅ Image uploaded successfully!",
      imageUrl,
    });

  } catch (err) {
    console.error('❌ Image upload error:', err.message);
    res.status(500).json({ message: 'Image upload failed', error: err.message });
  }
});

// Refresh token route (handles expired access tokens)
app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = req.cookies.refreshToken; // Refresh token is stored in cookies

  if (!refreshToken) {
    return res.status(401).json({ status: false, message: 'Refresh token missing. Please log in again.' });
  }

  try {
    // Verify refresh token
    const verifiedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Generate a new access token
    const newAccessToken = jwt.sign(
      { id: verifiedRefresh.id, role: verifiedRefresh.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Access token valid for 15 minutes
    );

    res.status(200).json({ status: true, accessToken: newAccessToken });
  } catch (err) {
    console.error('Refresh token verification error:', err.message);
    return res.status(403).json({ status: false, message: 'Invalid refresh token. Please log in again.' });
  }
});

// Protected route example (Requires authentication)
app.get('/api/profile', verifyToken, (req, res) => {
  res.status(200).json({ message: '✅ Profile accessed', user: req.user });
});

// Authentication status route
app.get('/api/auth/status', (req, res) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(200).json({ status: false, message: "User is not authenticated." });
  }

  const token = authHeader.split(" ")[1];

  // Check if token is in blocklist (meaning user has logged out)
  if (blocklist.has(token)) {
    return res.status(200).json({ status: false, message: "User is logged out." });
  }

  try {
    // Verify access token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ status: true, user: verified });
  } catch (err) {
    // Handle invalid or expired tokens
    return res.status(200).json({ status: false, message: "Invalid or expired token." });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('🚀 The server is running!');
});

// Testing endpoint for sessions
app.get('/api/test-session', (req, res) => {
  if (req.session.views) {
    req.session.views++;
    res.json({ message: `You have visited this page ${req.session.views} times.` });
  } else {
    req.session.views = 1;
    res.json({ message: 'Welcome! This is your first visit.' });
  }
});

// Handle unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: '❌ Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('⚠️ Server Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});