const express = require('express');
const { registerUser, loginUser } = require('../controllers/userController'); // Handlers
const { verifyToken } = require('../middlewares/authMiddleware'); // JWT middleware
const User = require('../models/User'); // User model
const jwt = require('jsonwebtoken'); // Ensure this is included

const router = express.Router();

// Login route (JWT-based)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const tokenPayload = {
      id: user._id,
      username: user.username,
      role: user.role,
      email: user.email,
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '3h' });

    // Debug: Log the decoded token payload
    const decodedToken = jwt.decode(token);
    console.log("Decoded Token Payload:", decodedToken);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// Logout route (optional: clear JWT logic can be handled in the frontend)
router.post('/logout', (req, res) => {
  req.session?.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err.message);
      return res.status(500).json({ message: 'Could not log out.' });
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    res.status(200).json({ message: 'Logout successful.' });
  });
});

// Check login status route (JWT-based)
router.get('/status', verifyToken, (req, res) => {
  try {
    res.status(200).json({
      loggedIn: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (err) {
    console.error('Error verifying token:', err.message);
    res.status(401).json({ loggedIn: false, message: 'Session expired. Please log in again.' });
  }
});

// Register route (unchanged from original)
router.post('/register', registerUser);

module.exports = router;