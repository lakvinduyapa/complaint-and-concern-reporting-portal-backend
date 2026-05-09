const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  fullName: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: [
      "IAU Officer",
      "Investigator",
      "Supervisor",
      "Admin"
    ],
    default: "IAU Officer"
  },

  department: {
    type: String,
    default: "Internal Audit Unit"
  },

  isActive: {
    type: Boolean,
    default: true
  },

  lastLogin: {
    type: Date
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);