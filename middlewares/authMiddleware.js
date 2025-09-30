const jwt = require("jsonwebtoken");
const blocklist = require("../utils/blocklist"); // Import shared blocklist

// ✅ Extract token from Authorization header safely
const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1];
};

// ✅ Check if the token is blocklisted
const isTokenBlocklisted = (token) => {
  return blocklist.has(token);
};

// ✅ Middleware: Verify JWT token and detect expiration
const verifyToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = extractToken(authHeader);

  console.log("🔹 Received Token:", token || "No Token Found");

  if (!token) {
    console.log("🚨 Missing or invalid Authorization header.");
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  if (isTokenBlocklisted(token)) {
    console.log("⛔ Token is blocklisted. User must log in again.");
    return res.status(403).json({ message: "Token has been invalidated. Please log in again." });
  }

  try {
    // 🔍 Decode token before verification
    const decodedToken = jwt.decode(token, { complete: true });
    console.log("🔍 Decoded Token:", decodedToken);

    if (!decodedToken || !decodedToken.payload) {
      console.log("🚨 Invalid token structure.");
      return res.status(401).json({ message: "Invalid token structure. Please log in again." });
    }

    // 🚨 Check audience mismatch before verification
    if (decodedToken.payload.aud !== "YourAppUsers") {
      console.log(`🚨 Token Audience Mismatch! Received: ${decodedToken.payload.aud} | Expected: YourAppUsers`);
      return res.status(401).json({ message: "Invalid token audience. Please log in again." });
    }

    // ✅ Verify token with issuer & audience security
    const verified = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "YourAppName",
      audience: "YourAppUsers",
    });

    // ✅ Explicitly map `id` to `_id` for consistency
    req.user = {
      _id: verified.id, // ✅ Ensures correct field name
      username: verified.username,
      role: verified.role,
    };

    console.log("✅ Assigned `req.user`:", req.user);

    // 🚨 Validate `_id` before allowing request to continue
    if (!req.user._id) {
      console.log("🚨 Token verified, but user ID is missing.");
      return res.status(401).json({ message: "Token is valid, but user ID is missing." });
    }

    console.log("✅ Token Verified Successfully:", verified);
    next();
  } catch (err) {
    console.error("❌ Token Verification Error:", err.name, "| Message:", err.message);

    if (err.name === "TokenExpiredError") {
      console.log("⏳ Access token expired. Adding token to blocklist.");
      blocklist.add(token);
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    return res.status(401).json({ message: "Invalid token. Please log in again." });
  }
};

// ✅ Middleware: Verify admin privileges
const verifyAdmin = (req, res, next) => {
  if (!req.user || !req.user._id) {
    return res.status(403).json({ message: "Access denied. You must be logged in as an admin." });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }

  // ✅ Log admin actions for security monitoring
  console.log(`[ADMIN ACTION] ${req.user.username} accessed ${req.originalUrl} at ${new Date().toISOString()}`);

  next();
};

// ✅ Middleware: Role-Based Access Control
const verifyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

// ✅ Invalidate access tokens during logout
const invalidateToken = (token, req, res) => {
  if (!token) {
    console.log("🚨 No token provided for invalidation.");
    return;
  }

  if (!blocklist.has(token)) {
    blocklist.add(token);
    console.log("🚫 Token invalidated and added to blocklist:", token);
  }

  res.setHeader("Authorization", "");
  res.status(200).json({ message: "Logged out successfully." });
};

// ✅ Export authentication utilities
module.exports = {
  verifyToken,
  verifyAdmin,
  verifyRole, // ✅ Role-based access middleware
  invalidateToken,
  extractToken,
  isTokenBlocklisted,
};