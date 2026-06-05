const Complaint = require("../../queries/complaintQueries");
const ExcelJS = require("exceljs");

// ======================================
// HELPER: GET START DATE BY PERIOD
// ======================================
const getStartDateByPeriod = (period) => {
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

  return { startDate, now };
};

const filterComplaintsByRole = (complaints, user) => {
  const userRole = user?.role;
  const userId = user?.userId;

  if (userRole === "officer") {
    return complaints.filter(
      (c) => Number(c.assigned_to) === Number(userId)
    );
  }

  if (userRole === "ciaboc") {
    return complaints.filter(
      (c) =>
        c.ciaboc_escalation === true ||
        c.current_status === "Escalated to CIABOC"
    );
  }

  return complaints;
};














// ======================================
// HELPER: BUILD REPORT SUMMARY
// ======================================
const buildReportSummary = (complaints) => {
  const totalComplaints = complaints.length;

  const submitted = complaints.filter(
    (c) => c.current_status === "Submitted"
  ).length;

  const preliminaryReview = complaints.filter(
    (c) => c.current_status === "Preliminary Review"
  ).length;

  const underInvestigation = complaints.filter(
    (c) => c.current_status === "Under Investigation"
  ).length;

  const awaitingEvidence = complaints.filter(
    (c) => c.current_status === "Awaiting Evidence"
  ).length;

  const escalated = complaints.filter(
    (c) =>
      c.current_status === "Escalated to CIABOC" ||
      c.escalation_required === true ||
      c.ciaboc_escalation === true
  ).length;

  const resolved = complaints.filter(
    (c) => c.current_status === "Resolved"
  ).length;

  const closed = complaints.filter(
    (c) => c.current_status === "Closed"
  ).length;

  const anonymousComplaints = complaints.filter(
    (c) => c.is_anonymous === true
  ).length;

  const namedComplaints = complaints.filter(
    (c) => c.is_anonymous === false
  ).length;

  const totalEvidence = complaints.reduce(
    (sum, complaint) =>
      sum + Number(complaint.actual_evidence_count || 0),
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
    const period = req.query.period || "weekly";
    const { startDate, now } = getStartDateByPeriod(period);

    const allComplaints = await Complaint.getAllComplaints();
const roleBasedComplaints = filterComplaintsByRole(allComplaints, req.user);

const complaints = roleBasedComplaints.filter((c) => {



      const created = new Date(c.created_at);
      return created >= startDate && created <= now;
    });

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

    return res.status(200).json({
      success: true,
      summary,
      statusAnalytics,
      categoryAnalytics,
      complaints,
    });
  } catch (error) {
    console.error("Report Error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to generate report",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// ======================================
// EXPORT EXCEL REPORT
// ======================================
const exportExcelReport = async (req, res) => {
  try {
    const period = req.query.period || "weekly";
    const safePeriod = String(period).replace(/[^a-zA-Z0-9_-]/g, "");

    const { startDate, now } = getStartDateByPeriod(period);

    const allComplaints = await Complaint.getAllComplaints();
const roleBasedComplaints = filterComplaintsByRole(allComplaints, req.user);

const complaints = roleBasedComplaints.filter((c) => {


      const created = new Date(c.created_at);
      return created >= startDate && created <= now;
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Complaint Report");

    worksheet.columns = [
      { header: "CRN", key: "crn", width: 25 },
      { header: "Category", key: "category", width: 30 },
      { header: "Status", key: "status", width: 30 },
      { header: "Anonymous", key: "anonymous", width: 15 },
      { header: "Evidence Count", key: "evidenceCount", width: 18 },
      { header: "Created Date", key: "createdAt", width: 22 },
    ];

    complaints.forEach((c) => {
      worksheet.addRow({
        crn: c.crn,
        category: c.category,
        status: c.current_status,
        anonymous: c.is_anonymous ? "Yes" : "No",
        evidenceCount: Number(c.actual_evidence_count || 0),
        createdAt: c.created_at
          ? new Date(c.created_at).toLocaleString()
          : "",
      });
    });

    worksheet.getRow(1).font = {
      bold: true,
      size: 12,
    };

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = {
          vertical: "middle",
        };
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Complaint_Report_${safePeriod}.xlsx`
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("Excel Export Error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });

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
};