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

// ========================================
// Get Status Options
// ========================================
const getStatusOptions = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: VALID_STATUSES,
  });
};

// ========================================
// Auto Escalation Logic
// ========================================
const shouldAutoEscalate = (complaint) => {
  const escalationCategories = [
    "bribery",
    "corruption",
    "fraud",
    "financial misconduct",
    "procurement irregularity",
  ];

  if (escalationCategories.includes(String(complaint.category || "").toLowerCase())) {
    return {
      shouldEscalate: true,
      reason: `Category "${complaint.category}" requires automatic escalation`,
    };
  }

  return { shouldEscalate: false };
};

// ========================================
// UPDATE STATUS
// ========================================
const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, escalate = false, escalationReason = "" } = req.body;

    const adminUserId = req.user?.userId || null;

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
    let finalStatus = status;

    const autoEscalateCheck = shouldAutoEscalate(complaint);

    let escalationFlag = false;
    let escalationText = null;

    if (
      escalate ||
      status === "Escalated to CIABOC" ||
      autoEscalateCheck.shouldEscalate
    ) {
      escalationFlag = true;
      escalationText =
        escalationReason ||
        autoEscalateCheck.reason ||
        note ||
        "Escalated by admin";

      finalStatus = "Escalated to CIABOC";
    }

    await Complaint.updateStatus(id, {
      current_status: finalStatus,
      escalation_required: escalationFlag,
      ciaboc_escalation: escalationFlag,
      escalation_reason: escalationText,
      escalation_date: escalationFlag ? new Date() : null,
      escalation_approved_by: escalationFlag ? adminUserId : null,
      updated_at: new Date(),
    });

    await Complaint.addStatusHistory({
      complaint_id: id,
      status: finalStatus,
      note: note || "Status updated by admin",
      updated_by: adminUserId,
    });

    if (note) {
      await Complaint.addInvestigationNote({
        complaint_id: id,
        note,
        added_by: adminUserId,
        is_confidential: true,
      });
    }

    if (status === "Under Investigation") {
      await Complaint.updateInvestigationTimeline(id, {
        investigation_start_date: new Date(),
        expected_completion_date: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000
        ),
      });
    }

    await AuditLog.create({
      complaintId: id,
      userId: adminUserId,
      action:
        finalStatus === "Escalated to CIABOC"
          ? "ESCALATE_CASE"
          : "UPDATE_STATUS",
      details: `Status changed from ${previousStatus} to ${finalStatus}. Note: ${
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
        escalationRequired: escalationFlag,
        escalationReason: escalationText,
        autoEscalated: autoEscalateCheck.shouldEscalate,
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
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// ========================================
// Add Investigation Note
// ========================================
const addInvestigationNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, isConfidential = true } = req.body;

    const adminUserId = req.user?.userId || null;

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
      added_by: adminUserId,
      is_confidential: isConfidential,
    });

    await AuditLog.create({
      complaintId: id,
      userId: adminUserId,
      action: "ADD_INVESTIGATION_NOTE",
      details: "Investigation note added",
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
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// ========================================
// Get Investigation Notes
// ========================================
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
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

module.exports = {
  getStatusOptions,
  updateComplaintStatus,
  addInvestigationNote,
  getInvestigationNotes,
};