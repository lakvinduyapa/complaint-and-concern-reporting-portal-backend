const pool = require("../config/db");

// CREATE USER
const createUser = async ({
  fullName,
  email,
  password,
  role = "IAU Officer",
  department = "Internal Audit Unit",
  isActive = true,
}) => {
  const result = await pool.query(
    `INSERT INTO users 
      (full_name, email, password, role, department, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [fullName, email.toLowerCase(), password, role, department, isActive]
  );

  return result.rows[0];
};

// GET USER BY EMAIL
const getUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE LOWER(email) = $1`,
    [email.toLowerCase()]
  );

  return result.rows[0];
};

// GET USER BY ID
const getUserById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE id = $1`,
    [id]
  );

  return result.rows[0];
};

// UPDATE LAST LOGIN
const updateLastLogin = async (id) => {
  const result = await pool.query(
    `UPDATE users 
     SET last_login = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  return result.rows[0];
};

// UPDATE USER STATUS (ACTIVE/INACTIVE)
const updateUserStatus = async (id, isActive) => {
  const result = await pool.query(
    `UPDATE users 
     SET is_active = $1
     WHERE id = $2
     RETURNING *`,
    [isActive, id]
  );

  return result.rows[0];
};

// GET ACTIVE ASSIGNABLE USERS
const getAssignableUsers = async () => {
  const result = await pool.query(
    `SELECT id, full_name, email, role
     FROM users
     WHERE is_active = true
     AND role IN ('officer', 'senior_investigator')
     ORDER BY full_name ASC`
  );

  return result.rows;
};



module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  updateLastLogin,
  updateUserStatus,
  getAssignableUsers,
};