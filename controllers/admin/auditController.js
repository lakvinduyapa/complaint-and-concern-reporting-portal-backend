const AuditLog = require("../../queries/auditQueries.js");
const User = require("../../queries/userQueries.js");
const Complaint = require("../../queries/complaintQueries.js");

// ===============================
// GET AUDIT LOGS (FILTER + PAGINATION)
// ===============================
const getAuditLogs = async (req, res) => {
  try {
    const {
      complaintId,
      action,
      userId,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    let logs = await AuditLog.getAllAuditLogs();

    if (complaintId) {
      logs = logs.filter((log) => String(log.complaint_id) === String(complaintId));
    }

    if (action) {
      logs = logs.filter((log) => log.action === action);
    }

    if (userId) {
      logs = logs.filter((log) => String(log.user_id) === String(userId));
    }

    if (fromDate) {
      logs = logs.filter(
        (log) => new Date(log.performed_at) >= new Date(fromDate)
      );
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() + 1);

      logs = logs.filter((log) => new Date(log.performed_at) < endDate);
    }

    const total = logs.length;
    const paginatedLogs = logs.slice(offset, offset + limitNumber);

    return res.status(200).json({
      success: true,
      logs: paginatedLogs,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// ===============================
// GET UNIQUE ACTIONS
// ===============================
const getActions = async (req, res) => {
  try {
    const logs = await AuditLog.getAllAuditLogs();
    const actions = [...new Set(logs.map((log) => log.action).filter(Boolean))];

    return res.status(200).json({
      success: true,
      actions: actions.sort(),
    });
  } catch (error) {
    console.error("Error fetching audit actions:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch actions",
    });
  }
};

// ===============================
// GET USERS FOR FILTER
// ===============================
const getUsers = async (req, res) => {
  try {
    const logs = await AuditLog.getAllAuditLogs();

    const userIds = [
      ...new Set(logs.map((log) => log.user_id).filter((id) => id !== null)),
    ];

    const users = [];

    for (const id of userIds) {
      const user = await User.getUserById(id);

      if (user) {
        users.push({
          id: user.id,
          fullName: user.full_name,
          email: user.email,
        });
      }
    }

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Error fetching audit users:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// ===============================
// GET COMPLAINT IDS
// ===============================
const getComplaintIds = async (req, res) => {
  try {
    const complaints = await Complaint.getAllComplaints();

    const result = complaints.map((complaint) => ({
      id: complaint.id,
      crn: complaint.crn,
      category: complaint.category,
    }));

    return res.status(200).json({
      success: true,
      complaints: result,
    });
  } catch (error) {
    console.error("Error fetching complaint IDs:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
    });
  }
};

module.exports = {
  getAuditLogs,
  getActions,
  getUsers,
  getComplaintIds,
};