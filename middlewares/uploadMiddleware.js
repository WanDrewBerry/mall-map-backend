const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads/"); // ✅ Path relative to backend folder

// ✅ Ensure the uploads folder exists at startup
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Improved Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // ✅ Saves images inside backend/uploads/
  },
  filename: (req, file, cb) => {
    const safeFilename = file.originalname.replace(/\s+/g, "_").toLowerCase();
    cb(null, `${Date.now()}-${safeFilename}`);
  },
});

// ✅ Allow Multiple Image Uploads and Validate File Types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("❌ Invalid file type. Only JPEG, PNG, and JPG are allowed."), false);
  }
};

// ✅ Updated Multer Configuration for Single and Multiple Images
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // ✅ Max file size: 5MB
});

// ✅ Switched from `.single("image")` to `.array("image", 5)` for flexibility
const uploadMiddleware = upload.array("image", 5); // ✅ Allows up to 5 images

// ✅ Improved Error Handling Middleware
const handleUploadErrors = (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error("🚨 Multer Error:", err.message);
      return res.status(400).json({ message: err.message });
    }
    if (!req.files || req.files.length === 0) {
      console.error("🚨 No files uploaded.");
      return res.status(400).json({ message: "No files uploaded." });
    }
    next();
  });
};

module.exports = { uploadMiddleware, handleUploadErrors };