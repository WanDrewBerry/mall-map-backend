const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { registerUser } = require('../controllers/userController');
const { verifyToken, extractToken, isTokenBlocklisted } = require('../middlewares/authMiddleware');
const blocklist = require('../utils/blocklist');

const router = express.Router();

// 🔐 Register a new user with debug logs
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  console.log("📥 Registration request received");
  console.log("👤 Username:", username);
  console.log("📧 Email:", email);
  console.log("🔑 Password:", password);

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("⚠️ Email already registered:", email);
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();
    console.log("✅ New user registered:", newUser);

    const tokenPayload = {
      id: newUser._id,
      username: newUser.username,
      role: newUser.role,
      email: newUser.email,
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '3h',
      issuer: 'YourAppName',
      audience: 'YourAppUsers',
    });

    const refreshToken = jwt.sign({ id: newUser._id }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: 'Registration successful!',
      accessToken,
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('🚨 Registration Error:', error.message);
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
});

// 🔑 Login route with debug logs
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log("📥 Login request received");
  console.log("📧 Email:", email);
  console.log("🔑 Password:", password);

  try {
    const user = await User.findOne({ email });
    console.log("🔍 User found:", user);

    if (!user || !(await user.comparePassword(password))) {
      console.log("❌ Invalid credentials");
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const tokenPayload = {
      id: user._id,
      username: user.username,
      role: user.role,
      email: user.email,
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '3h',
      issuer: 'YourAppName',
      audience: 'YourAppUsers',
    });

    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('🚨 Login Error:', error.message);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// 🚪 Logout route (JWT blocklist + cookie clear)
router.post('/logout', (req, res) => {
  const authHeader = req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    blocklist.add(token);
    console.log('⛔ Token Blocklisted:', token);
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.status(200).json({ status: false, message: 'Logged out successfully.' });
});

// 🔍 Auth status check (manual token + blocklist)
router.get('/status', (req, res) => {
  const authHeader = req.header('Authorization');
  const token = extractToken(authHeader);

  if (!token) {
    console.log('🚨 No Authorization header or invalid format.');
    return res.status(200).json({ status: false, message: 'User is not authenticated.' });
  }

  if (isTokenBlocklisted(token)) {
    console.log('⛔ Token has been invalidated (blocklisted).');
    return res.status(200).json({ status: false, message: 'User is logged out.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified for user:', verified.username);
    return res.status(200).json({ status: true, user: verified });
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    return res.status(200).json({ status: false, message: 'Invalid or expired token.' });
  }
});

module.exports = router;