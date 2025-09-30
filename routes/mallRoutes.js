const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { verifyToken, verifyAdmin } = require("../middlewares/authMiddleware");
const { handleUploadErrors } = require("../middlewares/uploadMiddleware");
const Mall = require("../models/Mall");

const {
  createMall,
  getMalls,
  getMallById,
  getMallDetails,
  updateMall,
  deleteMall,
  searchMalls,
  addReview,
  editReview,
  deleteReview,
} = require("../controllers/mallController");

// ✅ Public routes (no authentication required)
router.get("/search", searchMalls);
router.get("/", getMalls);
router.get("/:id", getMallById);
router.get("/:id/details", getMallDetails);

// ✅ Protected routes (authentication/admin required)
router.post("/", verifyToken, verifyAdmin, createMall);
router.put("/:id", verifyToken, verifyAdmin, updateMall);
router.delete("/:id", verifyToken, verifyAdmin, deleteMall);

// ✅ Review routes (require authentication)
router.post("/:id/reviews", verifyToken, addReview);
router.put("/:mallId/reviews/:reviewId", verifyToken, editReview);
router.delete("/:mallId/reviews/:reviewId", verifyToken, verifyAdmin, deleteReview); // 🔥 Admin-only deletion

// ✅ Image Fetch Route
router.get("/:mallId/images", async (req, res) => {
  try {
    const mall = await Mall.findById(req.params.mallId); // 🔥 Remove `.lean()`
    if (!mall) return res.status(404).json({ message: "Mall not found." });

    console.log("📸 Debug: Raw Images Before Formatting:", mall.images);

    res.status(200).json({
      images: mall.images.map(img => ({
        _id: img._id.toString(), // ✅ `_id` should now appear
        url: img.url,
        userId: img.userId.toString(),
        uploadedAt: img.uploadedAt,s
      })),
    });
  } catch (err) {
    console.error("🚨 Error fetching images:", err.message);
    res.status(500).json({ message: "Internal server error while fetching images." });
  }
});

// ✅ Image Upload Route
router.post("/:id/upload", verifyToken, handleUploadErrors, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid Mall ID format." });
    }

    const mall = await Mall.findById(req.params.id);
    if (!mall) return res.status(404).json({ message: "Mall not found." });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded." });
    }

    const newImages = req.files.map(file => ({
      _id: new mongoose.Types.ObjectId(),
      url: `/uploads/${file.filename}`,
      userId: req.user._id,
      uploadedAt: new Date(),
    }));

    mall.images.push(...newImages);
    await mall.save();

    console.log("✅ Images uploaded successfully!");
    res.status(200).json({ message: "✅ Images uploaded successfully!", images: newImages });
  } catch (err) {
    console.error("🚨 Upload error:", err);
    res.status(500).json({ message: "❌ Image upload failed.", error: err.message });
  }
});

// ✅ Image Edit Route
router.put("/:mallId/images/:imageId", verifyToken, async (req, res) => {
  try {
    const mall = await Mall.findById(req.params.mallId);
    if (!mall) return res.status(404).json({ message: "Mall not found." });

    const image = mall.images.id(req.params.imageId);
    if (!image) return res.status(404).json({ message: "Image not found." });

    // ✅ Ensure only uploader or admin can edit
    if (image.userId.toString() !== req.user._id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: You can only edit your own images." });
    }

    image.url = req.body.newImageUrl;
    await mall.save();

    res.status(200).json({ message: "Image updated successfully!", image });
  } catch (err) {
    console.error("🚨 Error updating image:", err.message);
    res.status(500).json({ message: "Internal server error while updating image." });
  }
});

// ✅ **Fixed Image Delete Route**
router.delete("/:mallId/images/:imageId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const mall = await Mall.findById(req.params.mallId);
    if (!mall) return res.status(404).json({ message: "Mall not found." });

    const image = mall.images.id(req.params.imageId);
    if (!image) return res.status(404).json({ message: "Image not found." });

    mall.images.pull({ _id: req.params.imageId }); // ✅ Removes the image
    await mall.save();

    console.log("🗑️ Image deleted successfully!");
    res.status(200).json({ message: "✅ Image deleted successfully!" });
  } catch (err) {
    console.error("🚨 Error deleting image:", err);
    res.status(500).json({ message: "❌ Failed to delete image.", error: err.message });
  }
});

module.exports = router;