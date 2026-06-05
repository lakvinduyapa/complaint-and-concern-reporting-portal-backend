const express = require("express");
const router = express.Router();

const auditController = require("../../controllers/admin/auditController");

const {
  authenticateToken,
  authorizeRole,
} = require("../../middleware/authMiddleware");

// All audit routes require login
router.use(authenticateToken);

// Only admin and senior investigator can view audit logs
router.use(authorizeRole(["admin", "senior_investigator"]));

// Get audit logs with filtering and pagination
router.get("/", auditController.getAuditLogs);

// Get available actions for filter
router.get("/actions", auditController.getActions);

// Get available users for filter
router.get("/users", auditController.getUsers);

// Get available complaints for filter
router.get("/complaints", auditController.getComplaintIds);

module.exports = router;