const mongoose = require("mongoose");

const mallSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  address: { type: String, required: true },

  // Stores inside the mall
  stores: {
    type: [{
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, 
      name: { type: String, required: true },
      category: { type: String, required: true }
    }],
    default: [] // ✅ Ensures stores field exists even if empty
  },

  // User reviews
  reviews: {
    type: [{
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, 
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      username: { type: String, required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String },
      createdAt: { type: Date, default: Date.now }
    }],
    default: [] // ✅ Ensures reviews exist even if empty
  },

  // Contact details
  contact: {
    phone: { type: String },
    website: { type: String }
  },

  // Operating hours
  hours: {
    open: { type: String },
    close: { type: String }
  },

  // List of uploaded images
  images: {
    type: [{
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, 
      url: { type: String, required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      uploadedAt: { type: Date, default: Date.now }
    }],
    default: [] // ✅ Ensures `images` always exists
  }
}, { timestamps: true }); 

// ✅ Index user images for faster lookup
mallSchema.index({ "images.userId": 1 });

module.exports = mongoose.model("Mall", mallSchema);