const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({

  crn: {
    type: String,
    required: true,
    unique: true,
  },

  complaintCategory: {
    type: String,
    enum: [
      "Bribery",
      "Corruption",
      "Fraud",
      "Financial Misconduct",
      "Abuse of Authority",
      "Misappropriation",
      "Conflict of Interest",
      "Procurement Irregularity",
      "Falsification of Records",
      "Harassment",
      "Workplace Misconduct",
      "Breach of Confidentiality",
      "Non-compliance",
      "Other Malpractice"
    ],
    required: true,
  },

  incidentDate: {
    type: Date,
    required: true,
  },

  location: {
    type: String,
    required: true,
  },

  frequency: {
    type: String,
    enum: [
      "One-time incident",
      "Repeated - periodic",
      "Ongoing / continuous",
      "Unknown"
    ],
    required: true,
  },

  description: {
    type: String,
    required: true,
    minlength: 50,
  },

  awarenessMethod: {
    type: String,
    enum: [
      "Direct witness",
      "Informed by another party",
      "Discovered through documents or records",
      "Other"
    ],
    required: true,
  },

  reportedPreviously: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },

  previousReportDetails: {
    type: String,
    required: function () {
      return this.reportedPreviously === "Yes";
    },
  }

}, { timestamps: true });

module.exports = mongoose.model("Complaint", complaintSchema);