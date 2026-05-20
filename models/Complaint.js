const mongoose = require("mongoose");


// Reporter Schema
const reporterSchema = new mongoose.Schema({
  submissionType: {
    type: String,
    enum: ["named", "anonymous"],
    required: true
  },

  fullName: {
    type: String,
    trim: true
  },

  employeeId: {
    type: String,
    trim: true
  },

  department: {
    type: String,
    trim: true
  },

  designation: {
    type: String,
    trim: true
  },

  email: {
    type: String,
    trim: true,
    lowercase: true
  },

  phone: {
    type: String,
    trim: true
  },

  preferredContactMethod: {
    type: String,
    enum: ["email", "phone", "none"],
    default: "none"
  }
}, { _id: false });




// Subject Schema
const subjectSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },

  designation: {
    type: String,
    trim: true
  },

  organisation: {
    type: String,
    trim: true
  },

  relationship: {
    type: String,
    trim: true
  },

  seniorManagementInvolved: {
    type: Boolean,
    default: false
  }
}, { _id: false });




// Status History Schema
const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      "Submitted",
      "Preliminary Review",
      "Under Investigation",
      "Awaiting Evidence",
      "Escalated to CIABOC",
      "Resolved",
      "Closed"
    ],
    required: true
  },

  note: {
    type: String,
    trim: true
  },

  updatedBy: {
    type: String,
    trim: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }

}, { _id: false });


// Investigation Notes Schema
const investigationNoteSchema = new mongoose.Schema({
  note: {
    type: String,
    required: true,
    trim: true
  },

  addedBy: {
    type: String,
    required: true,
    trim: true
  },

  isConfidential: {
    type: Boolean,
    default: true
  },

  addedAt: {
    type: Date,
    default: Date.now
  }

}, { _id: false });



// Main Complaint Schema
const complaintSchema = new mongoose.Schema({

  // CRN
  crn: {
    type: String,
    required: true,
    unique: true
  },

  // Complaint Category
  category: {
    type: String,
    required: true,
    trim: true
  },

  // Incident Information
  incidentDate: {
    type: Date
  },

  incidentLocation: {
    type: String,
    trim: true
  },

  frequency: {
    type: String,
    enum: [
      "One-time incident",
      "Repeated incident",
      "Ongoing"
    ]
  },

  awarenessMethod: {
    type: String,
    trim: true
  },

  // Complaint Description
  description: {
    type: String,
    required: true,
    minlength: 50,
    trim: true
  },

  // Previous Reporting
  previouslyReported: {
    type: Boolean,
    default: false
  },

  previousReportDetails: {
    type: String,
    trim: true
  },

  // Reporter Information
  reporter: reporterSchema,

  // Subjects
  subjects: [subjectSchema],

  // Status
  currentStatus: {
    type: String,
    enum: [
      "Submitted",
      "Preliminary Review",
      "Under Investigation",
      "Awaiting Evidence",
      "Escalated to CIABOC",
      "Resolved",
      "Closed"
    ],
    default: "Submitted"
  },

  // Status Timeline
  statusHistory: [statusHistorySchema],

  // Investigation Notes (NEW)
  investigationNotes: [investigationNoteSchema],

  // Escalation
  escalationRequired: {
    type: Boolean,
    default: false
  },

  escalationReason: {
    type: String,
    trim: true
  },

  escalationDate: {
    type: Date
  },

  escalationApprovedBy: {
    type: String,
    trim: true
  },

  // Evidence Count
  evidenceCount: {
    type: Number,
    default: 0
  },

  // Confidentiality
  isAnonymous: {
    type: Boolean,
    default: false
  },

  // Submission Metadata
  submissionSource: {
    type: String,
    default: "web"
  },

  // Investigation Tracking (NEW)
  assignedTo: {
    type: String,
    trim: true
  },

  investigationStartDate: {
    type: Date
  },

  expectedCompletionDate: {
    type: Date
  }

}, {
  timestamps: true
});




module.exports = mongoose.model("Complaint", complaintSchema);