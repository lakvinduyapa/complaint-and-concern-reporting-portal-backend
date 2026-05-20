const Complaint = require("../../models/Complaint");


// ========================================
// Track Complaint By CRN
// ========================================

const trackComplaint = async (req, res) => {

  try {

    // Get CRN from URL params
    const { crn } = req.params;

    // Find complaint using CRN
    const complaint = await Complaint.findOne({ crn });

    // Complaint not found
    if (!complaint) {

      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });

    }

    const normalizedStatusHistory = (complaint.statusHistory || []).map((entry) => ({
      status: entry.status,
      note: entry.note,
      updatedBy: entry.updatedBy,
      updatedAt: entry.updatedAt || (entry.status === "Submitted" ? complaint.createdAt : complaint.updatedAt)
    }));

    // Success response
    res.status(200).json({

      success: true,

      data: {

        complaintId: complaint._id,

        crn: complaint.crn,

        category: complaint.category,

        currentStatus: complaint.currentStatus,

        submittedAt: complaint.createdAt,

        escalationRequired: complaint.escalationRequired,

        statusHistory: normalizedStatusHistory

      }

    });

  } catch (error) {

    console.error("Tracking Error:", error.message);

    res.status(500).json({

      success: false,
      message: "Failed to track complaint"

    });

  }

};


module.exports = {
  trackComplaint
};