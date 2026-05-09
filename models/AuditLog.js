const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({

  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Complaint"
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  action: {
    type: String,
    required: true,
    enum: [
      "LOGIN",
      "LOGOUT",
      "VIEW_COMPLAINT",
      "DOWNLOAD_EVIDENCE",
      "UPLOAD_EVIDENCE",
      "UPDATE_STATUS",
      "CREATE_COMPLAINT",
      "ESCALATE_CASE"
    ]
  },

  details: {
    type: String,
    trim: true
  },

  ipAddress: {
    type: String,
    trim: true
  },

  userAgent: {
    type: String,
    trim: true
  },

  performedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("AuditLog", auditLogSchema);