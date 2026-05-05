const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  submissionType: {
    type: String,
    enum: ["Named", "Anonymous"],
    required: true,
  },

  reporterCategory: {
    type: String,
    enum: [
      "Employee",
      "Vendor",
      "Supplier",
      "Contractor",
      "Customer",
      "Shareholder",
      "General Public",
      "Other"
    ],
    required: true,
  },

  fullName: {
    type: String,
    required: function () {
      return this.submissionType === "Named";
    },
  },

  staffId: {
    type: String,
  },

  division: {
    type: String,
  },

  designation: {
    type: String,
  },

  email: {
    type: String,
    required: function () {
      return this.submissionType === "Named";
    },
  },

  telephone: {
    type: String,
  },

  preferredContactMethod: {
    type: String,
    enum: ["Email", "Phone", "None"],
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);