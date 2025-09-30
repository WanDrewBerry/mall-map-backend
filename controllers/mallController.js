const Mall = require('../models/Mall');
const mongoose = require('mongoose');

// Create Mall (Admin-only)
const createMall = async (req, res) => {
  try {
    const newMall = new Mall(req.body);
    const savedMall = await newMall.save();
    res.status(201).json({ message: "Mall created successfully!", mall: savedMall });
  } catch (err) {
    console.error("Error creating mall:", err);
    res.status(500).json({ message: "An error occurred while creating the mall.", error: err.message });
  }
};

// Get All Malls with Pagination & Sorting (Public)
const getMalls = async (req, res) => {
  try {
    let { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    order = order === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;

    const totalMalls = await Mall.countDocuments();
    const malls = await Mall.find()
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      page,
      limit,
      totalItems: totalMalls,
      totalPages: Math.ceil(totalMalls / limit),
      malls
    });
  } catch (err) {
    console.error("Error fetching malls with pagination:", err);
    res.status(500).json({ message: "An error occurred while retrieving malls.", error: err.message });
  }
};

// Get Mall by ID (Public)
const getMallById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid mall ID" });
  }
  try {
    const mall = await Mall.findById(id);
    if (!mall) {
      return res.status(404).json({ message: "Mall not found" });
    }
    res.status(200).json(mall);
  } catch (err) {
    console.error("Error retrieving mall by ID:", err.message);
    res.status(500).json({ message: "An error occurred while retrieving the mall.", error: err.message });
  }
};

// Update mall
const updateMall = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid mall ID" });
  }
  try {
    console.log("Update request body:", req.body);
    const updatedMall = await Mall.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    console.log("Updated mall:", updatedMall);
    if (!updatedMall) {
      console.warn("Mall not found for update:", id);
      return res.status(404).json({ message: "Mall not found" });
    }
    res.status(200).json({ message: "Mall updated successfully!", updatedMall });
  } catch (err) {
    console.error("Error updating mall:", err);
    res.status(500).json({ message: "An error occurred while updating the mall.", error: err.message });
  }
};

// Upload mall photo
const uploadImage = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Validate Mall ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log("🚨 Invalid Mall ID:", id);
      return res.status(400).json({ message: "Invalid mall ID" });
    }

    const mall = await Mall.findById(id);
    if (!mall) {
      console.log("❌ Mall not found:", id);
      return res.status(404).json({ message: "Mall not found." });
    }

    // ✅ Ensure authenticated user
    if (!req.user || !req.user._id) {
      console.log("🚨 Unauthorized upload attempt.");
      return res.status(403).json({ message: "Unauthorized: You must be logged in to upload images." });
    }

    // ✅ Fix: Ensure `userId` is correctly passed in request
    const userId = req.body.userId || req.user._id;
    if (!userId) {
      console.log("🚨 Missing user ID in request!");
      return res.status(400).json({ message: "User ID is required for image uploads." });
    }

    console.log("🔍 User ID received:", userId);

    // ✅ Ensure a file was uploaded
    if (!req.file) {
      console.log("🚨 No file received in request.");
      return res.status(400).json({ message: "No file uploaded." });
    }

    // ✅ Fix spaces in filenames before storing
    const filename = req.file.filename.replace(/\s+/g, "_");

    // 🔥 Validate file extension
    const allowedExtensions = ["jpg", "jpeg", "png", "gif"];
    const fileExtension = filename.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      console.log("🚨 Invalid file type:", fileExtension);
      return res.status(400).json({ message: "Invalid file type. Only JPG, PNG, and GIF are allowed." });
    }

    // ✅ Store image with uploader’s `userId`
    const newImage = {
  _id: new mongoose.Types.ObjectId(), // ✅ Ensure `_id` is created
  url: filename,
  userId: userId,
  uploadedAt: new Date(),
};

