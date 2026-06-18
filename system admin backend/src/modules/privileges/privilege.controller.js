const db = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const privilegeSelect = `
  SELECT
    id,
    code,
    name,
    description,
    module,
    status,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM privileges
`;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function makeCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function validateStatus(status) {
  if (status !== undefined && !['Active', 'Inactive'].includes(status)) {
    throw new ApiError(400, 'Status must be Active or Inactive');
  }
}

function validateCreate(body) {
  const required = ['name'];
  const missing = required.filter((field) => !normalizeString(body[field]));
  if (missing.length > 0) {
    throw new ApiError(400, `Missing required field(s): ${missing.join(', ')}`);
  }
  validateStatus(body.status);
}

const listPrivileges = asyncHandler(async (req, res) => {
  const { search = '', status = '', module = '' } = req.query;
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${String(search).trim()}%`);
    conditions.push(`(code ILIKE $${values.length} OR name ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (module) {
    values.push(module);
    conditions.push(`module = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(`${privilegeSelect} ${whereClause} ORDER BY module ASC, name ASC`, values);

  res.json({ success: true, data: result.rows });
});

const getPrivilegeById = asyncHandler(async (req, res) => {
  const result = await db.query(`${privilegeSelect} WHERE id = $1`, [req.params.id]);

  if (result.rowCount === 0) {
    throw new ApiError(404, 'Privilege not found');
  }

  res.json({ success: true, data: result.rows[0] });
});

const createPrivilege = asyncHandler(async (req, res) => {
  const body = {
    code: makeCode(req.body.code || req.body.name),
    name: normalizeString(req.body.name),
    description: normalizeString(req.body.description),
    module: makeCode(req.body.module || 'general'),
    status: req.body.status || 'Active',
  };

  validateCreate(body);

  if (!body.code) {
    throw new ApiError(400, 'Privilege code is required');
  }

  try {
    const result = await db.query(
      `INSERT INTO privileges (code, name, description, module, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, code, name, description, module, status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [body.code, body.name, body.description || null, body.module, body.status],
    );

    res.status(201).json({ success: true, message: 'Privilege created successfully', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'Privilege code already exists');
    }
    throw error;
  }
});

const updatePrivilege = asyncHandler(async (req, res) => {
  const existing = await db.query('SELECT id FROM privileges WHERE id = $1', [req.params.id]);
  if (existing.rowCount === 0) {
    throw new ApiError(404, 'Privilege not found');
  }

  const body = {
    code: req.body.code !== undefined ? makeCode(req.body.code) : undefined,
    name: normalizeString(req.body.name),
    description: normalizeString(req.body.description),
    module: req.body.module !== undefined ? makeCode(req.body.module || 'general') : undefined,
    status: req.body.status,
  };

  validateStatus(body.status);

  const fields = [];
  const values = [];

  function addField(column, value) {
    if (value !== undefined) {
      values.push(value === '' ? null : value);
      fields.push(`${column} = $${values.length}`);
    }
  }

  addField('code', body.code);
  addField('name', body.name);
  addField('description', body.description);
  addField('module', body.module);
  addField('status', body.status);

  if (fields.length === 0) {
    throw new ApiError(400, 'No fields provided to update');
  }

  values.push(req.params.id);

  try {
    const result = await db.query(
      `UPDATE privileges SET ${fields.join(', ')} WHERE id = $${values.length}
       RETURNING id, code, name, description, module, status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      values,
    );

    res.json({ success: true, message: 'Privilege updated successfully', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'Privilege code already exists');
    }
    throw error;
  }
});

const deletePrivilege = asyncHandler(async (req, res) => {
  const result = await db.query('DELETE FROM privileges WHERE id = $1 RETURNING id', [req.params.id]);

  if (result.rowCount === 0) {
    throw new ApiError(404, 'Privilege not found');
  }

  res.json({ success: true, message: 'Privilege deleted successfully' });
});

module.exports = {
  listPrivileges,
  getPrivilegeById,
  createPrivilege,
  updatePrivilege,
  deletePrivilege,
};
