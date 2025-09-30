const jwt = require("jsonwebtoken");
const User = require("../models/User");
const blocklist = require("../utils/blocklist");

// ✅ Register a User (Fixes audience issue)
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log("🔍 Register Request - Username:", username, "Email:", email);

    // ✅ Validate input fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required." });
    }

    // ✅ Check if email exists
    const existingUser = await User.findOne({ email: new RegExp(`^${email.trim()}$`, "i") });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    // ✅ Check if username exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username is already taken." });
    }

    // ✅ Create and save the user
    const user = new User({ username, email: email.trim(), password });
    const savedUser = await user.save();

    console.log("✅ User Registered Successfully:", savedUser.username);

    // ✅ Generate access token (FIXED `aud` issue)
    const payload = {  
      id: savedUser._id,  
      username: savedUser.username,  
      role: savedUser.role // ✅ Removed duplicate "aud"
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "6h",
      issuer: "YourAppName",
      audience: "YourAppUsers" // ✅ Only set audience here
    });

    console.log("🔍 JWT Generated:", jwt.decode(accessToken));

    // ✅ Generate refresh token
    const refreshToken = jwt.sign(
      { id: savedUser._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Tokens Generated for New User!");

    // ✅ Send refresh token as HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: "Registration successful!",
      user: savedUser,
      accessToken, // ✅ Now returning access token!
    });

  } catch (err) {
    console.error("🚨 Registration Error:", err.message);
    res.status(500).json({ message: "Internal server error during registration." });
  }
};

// ✅ Login a User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: new RegExp(`^${email.trim()}$`, "i") });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isPasswordValid = await user.comparePassword(password.trim());
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    console.log("🔑 Password validated, generating token...");

    // ✅ Generate access token
    const accessToken = jwt.sign(
      { id: user._id, username: user.username, role: user.role }, // ✅ No "aud" in payload
      process.env.JWT_SECRET,
      { expiresIn: "6h", issuer: "YourAppName", audience: "YourAppUsers" } // ✅ Set audience only in options
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Tokens Generated Successfully!");

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful!",
      accessToken,
    });

  } catch (err) {
    console.error("🚨 Login Error:", err.message);
    res.status(500).json({ message: "Server error during login." });
  }
};

// ✅ Logout a User
const logoutUser = (req, res) => {
  const authHeader = req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    blocklist.add(token);
    console.log("⛔ Token Blocklisted:", token);
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  console.log("✅ User Logged Out Successfully");
  res.status(200).json({ status: false, message: "Logged out successfully." });
};

module.exports = { registerUser, loginUser, logoutUser };