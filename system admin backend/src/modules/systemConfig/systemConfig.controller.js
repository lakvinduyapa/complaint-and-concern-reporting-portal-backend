const db = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const groupSelect = `
  SELECT
    id,
    code,
    name,
    description,
    portal_section AS "portalSection",
    input_type AS "inputType",
    status,
    sort_order AS "sortOrder",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM system_config_groups
`;

const optionSelect = `
  SELECT
    o.id,
    o.group_id AS "groupId",
    g.code AS "groupCode",
    g.name AS "groupName",
    o.code,
    o.label,
    o.description,
    o.status,
    o.sort_order AS "sortOrder",
    o.created_at AS "createdAt",
    o.updated_at AS "updatedAt"
  FROM system_config_options o
  JOIN system_config_groups g ON g.id = o.group_id
`;

const emailTemplateSelect = `
  SELECT
    id,
    template_key AS "templateKey",
    name,
    description,
    subject,
    body,
    available_variables AS "availableVariables",
    status,
    sort_order AS "sortOrder",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM email_templates
`;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function makeCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function validateStatus(status) {
  if (status !== undefined && !['Active', 'Inactive'].includes(status)) {
    throw new ApiError(400, 'Status must be Active or Inactive');
  }
}

function validateInputType(inputType) {
  const allowed = ['Dropdown', 'Radio Button', 'Checkbox', 'Button', 'Multi-select', 'Textarea Settings', 'File Upload Settings'];
  if (inputType !== undefined && !allowed.includes(inputType)) {
    throw new ApiError(400, `Input type must be one of: ${allowed.join(', ')}`);
  }
}

async function findGroupId({ groupId, groupCode }) {
  if (groupId) return groupId;
  const code = makeCode(groupCode || 'admin_setting');
  const result = await db.query('SELECT id FROM system_config_groups WHERE code = $1', [code]);
  if (result.rowCount === 0) {
    throw new ApiError(400, `Configuration group not found: ${code}`);
  }
  return result.rows[0].id;
}

