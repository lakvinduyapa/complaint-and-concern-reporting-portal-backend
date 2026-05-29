const Complaint = require("../../models/Complaint");
const ExcelJS = require("exceljs");

// ======================================
// GET REPORT DATA
// ======================================

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

    const preliminaryReview = complaints.filter(
      (c) => c.currentStatus === "Preliminary Review"
    ).length;

    const underInvestigation = complaints.filter(
      (c) => c.currentStatus === "Under Investigation"
    ).length;

    const awaitingEvidence = complaints.filter(
      (c) => c.currentStatus === "Awaiting Evidence"
    ).length;

    const escalated = complaints.filter(
      (c) => c.currentStatus === "Escalated to CIABOC"
    ).length;

    const resolved = complaints.filter(
      (c) => c.currentStatus === "Resolved"
    ).length;

    const closed = complaints.filter(
      (c) => c.currentStatus === "Closed"
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
        name: "Preliminary Review",
        value: preliminaryReview,
      },
      {
        name: "Under Investigation",
        value: underInvestigation,
      },
      {
        name: "Awaiting Evidence",
        value: awaitingEvidence,
      },
      {
        name: "Escalated to CIABOC",
        value: escalated,
      },
      {
        name: "Resolved",
        value: resolved,
      },
      {
        name: "Closed",
        value: closed,
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
        preliminaryReview,
        underInvestigation,
        awaitingEvidence,
        escalated,
        resolved,
        closed,
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

// ======================================
// EXPORT EXCEL REPORT
// ======================================

const exportExcelReport = async (req, res) => {
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
    // Create Workbook
    // =========================

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet(
      "Complaint Report"
    );

    // =========================
    // Worksheet Columns
    // =========================

    worksheet.columns = [
      {
        header: "CRN",
        key: "crn",
        width: 25,
      },
      {
        header: "Category",
        key: "category",
        width: 25,
      },
      {
        header: "Status",
        key: "status",
        width: 30,
      },
      {
        header: "Anonymous",
        key: "anonymous",
        width: 15,
      },
      {
        header: "Evidence Count",
        key: "evidenceCount",
        width: 18,
      },
      {
        header: "Created Date",
        key: "createdAt",
        width: 20,
      },
    ];

    // =========================
    // Add Rows
    // =========================

    complaints.forEach((complaint) => {
      worksheet.addRow({
        crn: complaint.crn,
        category: complaint.category,
        status: complaint.currentStatus,
        anonymous: complaint.isAnonymous
          ? "Yes"
          : "No",
        evidenceCount:
          complaint.evidenceCount || 0,
        createdAt: new Date(
          complaint.createdAt
        ).toLocaleDateString(),
      });
    });

    // =========================
    // Header Styling
    // =========================

    worksheet.getRow(1).font = {
      bold: true,
      size: 12,
    };

    // =========================
    // Response Headers
    // =========================

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Complaint_Report_${period}.xlsx`
    );

    // =========================
    // Write File
    // =========================

    await workbook.xlsx.write(res);

    res.end();

  } catch (error) {
    console.error(
      "Excel Export Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to export Excel report",
    });
  }
};

module.exports = {
  getReport,
  exportExcelReport,
};