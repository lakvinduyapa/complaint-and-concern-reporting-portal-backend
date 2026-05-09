const Complaint = require("../models/Complaint");

const generateCRN = async () => {
  try {

    // Current Year
    const currentYear = new Date().getFullYear();

    // Count Existing Complaints
    const complaintCount = await Complaint.countDocuments();

    // Increment Count
    const nextNumber = complaintCount + 1;

    // Pad Number
    const paddedNumber = String(nextNumber).padStart(6, "0");

    // Final CRN
    const crn = `IAU-${currentYear}-${paddedNumber}`;

    return crn;

  } catch (error) {
    console.error("CRN Generation Error:", error.message);

    throw new Error("Failed to generate CRN");
  }
};

module.exports = generateCRN;