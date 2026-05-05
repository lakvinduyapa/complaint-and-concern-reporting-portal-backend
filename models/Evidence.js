const mongoose = require("mongoose");

const evidenceSchema = new mongoose.Schema({

  hasEvidence: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },

  evidenceType: [{
    type: String,
    enum: [
      "Documents",
      "Records",
      "Email or Communication",
      "Photographs",
      "Videos",
      "Witness testimony",
      "Financial records",
      "Other"
    ]
  }],

  files: [{
    type: String
  }],

  witnessNames: [{
    type: String
  }],

  additionalInfo: {
    type: String
  }

}, { timestamps: true });

module.exports = mongoose.model("Evidence", evidenceSchema);