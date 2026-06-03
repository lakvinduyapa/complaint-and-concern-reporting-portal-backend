const Complaint = require("../../queries/complaintQueries");

// ========================================
// TRACK COMPLAINT BY CRN (PERN VERSION)
// ========================================
const trackComplaint = async (req, res) => {
  try {
    const { crn } = req.params;

    if (!crn) {
      return res.status(400).json({
        success: false,
        message: "CRN is required",
      });
    }

    // 1. GET COMPLAINT FROM POSTGRESQL
    const complaint = await Complaint.getByCRN(crn);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // 2. GET STATUS HISTORY
    const statusHistory = await Complaint.getStatusHistory(complaint.id);

    // 3. NORMALIZE RESPONSE
    const normalizedStatusHistory = statusHistory.map((entry) => ({
      status: entry.status,
      note: entry.note,
      updatedBy: entry.updated_by,
      updatedAt: entry.created_at,
    }));

    // 4. RESPONSE
    return res.status(200).json({
      success: true,
      data: {
        complaintId: complaint.id,
        crn: complaint.crn,
        category: complaint.category,
        currentStatus: complaint.current_status,
        submittedAt: complaint.created_at,
        escalationRequired: complaint.escalation_required,
        statusHistory: normalizedStatusHistory,
      },
    });
  } catch (error) {
    console.error("Tracking Error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to track complaint",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

module.exports = {
  trackComplaint,
};