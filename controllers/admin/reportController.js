// controllers/admin/reportController.js
const Complaint = require("../../queries/complaintQueries");
const User = require("../../queries/userQueries"); // changed to userQueries (not model)
const ExcelJS = require("exceljs");

// ======================================
// HELPER: GET DATE RANGE FROM PERIOD
// ======================================
const getDateRangeFromPeriod = (period) => {
  const now = new Date();
  const startDate = new Date();

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
  return { startDate, endDate: now };
};

// ======================================
// HELPER: FILTER COMPLAINTS BY USER ROLE
// ======================================
const filterComplaintsByRole = (complaints, user) => {
  const userRole = user?.role;
  const userId = user?.userId;

  if (userRole === "officer") {
    return complaints.filter((c) => Number(c.assigned_to) === Number(userId));
  }
  if (userRole === "ciaboc") {
    return complaints.filter(
      (c) => c.ciaboc_escalation === true || c.current_status === "Escalated to CIABOC"
    );
  }
  return complaints;
};

// ======================================
// HELPER: BUILD REPORT SUMMARY
// ======================================
const buildReportSummary = (complaints) => {
  const totalComplaints = complaints.length;
  const submitted = complaints.filter((c) => c.current_status === "Submitted").length;
  const preliminaryReview = complaints.filter((c) => c.current_status === "Preliminary Review").length;
  const underInvestigation = complaints.filter((c) => c.current_status === "Under Investigation").length;
  const awaitingEvidence = complaints.filter((c) => c.current_status === "Awaiting Evidence").length;
  const escalated = complaints.filter(
    (c) =>
      c.current_status === "Escalated to CIABOC" ||
      c.escalation_required === true ||
      c.ciaboc_escalation === true
  ).length;
  const resolved = complaints.filter((c) => c.current_status === "Resolved").length;
  const closed = complaints.filter((c) => c.current_status === "Closed").length;
  const anonymousComplaints = complaints.filter((c) => c.is_anonymous === true).length;
  const namedComplaints = complaints.filter((c) => c.is_anonymous === false).length;
  const totalEvidence = complaints.reduce(
    (sum, complaint) => sum + Number(complaint.actual_evidence_count || 0),
    0
  );

  return {
    totalComplaints,
    submitted,
    preliminaryReview,
    underInvestigation,
    awaitingEvidence,
    escalated,
    resolved,
    closed,
    anonymousComplaints,
    namedComplaints,
    totalEvidence,
  };
};

