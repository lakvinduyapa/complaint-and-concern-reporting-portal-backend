const express = require("express");
const router = express.Router();

const { getStats, getRecentComplaints } = require("../../controllers/admin/dashboardController");
const { authenticateToken } = require("../../middleware/authMiddleware");

// =======================================
// Get Dashboard Stats (Protected)
// =======================================

router.get("/stats", authenticateToken, getStats);

// =======================================
// Get Recent Complaints (Protected)
// =======================================

router.get("/recent-complaints", authenticateToken, getRecentComplaints);

module.exports = router;
