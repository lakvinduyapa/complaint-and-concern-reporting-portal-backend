const express = require("express");

const router = express.Router();

const upload = require("../../config/multer");

const {
  uploadEvidence
} = require("../../controllers/public/evidenceController");


// ========================================
// Upload Evidence Route
// ========================================

router.post(

  "/upload",

  upload.single("file"),

  uploadEvidence

);


module.exports = router;