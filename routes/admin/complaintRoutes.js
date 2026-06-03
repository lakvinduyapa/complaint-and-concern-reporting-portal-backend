const express = require("express");

const router = express.Router();

const {
  getComplaints,
  getUnassignedComplaints,
  getComplaintById,
  getAssignableOfficers,
  assignComplaint,
} = require("../../controllers/admin/complaintController");

const {
  authenticateToken,
} = require("../../middleware/authMiddleware");

// ========================================
// GET ALL COMPLAINTS
// ========================================
router.get(
  "/",
  authenticateToken,
  getComplaints
);

// ========================================
// GET ASSIGNABLE OFFICERS
// ========================================
router.get(
  "/officers/list",
  authenticateToken,
  getAssignableOfficers
);

// ========================================
// GET UNASSIGNED COMPLAINTS
// ========================================
router.get(
  "/unassigned/list",
  authenticateToken,
  getUnassignedComplaints
);

// ========================================
// GET SINGLE COMPLAINT
// ========================================
router.get(
  "/:id",
  authenticateToken,
  getComplaintById
);

// ========================================
// ASSIGN COMPLAINT
// ========================================
router.put(
  "/:id/assign",
  authenticateToken,
  assignComplaint
);

module.exports = router;