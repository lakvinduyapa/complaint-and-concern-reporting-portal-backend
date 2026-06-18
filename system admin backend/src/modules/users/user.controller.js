const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const userSelect = `
  SELECT
    u.id,
    u.full_name AS "fullName",
    u.email,
    u.username,
    u.department,
    u.status,
    u.role_id AS "roleId",
    r.name AS role,
    u.last_login_at AS "lastLoginAt",
    u.created_at AS "createdAt",
    u.updated_at AS "updatedAt"
  FROM users u
  LEFT JOIN roles r ON r.id = u.role_id
`;

const deletedUserSelect = `
  SELECT
    id,
    original_user_id AS "originalUserId",
    full_name AS "fullName",
    email,
    username,
    department,
    role_id AS "roleId",
    role_name AS role,
    status_at_delete AS "statusAtDelete",
    deleted_reason AS "deletedReason",
    deleted_by AS "deletedBy",
    deleted_at AS "deletedAt"
  FROM deleted_users
`;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function validateStatus(status) {
  if (status !== undefined && !['Active', 'Inactive'].includes(status)) {
    throw new ApiError(400, 'Status must be Active or Inactive');
  }
}

function validateCreateUser(body) {
  const required = ['fullName', 'email', 'username'];
  const missing = required.filter((field) => !normalizeString(body[field]));
  if (missing.length > 0) {
    throw new ApiError(400, `Missing required field(s): ${missing.join(', ')}`);
  }

  if (!/^\S+@\S+\.\S+$/.test(String(body.email))) {
    throw new ApiError(400, 'Valid email is required');
  }

  validateStatus(body.status);
}

async function findRoleId({ roleId, role }) {
  if (roleId) return roleId;
  if (!role) return null;

  const result = await db.query('SELECT id FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1', [role]);
  if (result.rowCount === 0) {
    throw new ApiError(400, `Role not found: ${role}`);
  }
  return result.rows[0].id;
}

const listUsers = asyncHandler(async (req, res) => {
  const { search = '', status = '', role = '', page, limit } = req.query;
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${String(search).trim()}%`);
    conditions.push(`(u.full_name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR u.username ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    conditions.push(`u.status = $${values.length}`);
  }

  if (role) {
    values.push(role);
    conditions.push(`r.name = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  if (page !== undefined || limit !== undefined) {
    const safePage = Math.max(parseInt(String(page || '1'), 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(String(limit || '10'), 10) || 10, 1), 50);
    const offset = (safePage - 1) * safeLimit;

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM users u LEFT JOIN roles r ON r.id = u.role_id ${whereClause}`,
      values,
    );

    const pagedValues = [...values, safeLimit, offset];
    const result = await db.query(
      `${userSelect} ${whereClause} ORDER BY u.created_at DESC LIMIT $${pagedValues.length - 1} OFFSET $${pagedValues.length}`,
      pagedValues,
    );

    const total = countResult.rows[0]?.total || 0;
    res.json({
      success: true,
      data: {
        items: result.rows,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(Math.ceil(total / safeLimit), 1),
      },
    });
    return;
  }

  const result = await db.query(`${userSelect} ${whereClause} ORDER BY u.created_at DESC`, values);

  res.json({ success: true, data: result.rows });
});