const listGroups = asyncHandler(async (req, res) => {
  const { search = '', status = '', portalSection = '', includeOptions = 'false' } = req.query;
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

  if (portalSection) {
    values.push(portalSection);
    conditions.push(`portal_section = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const groups = await db.query(`${groupSelect} ${whereClause} ORDER BY sort_order ASC, name ASC`, values);

  if (String(includeOptions).toLowerCase() !== 'true') {
    res.json({ success: true, data: groups.rows });
    return;
  }

  const options = await db.query(`${optionSelect} ORDER BY g.sort_order ASC, o.sort_order ASC, o.label ASC`);
  const optionsByGroup = options.rows.reduce((acc, option) => {
    acc[option.groupId] = acc[option.groupId] || [];
    acc[option.groupId].push(option);
    return acc;
  }, {});

  res.json({
    success: true,
    data: groups.rows.map((group) => ({ ...group, options: optionsByGroup[group.id] || [] })),
  });
});

const createGroup = asyncHandler(async (req, res) => {
  const body = {
    code: makeCode(req.body.code || req.body.name),
    name: normalizeString(req.body.name),
    description: normalizeString(req.body.description),
    portalSection: normalizeString(req.body.portalSection || 'System Administration'),
    inputType: normalizeString(req.body.inputType || 'Dropdown'),
    status: req.body.status || 'Active',
    sortOrder: Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0,
  };

  if (!body.name) throw new ApiError(400, 'Group name is required');
  if (!body.code) throw new ApiError(400, 'Group code is required');
  validateStatus(body.status);
  validateInputType(body.inputType);

  try {
    const result = await db.query(
      `INSERT INTO system_config_groups (code, name, description, portal_section, input_type, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, code, name, description, portal_section AS "portalSection", input_type AS "inputType", status, sort_order AS "sortOrder", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [body.code, body.name, body.description || null, body.portalSection, body.inputType, body.status, body.sortOrder],
    );
    res.status(201).json({ success: true, message: 'Configuration group created successfully', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'Configuration group code already exists');
    throw error;
  }
});

const updateGroup = asyncHandler(async (req, res) => {
  const existing = await db.query('SELECT id FROM system_config_groups WHERE id = $1', [req.params.id]);
  if (existing.rowCount === 0) throw new ApiError(404, 'Configuration group not found');

  const body = {
    code: req.body.code !== undefined ? makeCode(req.body.code) : undefined,
    name: normalizeString(req.body.name),
    description: normalizeString(req.body.description),
    portalSection: normalizeString(req.body.portalSection),
    inputType: normalizeString(req.body.inputType),
    status: req.body.status,
    sortOrder: req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : undefined,
  };

  validateStatus(body.status);
  validateInputType(body.inputType);

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
  addField('portal_section', body.portalSection);
  addField('input_type', body.inputType);
  addField('status', body.status);
  addField('sort_order', body.sortOrder);

  if (fields.length === 0) throw new ApiError(400, 'No fields provided to update');

  values.push(req.params.id);

  try {
    const result = await db.query(
      `UPDATE system_config_groups SET ${fields.join(', ')} WHERE id = $${values.length}
       RETURNING id, code, name, description, portal_section AS "portalSection", input_type AS "inputType", status, sort_order AS "sortOrder", created_at AS "createdAt", updated_at AS "updatedAt"`,
      values,
    );
    res.json({ success: true, message: 'Configuration group updated successfully', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'Configuration group code already exists');
    throw error;
  }
});

const deleteGroup = asyncHandler(async (req, res) => {
  const result = await db.query('DELETE FROM system_config_groups WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rowCount === 0) throw new ApiError(404, 'Configuration group not found');
  res.json({ success: true, message: 'Configuration group deleted successfully' });
});

const listOptions = asyncHandler(async (req, res) => {
  const { groupCode = '', groupId = '', search = '', status = '' } = req.query;
  const values = [];
  const conditions = [];

  if (groupCode) {
    values.push(makeCode(groupCode));
    conditions.push(`g.code = $${values.length}`);
  }

  if (groupId) {
    values.push(groupId);
    conditions.push(`o.group_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${String(search).trim()}%`);
    conditions.push(`(o.code ILIKE $${values.length} OR o.label ILIKE $${values.length} OR o.description ILIKE $${values.length})`);
  }

  if (status) {
    values.push(status);
    conditions.push(`o.status = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(`${optionSelect} ${whereClause} ORDER BY g.sort_order ASC, o.sort_order ASC, o.label ASC`, values);
  res.json({ success: true, data: result.rows });
});

const getOptionsByGroupCode = asyncHandler(async (req, res) => {
  const group = await db.query(`${groupSelect} WHERE code = $1`, [makeCode(req.params.groupCode)]);
  if (group.rowCount === 0) throw new ApiError(404, 'Configuration group not found');

  const options = await db.query(`${optionSelect} WHERE g.code = $1 ORDER BY o.sort_order ASC, o.label ASC`, [makeCode(req.params.groupCode)]);
  res.json({ success: true, data: { group: group.rows[0], options: options.rows } });
});

const createOption = asyncHandler(async (req, res) => {
  const body = {
    groupId: req.body.groupId,
    groupCode: req.body.groupCode || 'admin_setting',
    code: makeCode(req.body.code || req.body.label),
    label: normalizeString(req.body.label || req.body.name),
    description: normalizeString(req.body.description),
    status: req.body.status || 'Active',
    sortOrder: Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0,
  };

  if (!body.label) throw new ApiError(400, 'Option label is required');
  if (!body.code) throw new ApiError(400, 'Option code is required');
  validateStatus(body.status);

  const groupId = await findGroupId(body);

  try {
    const result = await db.query(
      `INSERT INTO system_config_options (group_id, code, label, description, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [groupId, body.code, body.label, body.description || null, body.status, body.sortOrder],
    );
    const created = await db.query(`${optionSelect} WHERE o.id = $1`, [result.rows[0].id]);
    res.status(201).json({ success: true, message: 'Configuration option created successfully', data: created.rows[0] });
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'Option code already exists in this group');
    throw error;
  }
});

const updateOption = asyncHandler(async (req, res) => {
  const existing = await db.query('SELECT id FROM system_config_options WHERE id = $1', [req.params.id]);
  if (existing.rowCount === 0) throw new ApiError(404, 'Configuration option not found');

  const body = {
    groupId: req.body.groupId,
    groupCode: req.body.groupCode,
    code: req.body.code !== undefined ? makeCode(req.body.code) : undefined,
    label: normalizeString(req.body.label || req.body.name),
    description: normalizeString(req.body.description),
    status: req.body.status,
    sortOrder: req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : undefined,
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

  if (body.groupId !== undefined || body.groupCode !== undefined) {
    const groupId = await findGroupId(body);
    addField('group_id', groupId);
  }

  addField('code', body.code);
  addField('label', body.label);
  addField('description', body.description);
  addField('status', body.status);
  addField('sort_order', body.sortOrder);

  if (fields.length === 0) throw new ApiError(400, 'No fields provided to update');

  values.push(req.params.id);

  try {
    await db.query(`UPDATE system_config_options SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
    const updated = await db.query(`${optionSelect} WHERE o.id = $1`, [req.params.id]);
    res.json({ success: true, message: 'Configuration option updated successfully', data: updated.rows[0] });
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'Option code already exists in this group');
    throw error;
  }
});

const deleteOption = asyncHandler(async (req, res) => {
  const result = await db.query('DELETE FROM system_config_options WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rowCount === 0) throw new ApiError(404, 'Configuration option not found');
  res.json({ success: true, message: 'Configuration option deleted successfully' });
});


const listEmailTemplates = asyncHandler(async (req, res) => {
  const { search = '', status = '' } = req.query;
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${String(search).trim()}%`);
    conditions.push(`(template_key ILIKE $${values.length} OR name ILIKE $${values.length} OR subject ILIKE $${values.length} OR body ILIKE $${values.length})`);
  }

  if (status) {
    validateStatus(status);
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(`${emailTemplateSelect} ${whereClause} ORDER BY sort_order ASC, name ASC`, values);
  res.json({ success: true, data: result.rows });
});

const createEmailTemplate = asyncHandler(async (req, res) => {
  const body = {
    templateKey: makeCode(req.body.templateKey || req.body.key || req.body.name),
    name: normalizeString(req.body.name),
    description: normalizeString(req.body.description),
    subject: normalizeString(req.body.subject),
    body: normalizeString(req.body.body),
    availableVariables: normalizeString(req.body.availableVariables || '{{userName}}, {{actionDate}}, {{adminContact}}'),
    status: req.body.status || 'Active',
    sortOrder: Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0,
  };

  if (!body.templateKey) throw new ApiError(400, 'Template key is required');
  if (!body.name) throw new ApiError(400, 'Template name is required');
  if (!body.subject) throw new ApiError(400, 'Email subject is required');
  if (!body.body) throw new ApiError(400, 'Email body is required');
  validateStatus(body.status);

  try {
    const result = await db.query(
      `INSERT INTO email_templates (template_key, name, description, subject, body, available_variables, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [body.templateKey, body.name, body.description || null, body.subject, body.body, body.availableVariables || null, body.status, body.sortOrder],
    );
    const created = await db.query(`${emailTemplateSelect} WHERE id = $1`, [result.rows[0].id]);
    res.status(201).json({ success: true, message: 'Email template created successfully', data: created.rows[0] });
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'Email template key already exists');
    throw error;
  }
});

const updateEmailTemplate = asyncHandler(async (req, res) => {
  const existing = await db.query('SELECT id FROM email_templates WHERE id = $1', [req.params.id]);
  if (existing.rowCount === 0) throw new ApiError(404, 'Email template not found');

  const body = {
    templateKey: req.body.templateKey !== undefined ? makeCode(req.body.templateKey) : undefined,
    name: normalizeString(req.body.name),
    description: normalizeString(req.body.description),
    subject: normalizeString(req.body.subject),
    body: normalizeString(req.body.body),
    availableVariables: normalizeString(req.body.availableVariables),
    status: req.body.status,
    sortOrder: req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : undefined,
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

  addField('template_key', body.templateKey);
  addField('name', body.name);
  addField('description', body.description);
  addField('subject', body.subject);
  addField('body', body.body);
  addField('available_variables', body.availableVariables);
  addField('status', body.status);
  addField('sort_order', body.sortOrder);

  if (fields.length === 0) throw new ApiError(400, 'No fields provided to update');

  values.push(req.params.id);
  try {
    await db.query(`UPDATE email_templates SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
    const updated = await db.query(`${emailTemplateSelect} WHERE id = $1`, [req.params.id]);
    res.json({ success: true, message: 'Email template updated successfully', data: updated.rows[0] });
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'Email template key already exists');
    throw error;
  }
});

const deleteEmailTemplate = asyncHandler(async (req, res) => {
  const result = await db.query('DELETE FROM email_templates WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rowCount === 0) throw new ApiError(404, 'Email template not found');
  res.json({ success: true, message: 'Email template deleted successfully' });
});

module.exports = {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  listOptions,
  getOptionsByGroupCode,
  createOption,
  updateOption,
  deleteOption,
  listEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
};
