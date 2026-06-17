const Complaint = require("../../queries/complaintQueries");
const AuditLog = require("../../queries/auditQueries");

const VALID_STATUSES = [
  "Submitted",
  "Preliminary Review",
  "Under Investigation",
  "Awaiting Evidence",
  "Escalated to CIABOC",
  "Resolved",
  "Closed",
];

const getStatusOptions = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: VALID_STATUSES,
  });
};

const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const userId = req.user?.userId || null;
    const userRole = req.user?.role || "user";
    const userEmail = req.user?.email || "Unknown User";

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const complaint = await Complaint.getById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const previousStatus = complaint.current_status;

    const finalStatus = status;

    await Complaint.updateStatus(id, {
      current_status: finalStatus,
      updated_at: new Date(),
    });

    await Complaint.addStatusHistory({
      complaint_id: id,
      status: finalStatus,
      note: note || `Status updated by ${userRole}`,
      updated_by: userId,
    });

    if (note) {
      await Complaint.addInvestigationNote({
        complaint_id: id,
        note,
        added_by: userId,
        is_confidential: true,
      });
    }

    if (finalStatus === "Under Investigation") {
      await Complaint.updateInvestigationTimeline(id, {
        investigation_start_date: new Date(),
        expected_completion_date: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000
        ),
      });
    }

    await AuditLog.create({
      complaintId: id,
      userId,
      action: "UPDATE_STATUS",
      details: `Status changed from ${previousStatus} to ${finalStatus} by ${userRole} (${userEmail}). Note: ${
        note || "No note provided"
      }`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "",
    });

    return res.status(200).json({
      success: true,
      message: "Complaint status updated successfully",
      data: {
        complaintId: id,
        previousStatus,
        currentStatus: finalStatus,
      },
    });
  } catch (error) {
    console.error("Update Status Error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to update complaint status",
      error:
        process.env.NODE_ENV !== "production"
          ? error.message
          : undefined,
    });
  }
};

const addInvestigationNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, isConfidential = true } = req.body;

    const userId = req.user?.userId || null;
    const userRole = req.user?.role || "user";

    if (!note?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Note cannot be empty",
      });
    }

    const complaint = await Complaint.getById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    await Complaint.addInvestigationNote({
      complaint_id: id,
      note: note.trim(),
      added_by: userId,
      is_confidential: isConfidential,
    });

    await AuditLog.create({
      complaintId: id,
      userId,
      action: "ADD_INVESTIGATION_NOTE",
      details: `Investigation note added by ${userRole}`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "",
    });

    return res.status(200).json({
      success: true,
      message: "Investigation note added successfully",
    });
  } catch (error) {
    console.error("Add Note Error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to add note",
      error:
        process.env.NODE_ENV !== "production"
          ? error.message
          : undefined,
    });
  }
};

const getInvestigationNotes = async (req, res) => {
  try {
    const { id } = req.params;

    const notes = await Complaint.getInvestigationNotes(id);

    return res.status(200).json({
      success: true,
      data: {
        complaintId: id,
        notes,
      },
    });
  } catch (error) {
    console.error("Get Notes Error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notes",
      error:
        process.env.NODE_ENV !== "production"
          ? error.message
          : undefined,
    });
  }
};

module.exports = {
  getStatusOptions,
  updateComplaintStatus,
  addInvestigationNote,
  getInvestigationNotes,
};