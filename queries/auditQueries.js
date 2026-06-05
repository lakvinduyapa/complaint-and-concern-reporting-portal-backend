const pool = require("../config/db");

// ===============================
// CREATE AUDIT LOG
// ===============================
const createAuditLog = async (data) => {
  const {
    complaintId,
    userId,
    action,
    details,
    ipAddress,
    userAgent,
  } = data;

  const result = await pool.query(
    `INSERT INTO audit_logs (
      complaint_id,
      user_id,
      action,
      details,
      ip_address,
      user_agent
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      complaintId || null,
      userId || null,
      action,
      details || null,
      ipAddress || null,
      userAgent || null,
    ]
  );

  return result.rows[0];
};

// ===============================
// GET ALL AUDIT LOGS
// ===============================
const getAllAuditLogs = async () => {
  const result = await pool.query(`
    SELECT
      al.id,
      al.complaint_id,
      al.user_id,
      al.action,
      al.details,
      al.ip_address,
      al.user_agent,
      al.performed_at,

      u.full_name,
      u.role,

      c.crn

    FROM audit_logs al

    LEFT JOIN users u
      ON al.user_id = u.id

    LEFT JOIN complaints c
      ON al.complaint_id = c.id

    ORDER BY al.performed_at DESC
  `);

  return result.rows;
};
// ===============================
// GET AUDIT LOG BY ID
// ===============================
const getAuditLogById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM audit_logs WHERE id = $1`,
    [id]
  );

  return result.rows[0];
};

// ===============================
// GET LOGS BY USER
// ===============================
const getAuditLogsByUser = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM audit_logs 
     WHERE user_id = $1 
     ORDER BY performed_at DESC`,
    [userId]
  );

  return result.rows;
};

// ===============================
// GET LOGS BY COMPLAINT
// ===============================
const getAuditLogsByComplaint = async (complaintId) => {
  const result = await pool.query(
    `SELECT * FROM audit_logs 
     WHERE complaint_id = $1 
     ORDER BY performed_at DESC`,
    [complaintId]
  );

  return result.rows;
};

// ===============================
// DELETE AUDIT LOG (optional admin use)
// ===============================
const deleteAuditLog = async (id) => {
  const result = await pool.query(
    `DELETE FROM audit_logs 
     WHERE id = $1 
     RETURNING *`,
    [id]
  );

  return result.rows[0];
};

// ===============================
// EXPORT ALL FUNCTIONS
// ===============================
module.exports = {
  createAuditLog,
  create: createAuditLog,
  getAllAuditLogs,
  getAuditLogById,
  getAuditLogsByUser,
  getAuditLogsByComplaint,
  deleteAuditLog,
};