const Complaint = require("../../queries/complaintQueries");


const filterComplaintsByRole = (complaints, user) => {
  const userRole = user?.role;
  const userId = user?.userId;
  const isCiabocComplaint = (complaint) =>
    complaint.ciaboc_escalation === true ||
    complaint.current_status === "Escalated to CIABOC";

  if (userRole === "officer") {
    return complaints.filter(
      (c) =>
        Number(c.assigned_to) === Number(userId) &&
        !isCiabocComplaint(c)
    );
  }

  if (userRole === "ciaboc") {
    return complaints.filter(
      (c) => isCiabocComplaint(c)
    );
  }

  return complaints.filter((c) => !isCiabocComplaint(c));
};
// ========================================
// GET DASHBOARD STATS
// ========================================
const getStats = async (req, res) => {
  try {
    const allComplaints = await Complaint.getAllComplaints();
    const all = filterComplaintsByRole(allComplaints, req.user);

    const totalComplaints = all.length;

    const pending = all.filter(
      (c) => c.current_status === "Submitted"
    ).length;

    const underInvestigation = all.filter((c) =>
      ["Preliminary Review", "Under Investigation", "Awaiting Evidence"].includes(
        c.current_status
      )
    ).length;

    const escalated = all.filter(
      (c) =>
        c.current_status === "Escalated to CIABOC" ||
        c.ciaboc_escalation === true ||
        c.escalation_required === true
    ).length;

    const resolved = all.filter((c) =>
      ["Resolved", "Closed"].includes(c.current_status)
    ).length;

    const anonymous = all.filter((c) => c.is_anonymous === true).length;
    const named = all.filter((c) => c.is_anonymous === false).length;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentComplaints = all.filter(
      (c) => new Date(c.created_at) >= sevenDaysAgo
    ).length;

    // Temporary logic: use escalation flags from complaints table
    // Later, you can calculate this from complaint_subjects table with JOIN.
    const highPriority = all.filter(
      (c) => c.escalation_required === true || c.ciaboc_escalation === true
    ).length;

    const overdue = all.filter((c) => {
      const updated = new Date(c.updated_at || c.created_at);
      const notDone = !["Resolved", "Closed"].includes(c.current_status);
      return updated < sevenDaysAgo && notDone;
    }).length;

    const awaitingEvidence = all.filter(
      (c) => c.current_status === "Awaiting Evidence"
    ).length;

    return res.status(200).json({
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
        awaitingEvidence,
      },
    });
  } catch (error) {
    console.error("Get Stats Error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// ========================================
// GET RECENT COMPLAINTS
// ========================================
const getRecentComplaints = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "10", 10);

    const allComplaints = await Complaint.getAllComplaints();
    const all = filterComplaintsByRole(allComplaints, req.user);

    const sorted = all
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
      .map((c) => ({
        id: c.id,
        crn: c.crn,
        category: c.category,
        currentStatus: c.current_status,
        createdAt: c.created_at,
        isAnonymous: c.is_anonymous,
        escalationRequired: c.escalation_required,
        ciabocEscalation: c.ciaboc_escalation,
        reporterFullName: c.reporter_full_name,
      }));

    return res.status(200).json({
      success: true,
      data: sorted,
    });
  } catch (error) {
    console.error("Get Recent Complaints Error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch recent complaints",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

module.exports = {
  getStats,
  getRecentComplaints,
};