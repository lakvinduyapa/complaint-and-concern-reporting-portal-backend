const express = require("express");
const router = express.Router();
const db = require("../config/db");


//  CREATE complaint
router.post("/", (req, res) => {
  const {
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
    senior_names
  } = req.body;

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
      senior_names
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
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
      senior_names
    ],
    (err, result) => {
      if (err) {
        console.error(" DB ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        message: "Complaint saved successfully ",
        id: result.insertId
      });
    }
  );
});


// GET ALL complaints
router.get("/", (req, res) => {
  const sql = "SELECT * FROM complaints ORDER BY id DESC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error(" DB ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
});


// GET complaint by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "SELECT * FROM complaints WHERE id = ?";

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("DB ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Complaint not found ❌" });
    }

    res.json(results[0]);
  });
});


// DELETE complaint
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM complaints WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error(" DB ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json({ message: "Complaint deleted successfully 🗑️" });
  });
});


// UPDATE complaint
router.put("/:id", (req, res) => {
  const { id } = req.params;

  const {
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
    senior_names
  } = req.body;

  const sql = `
    UPDATE complaints SET
      crn = ?,
      submission_type = ?,
      reporter_category = ?,
      complaint_category = ?,
      incident_date = ?,
      location = ?,
      frequency = ?,
      description = ?,
      awareness_method = ?,
      reported_before = ?,
      previous_outcome = ?,
      involves_senior = ?,
      senior_names = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
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
      id
    ],
    (err, result) => {
      if (err) {
        console.error("DB ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      res.json({
        message: "Complaint updated successfully"
      });
    }
  );
});




module.exports = router;