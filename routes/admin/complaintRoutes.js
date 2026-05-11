const express = require("express");

const router = express.Router();

const {
  getComplaints,
  getComplaintById
} = require("../../controllers/admin/complaintController");
const { authenticateToken } = require("../../middleware/authMiddleware");

router.get("/", authenticateToken, getComplaints);
router.get("/:id", authenticateToken, getComplaintById);

module.exports = router;