mall.images.push(newImage);
await mall.save();
console.log("✅ Updated mall document:", mall);

    console.log(`[UPLOAD] ${req.user.username || "Unknown User"} uploaded image ${filename} to Mall ${id}`);
    res.status(200).json({ message: "Image uploaded successfully!", image: newImage });
  } catch (err) {
    console.error("🚨 Error uploading image:", err.message);
    res.status(500).json({ message: "Image upload failed.", error: err.message });
  }
};

const fs = require("fs");
const path = require("path");

const deleteImage = async (req, res) => {
  try {
    const { mallId, imageId } = req.params;

    const mall = await Mall.findById(mallId);
    if (!mall) {
      return res.status(404).json({ message: "Mall not found." });
    }

    const image = mall.images.id(imageId);
    if (!image) {
      return res.status(404).json({ message: "Image not found." });
    }

    // ✅ Ensure only uploader or admin can delete
    if (image.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Only admins or uploaders can delete images." });
    }

    // 🔥 Remove file from storage
    const filePath = path.join(__dirname, "..", image.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ File deleted from storage: ${filePath}`);
    } else {
      console.warn(`⚠️ File not found in storage: ${filePath}`);
    }

    // 🔥 Use `.pull()` for efficient MongoDB deletion
    mall.images.pull({ _id: imageId });
    await mall.save();

    console.log(`[ADMIN ACTION] Admin ${req.user.email} deleted image ${imageId} from Mall ${mallId}`);
    res.status(200).json({ message: "Image deleted successfully!" });
  } catch (err) {
    console.error("🚨 Error deleting image:", err.stack);
    res.status(500).json({ message: "Internal server error while deleting image." });
  }
};

// Delet Mall
const deleteMall = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid mall ID" });
  }

  // ✅ Restrict mall deletion to admins only
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized: Only admins can delete malls." });
  }

  try {
    const deletedMall = await Mall.findByIdAndDelete(id);
    if (!deletedMall) {
      return res.status(404).json({ message: "Mall not found" });
    }

    res.status(200).json({ message: "Mall deleted successfully!" });
  } catch (err) {
    console.error("Error deleting mall:", err);
    res.status(500).json({ message: "An error occurred while deleting the mall.", error: err.message });
  }
};

// Search Mall
const searchMalls = async (req, res) => {
  try {
    const { name, description, city, minLat, maxLat, minLng, maxLng } = req.query;
    let filter = {};

    // Apply filters based on search parameters
    if (name) filter.name = { $regex: name, $options: 'i' }; // Case-insensitive search
    if (description) filter.description = { $regex: description, $options: 'i' }; // Partial match search
    if (city) filter.address = { $regex: city, $options: 'i' }; // Match city in address

    // Geolocation filtering
    if (minLat && maxLat) {
      filter['location.lat'] = { $gte: parseFloat(minLat), $lte: parseFloat(maxLat) };
    }
    if (minLng && maxLng) {
      filter['location.lng'] = { $gte: parseFloat(minLng), $lte: parseFloat(maxLng) };
    }

    // Find malls that match the search criteria
    const malls = await Mall.find(filter);
    res.status(200).json(malls);
  } catch (err) {
    console.error("Error searching malls:", err.message);
    res.status(500).json({ message: "An error occurred while searching for malls.", error: err.message });
  }
};

// Get Detailed Mall Information (Public)
const getMallDetails = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid mall ID" });
  }
  try {
    const mall = await Mall.findById(id).populate("reviews"); // Populate reviews if there's a relation

    if (!mall) {
      return res.status(404).json({ message: "Mall not found" });
    }

    // ✅ Ensure images have correct paths
    res.status(200).json({
      _id: mall._id,
      name: mall.name,
      description: mall.description,
      address: mall.address,
      location: mall.location,
      stores: mall.stores,
      reviews: mall.reviews,
      images: mall.images.map((img) => ({
        url: img.url.startsWith("/uploads/")
          ? img.url // ✅ Keeps correct path if already formatted
          : `/uploads/${img.url}`, // ✅ Adds /uploads/ only if missing
      })),
    });
  } catch (err) {
    console.error("Error retrieving detailed mall info:", err.message);
    res.status(500).json({
      message: "An error occurred while retrieving detailed mall info.",
      error: err.message,
    });
  }
};

// ✅ Add Review (Protected)
const addReview = async (req, res) => {
  try {
    console.log("✅ Review Submission Request Received");
    console.log("🔍 Mall ID:", req.params.id);
    console.log("🔍 User:", req.user);
    console.log("🔍 Request Body:", req.body);

    const { rating, comment } = req.body;

    // ✅ Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const mall = await Mall.findById(req.params.id);
    if (!mall) {
      console.error("🚨 Mall not found.");
      return res.status(404).json({ message: "Mall not found." });
    }

    if (!req.user || !req.user.username) {
      console.error("🚨 Username is missing!");
      return res.status(400).json({ message: "Username is required to submit a review." });
    }

    // ✅ Ensure username is added to review
    const review = {
      user: req.user._id,
      username: req.user.username, // 🔹 Fix: Ensure username is included
      rating,
      comment,
      createdAt: new Date(),
    };

    mall.reviews.push(review);
    await mall.save();

    console.log("✅ Review saved successfully!", review);
    res.status(201).json({ message: "Review added successfully!", review });

  } catch (err) {
    console.error("🚨 Error adding review:", err);
    res.status(500).json({ message: "❌ Internal server error while adding review.", error: err.message });
  }
};

// ✅ Edit Review (Protected)
const editReview = async (req, res) => {
  const { mallId, reviewId } = req.params;
  const { rating, comment } = req.body;

  if (rating && (rating < 1 || rating > 5)) {
    return res.status(400).json({ message: "Rating must be between 1 and 5." });
  }

  if (!rating && !comment) {
    return res.status(400).json({ message: "At least one field (rating or comment) must be provided." });
  }

  try {
    const mall = await Mall.findById(mallId);
    if (!mall) return res.status(404).json({ message: "Mall not found." });

    const review = mall.reviews.find(r => r._id.toString() === reviewId);
    if (!review) return res.status(404).json({ message: "Review not found." });

    // ✅ Ensure only the review owner or admin can edit
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: You can only edit your own review." });
    }

    // ✅ Apply updates only if valid input is provided
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;

    await mall.save();
    res.status(200).json({ message: "Review updated successfully!", review });
  } catch (error) {
    console.error("Error editing review:", error);
    res.status(500).json({ message: "Internal server error while editing review." });
  }
};

// ✅ Delete Review (Protected)
const deleteReview = async (req, res) => {
  const { mallId, reviewId } = req.params;

  try {
    const mall = await Mall.findById(mallId);
    if (!mall) return res.status(404).json({ message: "Mall not found." });

    const review = mall.reviews.find(r => r._id.toString() === reviewId);
    if (!review) return res.status(404).json({ message: "Review not found." });

    // ✅ Allow ONLY admins to delete reviews
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Only admins can delete reviews." });
    }

    mall.reviews = mall.reviews.filter(r => r._id.toString() !== reviewId);
    await mall.save();

    console.log(`[ADMIN ACTION] Admin ${req.user.email} deleted review ${reviewId} from Mall ${mallId}`);
    res.status(200).json({ message: "Review deleted successfully!" });
  } catch (error) {
    console.error("🚨 Error deleting review:", error);
    res.status(500).json({ message: "Internal server error while deleting review." });
  }
};

// Export all controllers
module.exports = {
  createMall,
  getMalls,
  getMallById,
  getMallDetails, // Added missing function
  updateMall,
  deleteMall,
  searchMalls,
  addReview,
  editReview, // Added missing function
  deleteReview // Added missing function
};