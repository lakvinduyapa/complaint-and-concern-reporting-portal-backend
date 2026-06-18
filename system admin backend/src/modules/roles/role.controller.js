const db = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const roleSelect = `
  SELECT
    r.id,
    r.name,
    r.description,
    r.status,
    COUNT(rp.privilege_id)::int AS "privilegeCount",
    r.created_at AS "createdAt",
    r.updated_at AS "updatedAt"
  FROM roles r
  LEFT JOIN role_privileges rp ON rp.role_id = r.id
`;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function validateStatus(status) {
  if (status !== undefined && !['Active', 'Inactive'].includes(status)) {
    throw new ApiError(400, 'Status must be Active or Inactive');
  }
}

const listRoles = asyncHandler(async (req, res) => {
  const result = await db.query(`${roleSelect} GROUP BY r.id ORDER BY r.name ASC`);
  res.json({ success: true, data: result.rows });
});

const createRole = asyncHandler(async (req, res) => {
  const name = normalizeString(req.body.name);
  const description = normalizeString(req.body.description);
  const status = req.body.status || 'Active';

  if (!name) {
    throw new ApiError(400, 'Role name is required');
  }
  validateStatus(status);

  try {
    const result = await db.query(
      `INSERT INTO roles (name, description, status)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [name, description || null, status],
    );

    res.status(201).json({ success: true, message: 'Role created successfully', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'Role name already exists');
    }
    throw error;
  }
});

const updateRole = asyncHandler(async (req, res) => {
  const existing = await db.query('SELECT id FROM roles WHERE id = $1', [req.params.id]);
  if (existing.rowCount === 0) {
    throw new ApiError(404, 'Role not found');
  }

  const body = {
    name: normalizeString(req.body.name),
    description: normalizeString(req.body.description),
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

  addField('name', body.name);
  addField('description', body.description);
  addField('status', body.status);

  if (fields.length === 0) {
    throw new ApiError(400, 'No fields provided to update');
  }

  values.push(req.params.id);

  try {
    const result = await db.query(
      `UPDATE roles SET ${fields.join(', ')} WHERE id = $${values.length}
       RETURNING id, name, description, status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      values,
    );

    res.json({ success: true, message: 'Role updated successfully', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'Role name already exists');
    }
    throw error;
  }
});

const deleteRole = asyncHandler(async (req, res) => {
  const result = await db.query('DELETE FROM roles WHERE id = $1 RETURNING id', [req.params.id]);

  if (result.rowCount === 0) {
    throw new ApiError(404, 'Role not found');
  }

  res.json({ success: true, message: 'Role deleted successfully' });
});

const getRolePrivileges = asyncHandler(async (req, res) => {
  const role = await db.query('SELECT id, name FROM roles WHERE id = $1', [req.params.id]);
  if (role.rowCount === 0) {
    throw new ApiError(404, 'Role not found');
  }

  const privileges = await db.query(
    `SELECT p.id, p.code, p.name, p.description, p.module, p.status
     FROM role_privileges rp
     JOIN privileges p ON p.id = rp.privilege_id
     WHERE rp.role_id = $1
     ORDER BY p.module, p.name`,
    [req.params.id],
  );

  res.json({
    success: true,
    data: {
      role: role.rows[0],
      privileges: privileges.rows,
      privilegeCodes: privileges.rows.map((privilege) => privilege.code),
    },
  });
});

const updateRolePrivileges = asyncHandler(async (req, res) => {
  const role = await db.query('SELECT id, name FROM roles WHERE id = $1', [req.params.id]);
  if (role.rowCount === 0) {
    throw new ApiError(404, 'Role not found');
  }

  const privilegeIds = Array.isArray(req.body.privilegeIds) ? req.body.privilegeIds : null;
  const privilegeCodes = Array.isArray(req.body.privilegeCodes) ? req.body.privilegeCodes : null;

  if (!privilegeIds && !privilegeCodes) {
    throw new ApiError(400, 'Provide privilegeIds or privilegeCodes array');
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    let finalPrivilegeIds = privilegeIds || [];

    if (privilegeCodes) {
      const privileges = await client.query('SELECT id FROM privileges WHERE code = ANY($1)', [privilegeCodes]);
      if (privileges.rowCount !== privilegeCodes.length) {
        throw new ApiError(400, 'One or more privilege codes were not found');
      }
      finalPrivilegeIds = privileges.rows.map((row) => row.id);
    }

    await client.query('DELETE FROM role_privileges WHERE role_id = $1', [req.params.id]);

    for (const privilegeId of finalPrivilegeIds) {
      await client.query(
        `INSERT INTO role_privileges (role_id, privilege_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [req.params.id, privilegeId],
      );
    }

    await client.query('COMMIT');

    const updated = await db.query(
      `SELECT p.id, p.code, p.name, p.description, p.module, p.status
       FROM role_privileges rp
       JOIN privileges p ON p.id = rp.privilege_id
       WHERE rp.role_id = $1
       ORDER BY p.module, p.name`,
      [req.params.id],
    );

    res.json({
      success: true,
      message: 'Role privileges updated successfully',
      data: {
        role: role.rows[0],
        privileges: updated.rows,
        privilegeCodes: updated.rows.map((privilege) => privilege.code),
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

module.exports = {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  getRolePrivileges,
  updateRolePrivileges,
};
