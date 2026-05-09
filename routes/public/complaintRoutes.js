const express = require("express");

const router = express.Router();

const {
  createComplaint
} = require("../../controllers/public/complaintController");


// =======================================
// Create Complaint
// =======================================

router.post("/", createComplaint);


module.exports = router;