const express = require("express");
const router = express.Router();
const db = require("../config/db");

const multer = require("multer");
const path = require("path");

// ==============================
// MULTER CONFIG
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ==============================
// CREATE complaint
// ==============================
router.post("/", upload.single("evidence_file"), (req, res) => {
  const year = new Date().getFullYear();
  const crn = `IAU-${year}-${Math.floor(100000 + Math.random() * 900000)}`;

  const {
    submission_type,
    reporter_category,
    complaint_category,
    incident_date,
    location,
    frequency,
    description,
    awareness_method,
    reported_before,
    previous_outcome,
    involves_senior,
    senior_names
  } = req.body;

  const evidence_file = req.file ? req.file.filename : null;

  const sql = `
    INSERT INTO complaints (
      crn,
      submission_type,
      reporter_category,
      complaint_category,
      incident_date,
      location,
      frequency,
      description,
      awareness_method,
      reported_before,
      previous_outcome,
      involves_senior,
      senior_names,
      evidence_file
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    crn,
    submission_type,
    reporter_category,
    complaint_category,
    incident_date,
    location,
    frequency,
    description,
    awareness_method,
    reported_before,
    previous_outcome,
    involves_senior,
    senior_names,
    evidence_file
  ], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }

    res.json({
      message: "Saved successfully",
      crn: crn
    });
  });
});

module.exports = router;