const express = require("express");
const router = express.Router();

const upload = require("../config/multer");
const { createFullComplaint } = require("../controllers/complaintController");

// WITH FILE UPLOAD
router.post(
  "/full-submit",
  upload.array("files", 5), // max 5 files
  createFullComplaint
);


module.exports = router;