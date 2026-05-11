const Complaint = require("../../models/Complaint");

// ========================================
// Get Dashboard Stats
// ========================================

const getStats = async (req, res) => {
  try {
    // Count total complaints
    const totalComplaints = await Complaint.countDocuments();

    // Count by status
    const pending = await Complaint.countDocuments({
      currentStatus: "Submitted"
    });

    const underInvestigation = await Complaint.countDocuments({
      currentStatus: { $in: ["Preliminary Review", "Under Investigation", "Awaiting Evidence"] }
    });

    const escalated = await Complaint.countDocuments({
      currentStatus: "Escalated to CIABOC"
    });

    const resolved = await Complaint.countDocuments({
      currentStatus: { $in: ["Resolved", "Closed"] }
    });

    // Anonymous vs Named
    const anonymous = await Complaint.countDocuments({
      isAnonymous: true
    });

    const named = await Complaint.countDocuments({
      isAnonymous: false
    });

    // Recent complaints (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentComplaints = await Complaint.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // High-priority (Senior Management Involved)
    const highPriority = await Complaint.countDocuments({
      "subjects.seniorManagementInvolved": true
    });

    // Overdue cases (not updated in 7 days, status not Resolved/Closed)
    const sevenDaysAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const overdue = await Complaint.countDocuments({
      updatedAt: { $lt: sevenDaysAgoDate },
      currentStatus: { $nin: ["Resolved", "Closed"] }
    });

    // Awaiting Evidence (stuck cases)
    const awaitingEvidence = await Complaint.countDocuments({
      currentStatus: "Awaiting Evidence"
    });

    res.status(200).json({
      success: true,
      data: {
        totalComplaints,
        pending,
        underInvestigation,
        escalated,
        resolved,
        anonymous,
        named,
        recentComplaints,
        highPriority,
        overdue,
        awaitingEvidence
      }
    });
  } catch (error) {
    console.error("Get Stats Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats"
    });
  }
};

// ========================================
// Get Recent Complaints
// ========================================

const getRecentComplaints = async (req, res) => {
  try {
    const limit = req.query.limit || 10;

    const complaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select("crn category currentStatus createdAt isAnonymous escalationRequired subjects");

    res.status(200).json({
      success: true,
      data: complaints
    });
  } catch (error) {
    console.error("Get Recent Complaints Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch recent complaints"
    });
  }
};

module.exports = {
  getStats,
  getRecentComplaints
};
