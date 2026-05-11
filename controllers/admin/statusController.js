const Complaint = require("../../models/Complaint");
const AuditLog = require("../../models/AuditLog");

const VALID_STATUSES = [
  "Submitted",
  "Preliminary Review",
  "Under Investigation",
  "Awaiting Evidence",
  "Escalated to CIABOC",
  "Resolved",
  "Closed"
];

// ========================================
// Get Status Options
// ========================================

const getStatusOptions = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: VALID_STATUSES
  });
};

// ========================================
// Check if complaint should auto-escalate
// ========================================

const shouldAutoEscalate = (complaint) => {
  // Auto-escalate if senior management involved
  if (complaint.subjects?.some(s => s.seniorManagementInvolved)) {
    return {
      shouldEscalate: true,
      reason: "Senior management personnel involved in complaint"
    };
  }

  // Auto-escalate if category is bribery or high-level corruption
  const escalationCategories = ["bribery", "high-level corruption", "executive misconduct"];
  if (escalationCategories.includes(complaint.category?.toLowerCase())) {
    return {
      shouldEscalate: true,
      reason: `Category "${complaint.category}" requires automatic escalation`
    };
  }

  return { shouldEscalate: false };
};

// ========================================
// Update Complaint Status
// ========================================

const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      note,
      escalate = false,
      escalationReason = ""
    } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      });
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    const previousStatus = complaint.currentStatus;
    complaint.currentStatus = status;

    // Check auto-escalation rules
    const autoEscalateCheck = shouldAutoEscalate(complaint);

    // Handle escalation
    if (escalate || status === "Escalated to CIABOC" || autoEscalateCheck.shouldEscalate) {
      complaint.escalationRequired = true;
      complaint.escalationDate = new Date();
      complaint.escalationApprovedBy = req.user?.email || "Admin";

      if (escalationReason) {
        complaint.escalationReason = escalationReason;
      } else if (autoEscalateCheck.shouldEscalate) {
        complaint.escalationReason = autoEscalateCheck.reason;
      } else {
        complaint.escalationReason = note || "Escalated by admin";
      }

      if (status !== "Escalated to CIABOC") {
        complaint.currentStatus = "Escalated to CIABOC";
      }
    }

    // Add to status history
    complaint.statusHistory.push({
      status: complaint.currentStatus,
      note: note || "Status updated by admin",
      updatedBy: req.user?.email || "Admin"
    });

    // Add investigation note if provided
    if (note) {
      complaint.investigationNotes.push({
        note: note,
        addedBy: req.user?.email || "Admin",
        isConfidential: true,
        addedAt: new Date()
      });
    }

    // Track investigation timeline
    if (status === "Under Investigation" && !complaint.investigationStartDate) {
      complaint.investigationStartDate = new Date();
      complaint.expectedCompletionDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    }

    await complaint.save();

    // Create audit log
    const actionType = complaint.currentStatus === "Escalated to CIABOC" ? "ESCALATE_CASE" : "UPDATE_STATUS";

    await AuditLog.create({
      complaintId: complaint._id,
      userId: req.user?.userId,
      action: actionType,
      details: `Status changed from ${previousStatus} to ${complaint.currentStatus}. Note: ${note || "No note provided"}`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || ""
    });

    return res.status(200).json({
      success: true,
      message: "Complaint status updated successfully",
      data: {
        complaintId: complaint._id,
        crn: complaint.crn,
        previousStatus,
        currentStatus: complaint.currentStatus,
        escalationRequired: complaint.escalationRequired,
        escalationReason: complaint.escalationReason,
        autoEscalated: autoEscalateCheck.shouldEscalate,
        latestStatus: complaint.statusHistory[complaint.statusHistory.length - 1],
        latestNote: complaint.investigationNotes[complaint.investigationNotes.length - 1] || null
      }
    });
  } catch (error) {
    console.error("Update Complaint Status Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update complaint status"
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

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Note cannot be empty"
      });
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    complaint.investigationNotes.push({
      note: note.trim(),
      addedBy: req.user?.email || "Admin",
      isConfidential: isConfidential,
      addedAt: new Date()
    });

    await complaint.save();

    // Audit log
    await AuditLog.create({
      complaintId: complaint._id,
      userId: req.user?.userId,
      action: "UPDATE_STATUS",
      details: `Investigation note added: ${note.substring(0, 100)}...`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || ""
    });

    return res.status(200).json({
      success: true,
      message: "Investigation note added successfully",
      data: {
        crn: complaint.crn,
        noteCount: complaint.investigationNotes.length,
        latestNote: complaint.investigationNotes[complaint.investigationNotes.length - 1]
      }
    });
  } catch (error) {
    console.error("Add Investigation Note Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to add investigation note"
    });
  }
};

// ========================================
// Get Investigation Notes
// ========================================

const getInvestigationNotes = async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id).select("crn investigationNotes");

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        crn: complaint.crn,
        notes: complaint.investigationNotes,
        totalNotes: complaint.investigationNotes.length
      }
    });
  } catch (error) {
    console.error("Get Investigation Notes Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch investigation notes"
    });
  }
};

module.exports = {
  getStatusOptions,
  updateComplaintStatus,
  addInvestigationNote,
  getInvestigationNotes
};
