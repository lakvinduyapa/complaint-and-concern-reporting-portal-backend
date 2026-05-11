const express = require("express");

const router = express.Router();

const {
  getStatusOptions,
  updateComplaintStatus,
  addInvestigationNote,
  getInvestigationNotes
} = require("../../controllers/admin/statusController");
const { authenticateToken } = require("../../middleware/authMiddleware");

router.get("/options", authenticateToken, getStatusOptions);
router.patch("/:id", authenticateToken, updateComplaintStatus);

// Investigation Notes Routes
router.post("/:id/notes", authenticateToken, addInvestigationNote);
router.get("/:id/notes", authenticateToken, getInvestigationNotes);

module.exports = router;
