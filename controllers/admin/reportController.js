const Complaint = require("../../models/Complaint");

const getReport = async (req, res) => {
  try {
    const { period } = req.query;

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "2days":
        startDate.setDate(now.getDate() - 2);
        break;

      case "weekly":
        startDate.setDate(now.getDate() - 7);
        break;

      case "2weekly":
        startDate.setDate(now.getDate() - 14);
        break;

      case "monthly":
        startDate.setMonth(now.getMonth() - 1);
        break;

      default:
        startDate.setDate(now.getDate() - 7);
    }

    const complaints = await Complaint.find({
      createdAt: {
        $gte: startDate,
        $lte: now,
      },
    }).sort({ createdAt: -1 });

    // =========================
    // Summary Statistics
    // =========================

    const totalComplaints = complaints.length;

    const submitted = complaints.filter(
      (c) => c.currentStatus === "Submitted"
    ).length;

    const underInvestigation = complaints.filter(
      (c) => c.currentStatus === "Under Investigation"
    ).length;

    const resolved = complaints.filter(
      (c) =>
        c.currentStatus === "Resolved" ||
        c.currentStatus === "Closed"
    ).length;

    const escalated = complaints.filter(
      (c) => c.currentStatus === "Escalated to CIABOC"
    ).length;

    const anonymousComplaints = complaints.filter(
      (c) => c.isAnonymous === true
    ).length;

    const namedComplaints = complaints.filter(
      (c) => c.isAnonymous === false
    ).length;

    const totalEvidence = complaints.reduce(
      (sum, complaint) =>
        sum + (complaint.evidenceCount || 0),
      0
    );

    // =========================
    // Status Analytics
    // =========================

    const statusAnalytics = [
      {
        name: "Submitted",
        value: submitted,
      },
      {
        name: "Under Investigation",
        value: underInvestigation,
      },
      {
        name: "Resolved",
        value: resolved,
      },
      {
        name: "Escalated",
        value: escalated,
      },
    ];

    // =========================
    // Category Analytics
    // =========================

    const categoryMap = {};

    complaints.forEach((complaint) => {
      const category = complaint.category || "Other";

      categoryMap[category] =
        (categoryMap[category] || 0) + 1;
    });

    const categoryAnalytics = Object.keys(categoryMap).map(
      (category) => ({
        name: category,
        value: categoryMap[category],
      })
    );

    // =========================
    // Response
    // =========================

    res.status(200).json({
      success: true,

      summary: {
        totalComplaints,
        submitted,
        underInvestigation,
        resolved,
        escalated,
        anonymousComplaints,
        namedComplaints,
        totalEvidence,
      },

      statusAnalytics,
      categoryAnalytics,

      complaints,
    });
  } catch (error) {
    console.error("Report Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate report",
    });
  }
};

module.exports = {
  getReport,
};