// ======================================
// GET REPORT DATA
// ======================================
const getReport = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      const range = getDateRangeFromPeriod(period || "weekly");
      start = range.startDate;
      end = range.endDate;
    }

    const allComplaints = await Complaint.getAllComplaints();
    const roleBasedComplaints = filterComplaintsByRole(allComplaints, req.user);

    const complaints = roleBasedComplaints.filter((c) => {
      const created = new Date(c.created_at);
      return created >= start && created <= end;
    });

    // Build summary
    const summary = buildReportSummary(complaints);
    const statusAnalytics = [
      { name: "Submitted", value: summary.submitted },
      { name: "Preliminary Review", value: summary.preliminaryReview },
      { name: "Under Investigation", value: summary.underInvestigation },
      { name: "Awaiting Evidence", value: summary.awaitingEvidence },
      { name: "Escalated to CIABOC", value: summary.escalated },
      { name: "Resolved", value: summary.resolved },
      { name: "Closed", value: summary.closed },
    ];

    const categoryMap = {};
    complaints.forEach((c) => {
      const category = c.category || "Other";
      categoryMap[category] = (categoryMap[category] || 0) + 1;
    });
    const categoryAnalytics = Object.keys(categoryMap).map((cat) => ({
      name: cat,
      value: categoryMap[cat],
    }));

    // No need to fetch officers separately; use assigned_officer_name from query.
    // Map complaints to include assignedToName and assignedToId
    const complaintsWithAssignees = complaints.map((c) => ({
      ...c,
      assignedToName: c.assigned_officer_name || null, // already from JOIN
      assignedToId: c.assigned_to ? String(c.assigned_to) : null,
    }));

    // Optionally, also fetch a list of officers for the frontend (if needed)
    // But Reports.jsx doesn't need dropdown, so we can omit or keep as empty.
    // For consistency with earlier code, we can still provide officer list if needed,
    // but it's not used in the read-only display.
    // We'll fetch a simple list using userQueries (if available)
    let officerList = [];
    try {
      // Assuming User.getUsersByRole exists in userQueries
      const officers = await User.getUsersByRole("officer");
      officerList = officers.map((o) => ({
        id: String(o.id),
        name: o.full_name,
      }));
    } catch (err) {
      // If the method doesn't exist, just ignore
      console.warn("Could not fetch officers for dropdown:", err.message);
    }

    return res.status(200).json({
      success: true,
      summary,
      statusAnalytics,
      categoryAnalytics,
      complaints: complaintsWithAssignees,
      officers: officerList, // optional
    });
  } catch (error) {
    console.error("Report Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate report",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// ======================================
// ASSIGN OFFICER TO COMPLAINT
// ======================================
const assignOfficer = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    // Validate officer existence using userQueries
    if (assignedTo) {
      const officer = await User.getUserById(assignedTo);
      if (!officer || officer.role !== "officer") {
        return res.status(400).json({
          success: false,
          message: "Invalid officer ID or user is not an officer",
        });
      }
    }

    // Update the complaint's assigned_to field
    const updatedComplaint = await Complaint.updateStatus(id, {
      assigned_to: assignedTo || null,
    });

    if (!updatedComplaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // Get officer name if assigned
    let officerName = null;
    if (assignedTo) {
      const officer = await User.getUserById(assignedTo);
      officerName = officer ? officer.full_name : null;
    }

    return res.status(200).json({
      success: true,
      message: "Officer assigned successfully",
      data: {
        id: updatedComplaint.id,
        assignedTo: assignedTo || null,
        assignedToName: officerName,
      },
    });
  } catch (error) {
    console.error("Assign Officer Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign officer",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// ======================================
// EXPORT EXCEL REPORT
// ======================================
const exportExcelReport = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      const range = getDateRangeFromPeriod(period || "weekly");
      start = range.startDate;
      end = range.endDate;
    }

    const allComplaints = await Complaint.getAllComplaints();
    const roleBasedComplaints = filterComplaintsByRole(allComplaints, req.user);

    const complaints = roleBasedComplaints.filter((c) => {
      const created = new Date(c.created_at);
      return created >= start && created <= end;
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Complaint Report");

    worksheet.columns = [
      { header: "CRN", key: "crn", width: 25 },
      { header: "Category", key: "category", width: 30 },
      { header: "Status", key: "status", width: 30 },
      { header: "Assigned To", key: "assignedTo", width: 25 },
      { header: "Anonymous", key: "anonymous", width: 15 },
      { header: "Evidence Count", key: "evidenceCount", width: 18 },
      { header: "Created Date", key: "createdAt", width: 22 },
    ];

    // Use assigned_officer_name from complaint data
    complaints.forEach((c) => {
      worksheet.addRow({
        crn: c.crn,
        category: c.category,
        status: c.current_status,
        assignedTo: c.assigned_officer_name || "",
        anonymous: c.is_anonymous ? "Yes" : "No",
        evidenceCount: Number(c.actual_evidence_count || 0),
        createdAt: c.created_at ? new Date(c.created_at).toLocaleString() : "",
      });
    });

    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: "middle" };
      });
    });

    const safeLabel = startDate && endDate ? "custom" : period || "weekly";
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Complaint_Report_${safeLabel}.xlsx`
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("Excel Export Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export Excel report",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

module.exports = {
  getReport,
  exportExcelReport,
  assignOfficer,
};