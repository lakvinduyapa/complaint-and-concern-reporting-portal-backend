const Complaint = require("../../queries/complaintQueries");
const User = require("../../queries/userQueries");

const isCiabocComplaint = (complaint) =>
  complaint.ciaboc_escalation === true ||
  complaint.current_status === "Escalated to CIABOC";

const isInvalidDate = (date) => Number.isNaN(new Date(date).getTime());

// ========================================
// GET ALL COMPLAINTS (PAGINATED + FILTERS)
// ========================================
const getComplaints = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "10", 10), 1),
      100
    );
    const offset = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const status = (req.query.status || "").trim();

    // Supports both frontend names
    const startDate = (req.query.startDate || req.query.fromDate || "").trim();
    const endDate = (req.query.endDate || req.query.toDate || "").trim();

    if (startDate && isInvalidDate(startDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid start date",
      });
    }

    if (endDate && isInvalidDate(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid end date",
      });
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        return res.status(400).json({
          success: false,
          message: "Start date cannot be after end date",
        });
      }
    }

    let conditions = [];
    let values = [];

    const userRole = req.user?.role;
    const userId = req.user?.userId;

    if (userRole === "officer") {
      values.push(userId);
      conditions.push(`c.assigned_to = $${values.length}`);
    }

    if (userRole === "ciaboc") {
      conditions.push(`
        (c.ciaboc_escalation = true
        OR c.current_status = 'Escalated to CIABOC')
      `);
    } else {
      conditions.push(`
        NOT (
          c.ciaboc_escalation = true
          OR c.current_status = 'Escalated to CIABOC'
        )
      `);
    }

    if (status) {
      values.push(status);
      conditions.push(`c.current_status = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      const searchParam = `$${values.length}`;

      conditions.push(`
        (c.crn ILIKE ${searchParam}
        OR c.category ILIKE ${searchParam})
      `);
    }

    if (startDate) {
      values.push(startDate);
      conditions.push(`c.created_at >= $${values.length}::date`);
    }

    if (endDate) {
      values.push(endDate);
      conditions.push(
        `c.created_at <= $${values.length}::date + interval '1 day' - interval '1 millisecond'`
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        c.id,
        c.crn,
        c.category,
        c.current_status,
        c.created_at,
        c.is_anonymous,
        c.reporter_full_name,
        c.assigned_to,
        u.full_name AS assigned_officer_name
      FROM complaints c
      LEFT JOIN users u
        ON c.assigned_to = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*)
      FROM complaints c
      ${whereClause}
    `;

    const [itemsResult, countResult] = await Promise.all([
      Complaint.rawQuery(query, [...values, limit, offset]),
      Complaint.rawQuery(countQuery, values),
    ]);

    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

    return res.status(200).json({
      success: true,
      data: {
        items: itemsResult.rows,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get Complaints Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
    });
  }
};

// ========================================
// GET UNASSIGNED COMPLAINTS
// ========================================
const getUnassignedComplaints = async (req, res) => {
  try {
    const result = await Complaint.rawQuery(
      `
      SELECT 
        c.id,
        c.crn,
        c.category,
        c.current_status,
        c.created_at,
        c.is_anonymous,
        c.reporter_full_name,
        c.assigned_to
      FROM complaints c
      WHERE c.assigned_to IS NULL
        AND NOT (
          c.ciaboc_escalation = true
          OR c.current_status = 'Escalated to CIABOC'
        )
      ORDER BY c.created_at DESC
      `
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get Unassigned Complaints Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch unassigned complaints",
    });
  }
};

// ========================================
// GET COMPLAINT BY ID
// ========================================
const getComplaintById = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await Complaint.rawQuery(
      `
      SELECT
        c.*,
        r.submission_type AS reporter_submission_type,
        r.reporter_category AS reporter_category,
        r.full_name AS reporter_full_name_detail,
        r.employee_id AS reporter_employee_id,
        r.department AS reporter_department,
        r.designation AS reporter_designation,
        r.email AS reporter_email,
        r.phone AS reporter_phone,
        r.preferred_contact_method AS reporter_preferred_contact_method,
        u.full_name AS assigned_officer_name,
        u.email AS assigned_officer_email,
        u.role AS assigned_officer_role
      FROM complaints c
      LEFT JOIN reporters r
        ON r.complaint_id = c.id
      LEFT JOIN users u
        ON c.assigned_to = u.id
      WHERE c.id = $1
      `,
      [id]
    );

    const complaint = result.rows[0];

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (req.user?.role !== "ciaboc" && isCiabocComplaint(complaint)) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    console.error("Get Complaint By Id Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaint details",
    });
  }
};

// ========================================
// GET ASSIGNABLE OFFICERS
// ========================================
const getAssignableOfficers = async (req, res) => {
  try {
    const users = await User.getAssignableUsers();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get Assignable Officers Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assignable officers",
    });
  }
};

// ========================================
// ASSIGN COMPLAINT TO OFFICER
// ========================================
const assignComplaint = async (req, res) => {
  try {
    const userRole = req.user?.role;

    if (!["admin", "senior_investigator"].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to assign complaints",
      });
    }

    const complaintId = req.params.id;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: "Officer is required",
      });
    }

    const officer = await User.getUserById(assignedTo);

    if (!officer || officer.is_active !== true) {
      return res.status(404).json({
        success: false,
        message: "Officer not found or inactive",
      });
    }

    if (!["officer", "senior_investigator"].includes(officer.role)) {
      return res.status(400).json({
        success: false,
        message: "Selected user cannot be assigned complaints",
      });
    }

    const updatedComplaint = await Complaint.updateStatus(complaintId, {
      assigned_to: assignedTo,
    });

    return res.status(200).json({
      success: true,
      message: "Complaint assigned successfully",
      data: updatedComplaint,
    });
  } catch (error) {
    console.error("Assign Complaint Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to assign complaint",
    });
  }
};

module.exports = {
  getComplaints,
  getUnassignedComplaints,
  getComplaintById,
  getAssignableOfficers,
  assignComplaint,
};