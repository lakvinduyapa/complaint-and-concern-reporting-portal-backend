// routes/admin/reportRoutes.js
const express = require("express");
const router = express.Router();

const {
  getReport,
  exportExcelReport,
  assignOfficer,
} = require("../../controllers/admin/reportController");

const {
  authenticateToken,
} = require("../../middleware/authMiddleware");

// Get Report Data
router.get(
  "/",
  authenticateToken,
  getReport
);

// Export Excel Report
router.get(
  "/export-excel",
  authenticateToken,
  exportExcelReport
);

// Assign an officer to a complaint
router.patch(
  "/assign/:id",
  authenticateToken,
  assignOfficer
);

module.exports = router;