const listDeletedUsers = asyncHandler(async (req, res) => {
  const { search = '', page, limit } = req.query;
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${String(search).trim()}%`);
    conditions.push(`(full_name ILIKE $${values.length} OR email ILIKE $${values.length} OR username ILIKE $${values.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  if (page !== undefined || limit !== undefined) {
    const safePage = Math.max(parseInt(String(page || '1'), 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(String(limit || '10'), 10) || 10, 1), 50);
    const offset = (safePage - 1) * safeLimit;

    const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM deleted_users ${whereClause}`, values);
    const pagedValues = [...values, safeLimit, offset];
    const result = await db.query(
      `${deletedUserSelect} ${whereClause} ORDER BY deleted_at DESC LIMIT $${pagedValues.length - 1} OFFSET $${pagedValues.length}`,
      pagedValues,
    );

    const total = countResult.rows[0]?.total || 0;
    res.json({
      success: true,
      data: {
        items: result.rows,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(Math.ceil(total / safeLimit), 1),
      },
    });
    return;
  }

  const result = await db.query(`${deletedUserSelect} ${whereClause} ORDER BY deleted_at DESC`, values);
  res.json({ success: true, data: result.rows });
});

const countDeletedUsers = asyncHandler(async (req, res) => {
  const result = await db.query('SELECT COUNT(*)::int AS total FROM deleted_users');
  res.json({ success: true, data: { total: result.rows[0]?.total || 0 } });
});

const getDeletedUserById = asyncHandler(async (req, res) => {
  const result = await db.query(`${deletedUserSelect} WHERE id = $1`, [req.params.id]);

  if (result.rowCount === 0) {
    throw new ApiError(404, 'Deleted user record not found');
  }

  res.json({ success: true, data: result.rows[0] });
});

const getUserById = asyncHandler(async (req, res) => {
  const result = await db.query(`${userSelect} WHERE u.id = $1`, [req.params.id]);

  if (result.rowCount === 0) {
    throw new ApiError(404, 'User not found');
  }

  res.json({ success: true, data: result.rows[0] });
});

const createUser = asyncHandler(async (req, res) => {
  const body = {
    fullName: normalizeString(req.body.fullName),
    email: normalizeString(req.body.email),
    username: normalizeString(req.body.username),
    password: req.body.password,
    department: normalizeString(req.body.department),
    roleId: req.body.roleId,
    role: normalizeString(req.body.role),
    status: req.body.status || 'Active',
  };

  validateCreateUser(body);
  const roleId = await findRoleId(body);
  const passwordHash = body.password ? await bcrypt.hash(String(body.password), 10) : null;

  try {
    const insert = await db.query(
      `INSERT INTO users (full_name, email, username, password_hash, department, role_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [body.fullName, body.email, body.username, passwordHash, body.department || null, roleId, body.status],
    );

    const created = await db.query(`${userSelect} WHERE u.id = $1`, [insert.rows[0].id]);
    res.status(201).json({ success: true, message: 'User created successfully', data: created.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'Email or username already exists');
    }
    throw error;
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const existing = await db.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
  if (existing.rowCount === 0) {
    throw new ApiError(404, 'User not found');
  }

  const body = {
    fullName: normalizeString(req.body.fullName),
    email: normalizeString(req.body.email),
    username: normalizeString(req.body.username),
    password: req.body.password,
    department: normalizeString(req.body.department),
    roleId: req.body.roleId,
    role: normalizeString(req.body.role),
    status: req.body.status,
  };

  validateStatus(body.status);

  if (body.email && !/^\S+@\S+\.\S+$/.test(String(body.email))) {
    throw new ApiError(400, 'Valid email is required');
  }

  const fields = [];
  const values = [];

  function addField(column, value) {
    if (value !== undefined) {
      values.push(value === '' ? null : value);
      fields.push(`${column} = $${values.length}`);
    }
  }

  addField('full_name', body.fullName);
  addField('email', body.email);
  addField('username', body.username);
  addField('department', body.department);
  addField('status', body.status);

  if (body.roleId !== undefined || body.role !== undefined) {
    const roleId = await findRoleId(body);
    addField('role_id', roleId);
  }

  if (body.password) {
    const passwordHash = await bcrypt.hash(String(body.password), 10);
    addField('password_hash', passwordHash);
  }

  if (fields.length === 0) {
    throw new ApiError(400, 'No fields provided to update');
  }

  values.push(req.params.id);

  try {
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
    const updated = await db.query(`${userSelect} WHERE u.id = $1`, [req.params.id]);
    res.json({ success: true, message: 'User updated successfully', data: updated.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'Email or username already exists');
    }
    throw error;
  }
});

const deleteUser = asyncHandler(async (req, res) => {
  const existing = await db.query(`${userSelect} WHERE u.id = $1`, [req.params.id]);

  if (existing.rowCount === 0) {
    throw new ApiError(404, 'User not found');
  }

  const user = existing.rows[0];
  const deletedReason = normalizeString(req.body?.deletedReason) || null;
  const deletedBy = normalizeString(req.body?.deletedBy) || null;

  await db.query('BEGIN');
  try {
    const deletedLog = await db.query(
      `INSERT INTO deleted_users
        (original_user_id, full_name, email, username, department, role_id, role_name, status_at_delete, deleted_reason, deleted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        user.id,
        user.fullName,
        user.email,
        user.username,
        user.department,
        user.roleId,
        user.role,
        user.status,
        deletedReason,
        deletedBy,
      ],
    );

    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    await db.query('COMMIT');

    const deleted = await db.query(`${deletedUserSelect} WHERE id = $1`, [deletedLog.rows[0].id]);

    res.json({
      success: true,
      message: 'User deleted permanently from active users and saved in deleted user history',
      data: deleted.rows[0],
    });
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
});

module.exports = {
  listUsers,
  listDeletedUsers,
  countDeletedUsers,
  getDeletedUserById,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
