const express = require('express');
const jwt = require('jsonwebtoken'); // JWT for authentication
const { registerUser, loginUser, logoutUser } = require('../controllers/userController'); // Single controller
const { verifyToken, extractToken, isTokenBlocklisted } = require('../middlewares/authMiddleware'); // Auth middleware
const blocklist = require('../utils/blocklist'); // Token blocklist

const router = express.Router();

// User authentication routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser); // ✅ Now correctly imported from `userController.js`

// Status route to check authentication state
router.get('/status', (req, res) => {
  const authHeader = req.header('Authorization');
  const token = extractToken(authHeader);

  if (!token) {
    console.log("🚨 No Authorization header or invalid format.");
    return res.status(200).json({ status: false, message: "User is not authenticated." });
  }

  if (isTokenBlocklisted(token)) {
    console.log("⛔ Token has been invalidated (blocklisted).");
    return res.status(200).json({ status: false, message: "User is logged out." });
  }

  try {
    // Verify access token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token verified for user:", verified.username);

    return res.status(200).json({ status: true, user: verified });
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(200).json({ status: false, message: "Invalid or expired token." });
  }
});

module.exports = router;