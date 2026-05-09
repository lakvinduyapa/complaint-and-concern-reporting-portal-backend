const mongoose = require("mongoose");

const evidenceSchema = new mongoose.Schema({

  // Linked Complaint
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Complaint",
    required: true
  },

  // Evidence Type
  evidenceType: {
    type: String,
    enum: [
      "Document",
      "Record",
      "Email or Communication",
      "Photograph",
      "Video",
      "Witness Testimony",
      "Financial Record",
      "Other"
    ],
    required: true
  },

  // Original File Name
  originalFileName: {
    type: String,
    required: true,
    trim: true
  },

  // Stored File Name
  storedFileName: {
    type: String,
    required: true,
    trim: true
  },

  // File Path
  filePath: {
    type: String,
    required: true,
    trim: true
  },

  // File MIME Type
  mimeType: {
    type: String,
    required: true
  },

  // File Size
  fileSize: {
    type: Number,
    required: true
  },

  // Upload Metadata
  uploadedAt: {
    type: Date,
    default: Date.now
  },

  // Uploaded By
  uploadedBy: {
    type: String,
    default: "Public User"
  },

  // Confidentiality
  isConfidential: {
    type: Boolean,
    default: true
  },

  // Verification Status
  verificationStatus: {
    type: String,
    enum: [
      "Pending",
      "Verified",
      "Rejected"
    ],
    default: "Pending"
  },

  // Notes
  notes: {
    type: String,
    trim: true
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Evidence", evidenceSchema);