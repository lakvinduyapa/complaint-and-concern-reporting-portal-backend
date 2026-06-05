const express = require('express');
const router = express.Router();
const auditController = require('../../controllers/admin/auditController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// All audit routes require authentication
router.use(authenticateToken);

// Get audit logs with filtering and pagination
router.get('/', auditController.getAuditLogs);

// Get available actions for filter
router.get('/actions', auditController.getActions);

// Get available users for filter
router.get('/users', auditController.getUsers);

// Get available complaints for filter
router.get('/complaints', auditController.getComplaintIds);

module.exports = router;
