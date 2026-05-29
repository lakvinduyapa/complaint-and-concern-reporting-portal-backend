const express = require("express");

const router = express.Router();

const {
  getReport,
  exportExcelReport,
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

module.exports = router;