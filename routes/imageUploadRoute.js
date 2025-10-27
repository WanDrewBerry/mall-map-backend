const express = require("express");
const mongoose = require("mongoose");
const upload = require("../middlewares/upload");
const authenticateUser = require("../middlewares/auth");
const Mall = require("../models/Mall");

const router = express.Router();

/**
 * ✅ Upload an image (Only authenticated users)
 * Route: POST /:id/upload
 */
router.post("/:id/upload", authenticateUser, upload.single("image"), async (req, res) => {
  try {
    const mallId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(mallId)) {
      return res.status(400).json({ message: "Invalid Mall ID format." });
    }

    const mall = await Mall.findById(mallId);
    if (!mall) return res.status(404).json({ message: "Mall not found." });

    if (mall.images.some(img => img.url === `/uploads/${req.file.filename}`)) {
      return res.status(400).json({ message: "This image has already been uploaded." });
    }

    const newImage = {
      _id: new mongoose.Types.ObjectId(),
      url: `/uploads/${req.file.filename}`,
      userId: req.user.id,
      uploadedAt: new Date(),
    };

    console.log("✅ User ID for uploaded image:", req.user.id);
    mall.images.push(newImage);
    await mall.save();
    console.log("✅ Image stored in MongoDB.");

    res.status(201).json({ message: "Image uploaded successfully!", image: newImage });
  } catch (err) {
    console.error("🚨 Error uploading image:", err);
    res.status(500).json({ message: "Image upload failed.", error: err.message });
  }
});

/**
 * ✅ Edit an image (Only uploader or admin)
 * Route: PUT /:mallId/images/:imageId
 */
router.put("/:mallId/images/:imageId", authenticateUser, async (req, res) => {
  try {
    const { mallId, imageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mallId) || !mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({ message: "Invalid ID format." });
    }

    const mall = await Mall.findById(mallId);
    if (!mall) return res.status(404).json({ message: "Mall not found." });

    const image = mall.images.id(imageId);
    if (!image) return res.status(404).json({ message: "Image not found." });

    if (image.userId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: You can only edit your own images." });
    }

    if (!/^https?:\/\/.*\.(jpeg|jpg|png|gif)$/i.test(req.body.newImageUrl)) {
      return res.status(400).json({ message: "Invalid image URL format." });
    }

    image.url = req.body.newImageUrl;
    await mall.save();

    console.log(`[ACTION] ${req.user.email} updated image ${imageId}`);
    res.status(200).json({ message: "Image updated successfully!", image });
  } catch (err) {
    console.error("🚨 Error updating image:", err.message);
    res.status(500).json({ message: "Internal server error while updating image." });
  }
});

/**
 * ✅ Delete an image (Only admins)
 * Route: DELETE /:mallId/images/:imageId
 */
router.delete("/:mallId/images/:imageId", authenticateUser, async (req, res) => {
  try {
    const { mallId, imageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mallId) || !mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({ message: "Invalid ID format." });
    }

    const mall = await Mall.findById(mallId);
    if (!mall) return res.status(404).json({ message: "Mall not found." });

    const image = mall.images.id(imageId);
    if (!image) return res.status(404).json({ message: "Image not found." });

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Only admins can delete images." });
    }

    mall.images.pull({ _id: imageId });
    await mall.save();

    console.log(`[ADMIN ACTION] Admin ${req.user.email} deleted image ${imageId} from mall ${mallId}`);
    res.status(200).json({ message: "Image deleted successfully!" });
  } catch (err) {
    console.error("🚨 Error deleting image:", err.stack);
    res.status(500).json({ message: "Internal server error while deleting image." });
  }
});

module.exports = router;