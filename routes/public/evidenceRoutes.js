const express = require("express");

const router = express.Router();

const upload = require("../../config/multer");

const {
  uploadEvidence,
  getEvidenceByComplaintId,
} = require("../../controllers/public/evidenceController");

// Upload Multiple Evidence Files
router.post(
  "/upload",
  upload.array("files", 5),
  uploadEvidence
);

// Get Evidence By Complaint ID
router.get(
  "/complaint/:complaintId",
  getEvidenceByComplaintId
);

module.exports = router;