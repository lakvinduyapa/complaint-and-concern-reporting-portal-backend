const express = require("express");

const router = express.Router();

const {
  trackComplaint
} = require("../../controllers/public/trackingController");


// ========================================
// Track Complaint Route
// ========================================

router.get("/:crn", trackComplaint);


module.exports = router;