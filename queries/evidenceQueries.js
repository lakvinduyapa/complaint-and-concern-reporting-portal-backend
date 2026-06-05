const pool = require("../config/db");

// CREATE EVIDENCE
const createEvidence = async (data) => {
  const {
    complaintId,
    evidenceType,
    originalFileName,
    storedFileName,
    filePath,
    mimeType,
    fileSize,
    uploadedBy = "Public User",
    isConfidential = true,
    verificationStatus = "Pending",
    notes,
  } = data;

  const result = await pool.query(
    `INSERT INTO evidence
      (
        complaint_id,
        evidence_type,
        original_file_name,
        stored_file_name,
        file_path,
        mime_type,
        file_size,
        uploaded_by,
        is_confidential,
        verification_status,
        notes
      )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      complaintId,
      evidenceType,
      originalFileName,
      storedFileName,
      filePath,
      mimeType,
      fileSize,
      uploadedBy,
      isConfidential,
      verificationStatus,
      notes,
    ]
  );

  return result.rows[0];
};

// GET ALL EVIDENCE BY COMPLAINT ID
const getEvidenceByComplaintId = async (complaintId) => {
  const result = await pool.query(
    `SELECT * FROM evidence WHERE complaint_id = $1 ORDER BY created_at DESC`,
    [complaintId]
  );

  return result.rows;
};

// GET SINGLE EVIDENCE BY ID
const getEvidenceById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM evidence WHERE id = $1`,
    [id]
  );

  return result.rows[0];
};

// UPDATE VERIFICATION STATUS
const updateVerificationStatus = async (id, status) => {
  const result = await pool.query(
    `UPDATE evidence
     SET verification_status = $1
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );

  return result.rows[0];
};

// DELETE EVIDENCE
const deleteEvidence = async (id) => {
  const result = await pool.query(
    `DELETE FROM evidence WHERE id = $1 RETURNING *`,
    [id]
  );

  return result.rows[0];
};

module.exports = {
  createEvidence,
  getEvidenceByComplaintId,
  getEvidenceById,
  updateVerificationStatus,
  deleteEvidence,
};