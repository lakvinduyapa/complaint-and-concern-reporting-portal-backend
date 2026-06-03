const pool = require("../config/db");

const rawQuery = async (query, values = []) => pool.query(query, values);

// CREATE COMPLAINT
const createComplaint = async (data) => {
  const {
    crn,
    category,
    reporterFullName = null,
    incidentDate,
    incidentEndDate,
    incidentLocation,
    frequency,
    awarenessMethod,
    description,
    previouslyReported,
    previousReportedTo,
    previousReportOutcome,
    currentStatus = "Submitted",
    escalationRequired,
    ciabocEscalation,
    escalationReason,
    escalationDate,
    escalationApprovedBy,
    evidenceCount,
    hasEvidence,
    isAnonymous,
    submissionSource,
    assignedTo,
    investigationStartDate,
    expectedCompletionDate,
  } = data;

  const result = await pool.query(
    `INSERT INTO complaints (
      crn, category, reporter_full_name,
      incident_date, incident_end_date, incident_location,
      frequency, awareness_method,
      description,
      previously_reported, previous_reported_to, previous_report_outcome,
      current_status,
      escalation_required, ciaboc_escalation,
      escalation_reason, escalation_date, escalation_approved_by,
      evidence_count, has_evidence,
      is_anonymous,
      submission_source,
      assigned_to,
      investigation_start_date,
      expected_completion_date
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25
    )
    RETURNING *`,
    [
      crn,
      category,
      reporterFullName,
      incidentDate,
      incidentEndDate,
      incidentLocation,
      frequency,
      awarenessMethod,
      description,
      previouslyReported,
      previousReportedTo,
      previousReportOutcome,
      currentStatus,
      escalationRequired,
      ciabocEscalation,
      escalationReason,
      escalationDate,
      escalationApprovedBy,
      evidenceCount,
      hasEvidence,
      isAnonymous,
      submissionSource,
      assignedTo,
      investigationStartDate,
      expectedCompletionDate,
    ]
  );

  return result.rows[0];
};

// GET ALL WITH REAL EVIDENCE COUNT + ASSIGNED OFFICER
const getAllComplaints = async () => {
  const result = await pool.query(`
    SELECT
      c.*,
      COUNT(e.id)::integer AS actual_evidence_count,
      u.full_name AS assigned_officer_name,
      u.email AS assigned_officer_email,
      u.role AS assigned_officer_role
    FROM complaints c
    LEFT JOIN evidence e
      ON e.complaint_id = c.id
    LEFT JOIN users u
      ON c.assigned_to = u.id
    GROUP BY c.id, u.id, u.full_name, u.email, u.role
    ORDER BY c.created_at DESC
  `);

  return result.rows;
};

// GET BY ID WITH REAL EVIDENCE COUNT + ASSIGNED OFFICER
const getComplaintById = async (id) => {
  const result = await pool.query(
    `SELECT
      c.*,
      COUNT(e.id)::integer AS actual_evidence_count,
      u.full_name AS assigned_officer_name,
      u.email AS assigned_officer_email,
      u.role AS assigned_officer_role
    FROM complaints c
    LEFT JOIN evidence e
      ON e.complaint_id = c.id
    LEFT JOIN users u
      ON c.assigned_to = u.id
    WHERE c.id = $1
    GROUP BY c.id, u.id, u.full_name, u.email, u.role`,
    [id]
  );

  return result.rows[0];
};

const getById = getComplaintById;

const getByCRN = async (crn) => {
  const result = await pool.query(
    `SELECT
      c.*,
      COUNT(e.id)::integer AS actual_evidence_count,
      u.full_name AS assigned_officer_name,
      u.email AS assigned_officer_email,
      u.role AS assigned_officer_role
    FROM complaints c
    LEFT JOIN evidence e
      ON e.complaint_id = c.id
    LEFT JOIN users u
      ON c.assigned_to = u.id
    WHERE c.crn = $1
    GROUP BY c.id, u.id, u.full_name, u.email, u.role`,
    [crn]
  );

  return result.rows[0];
};

const updateStatus = async (id, data) => {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(data)) {
    values.push(value);
    fields.push(`${key} = $${values.length}`);
  }

  if (fields.length === 0) {
    return getComplaintById(id);
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE complaints
     SET ${fields.join(", ")}
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );

  return result.rows[0];
};

const updateInvestigationTimeline = async (id, data) => {
  const result = await pool.query(
    `UPDATE complaints
     SET investigation_start_date = $1,
         expected_completion_date = $2
     WHERE id = $3
     RETURNING *`,
    [
      data.investigation_start_date || null,
      data.expected_completion_date || null,
      id,
    ]
  );

  return result.rows[0];
};

const createReporter = async (data) => {
  const result = await pool.query(
    `INSERT INTO reporters (
      complaint_id,
      submission_type,
      reporter_category,
      full_name,
      employee_id,
      department,
      designation,
      email,
      phone,
      preferred_contact_method
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      data.complaint_id,
      data.submission_type,
      data.reporter_category,
      data.full_name,
      data.employee_id,
      data.department,
      data.designation,
      data.email,
      data.phone,
      data.preferred_contact_method,
    ]
  );

  return result.rows[0];
};

const createSubject = async (data) => {
  const result = await pool.query(
    `INSERT INTO complaint_subjects (
      complaint_id,
      full_name,
      designation,
      organisation,
      relationship,
      senior_management_involved,
      senior_management_person_name
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
    [
      data.complaint_id,
      data.full_name,
      data.designation,
      data.organisation,
      data.relationship,
      data.senior_management_involved,
      data.senior_management_person_name,
    ]
  );

  return result.rows[0];
};

const addStatusHistory = async (data) => {
  const result = await pool.query(
    `INSERT INTO complaint_status_history (
      complaint_id,
      status,
      note,
      updated_by
    )
    VALUES ($1,$2,$3,$4)
    RETURNING *`,
    [data.complaint_id, data.status, data.note, data.updated_by]
  );

  return result.rows[0];
};

const addInvestigationNote = async (data) => {
  const result = await pool.query(
    `INSERT INTO complaint_investigation_notes (
      complaint_id,
      note,
      added_by,
      is_confidential
    )
    VALUES ($1,$2,$3,$4)
    RETURNING *`,
    [data.complaint_id, data.note, data.added_by, data.is_confidential]
  );

  return result.rows[0];
};

const getInvestigationNotes = async (complaintId) => {
  const result = await pool.query(
    `SELECT *
     FROM complaint_investigation_notes
     WHERE complaint_id = $1
     ORDER BY created_at DESC`,
    [complaintId]
  );

  return result.rows;
};

const getStatusHistory = async (complaintId) => {
  const result = await pool.query(
    `SELECT *
     FROM complaint_status_history
     WHERE complaint_id = $1
     ORDER BY created_at DESC`,
    [complaintId]
  );

  return result.rows;
};

module.exports = {
  rawQuery,
  createComplaint,
  createReporter,
  createSubject,
  addStatusHistory,
  addInvestigationNote,
  getInvestigationNotes,
  getStatusHistory,
  getAllComplaints,
  getComplaintById,
  getById,
  getByCRN,
  updateStatus,
  updateInvestigationTimeline,
};