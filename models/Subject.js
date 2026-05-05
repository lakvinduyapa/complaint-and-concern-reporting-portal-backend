const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({

  names: {
    type: [String],
    default: [],
  },

  designation: {
    type: String,
    default: "",
  },

  organisation: {
    type: String,
    enum: ["SLT", "Mobitel", "SLTS", "External", "Vendor", "Unknown"],
    default: "Unknown",
  },

  relationshipToReporter: {
    type: String,
    enum: [
      "Superior",
      "Manager",
      "Peer",
      "Colleague",
      "Subordinate",
      "External",
      "Unknown"
    ],
    default: "Unknown",
  },

  involvesSeniorManagement: {
    type: String,
    enum: ["Yes", "No", "Unsure"],
    required: true,
  },

  seniorPersonNames: {
    type: [String],
    default: [],
    required: function () {
      return this.involvesSeniorManagement === "Yes";
    },
  }

}, { timestamps: true });

module.exports = mongoose.model("Subject", subjectSchema);