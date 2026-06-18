const QRCode = require('qrcode');
const db = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const qrCodeSelect = `
  SELECT
    id,
    code,
    title,
    target_url AS "targetUrl",
    description,
    status,
    scan_count AS "scanCount",
    regenerate_count AS "regenerateCount",
    last_scan_at AS "lastScanAt",
    last_regenerated_at AS "lastRegeneratedAt",
    sort_order AS "sortOrder",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM qr_codes
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

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch (error) {
    throw new ApiError(400, 'Target URL must be a valid http or https URL');
  }
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

async function buildUniqueCode(baseValue) {
  const base = makeCode(baseValue || 'iau_qr') || 'iau_qr';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}_${randomSuffix()}`;
    const exists = await db.query('SELECT id FROM qr_codes WHERE code = $1', [candidate]);
    if (exists.rowCount === 0) return candidate;
  }
  return `${base}_${Date.now().toString(36)}_${randomSuffix()}`;
}

function getPublicApiBase(req) {
  return (process.env.PUBLIC_API_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function buildScanUrl(req, code) {
  return `${getPublicApiBase(req)}/api/qr-codes/scan/${encodeURIComponent(code)}`;
}

async function attachQrPreview(row, req) {
  const scanUrl = buildScanUrl(req, row.code);
  const qrDataUrl = await QRCode.toDataURL(scanUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 520,
  });

  return {
    ...row,
    scanUrl,
    qrDataUrl,
  };
}

async function getQrById(id, req) {
  const result = await db.query(`${qrCodeSelect} WHERE id = $1`, [id]);
  if (result.rowCount === 0) throw new ApiError(404, 'QR code not found');
  return attachQrPreview(result.rows[0], req);
}

const listQrCodes = asyncHandler(async (req, res) => {
  const { search = '', status = '' } = req.query;
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${String(search).trim()}%`);
    conditions.push(`(code ILIKE $${values.length} OR title ILIKE $${values.length} OR target_url ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }

  if (status) {
    validateStatus(status);
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(`${qrCodeSelect} ${whereClause} ORDER BY sort_order ASC, created_at DESC`, values);
  const data = await Promise.all(result.rows.map((row) => attachQrPreview(row, req)));

  res.json({ success: true, data });
});

const createQrCode = asyncHandler(async (req, res) => {
  const title = normalizeString(req.body.title || req.body.name);
  const targetUrl = normalizeString(req.body.targetUrl || req.body.target_url);
  const description = normalizeString(req.body.description);
  const status = req.body.status || 'Active';
  const sortOrder = Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0;
  const requestedCode = normalizeString(req.body.code);

  if (!title) throw new ApiError(400, 'QR title is required');
  if (!targetUrl) throw new ApiError(400, 'Target URL is required');
  validateUrl(targetUrl);
  validateStatus(status);

  const code = requestedCode ? makeCode(requestedCode) : await buildUniqueCode(title);
  if (!code) throw new ApiError(400, 'QR code value is required');

  try {
    const created = await db.query(
      `INSERT INTO qr_codes (code, title, target_url, description, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [code, title, targetUrl, description || null, status, sortOrder],
    );
    const data = await getQrById(created.rows[0].id, req);
    res.status(201).json({ success: true, message: 'QR code created successfully', data });
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'QR code already exists. Use another code or regenerate.');
    throw error;
  }
});

const updateQrCode = asyncHandler(async (req, res) => {
  const existing = await db.query('SELECT id FROM qr_codes WHERE id = $1', [req.params.id]);
  if (existing.rowCount === 0) throw new ApiError(404, 'QR code not found');

  const fields = [];
  const values = [];
  function addField(column, value) {
    if (value !== undefined) {
      values.push(value === '' ? null : value);
      fields.push(`${column} = $${values.length}`);
    }
  }

  if (req.body.code !== undefined) {
    const nextCode = makeCode(req.body.code);
    if (!nextCode) throw new ApiError(400, 'QR code value cannot be empty');
    addField('code', nextCode);
  }

  if (req.body.targetUrl !== undefined || req.body.target_url !== undefined) {
    const targetUrl = normalizeString(req.body.targetUrl || req.body.target_url);
    validateUrl(targetUrl);
    addField('target_url', targetUrl);
  }

  if (req.body.status !== undefined) validateStatus(req.body.status);

  addField('title', normalizeString(req.body.title || req.body.name));
  addField('description', normalizeString(req.body.description));
  addField('status', req.body.status);
  addField('sort_order', req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : undefined);

  if (fields.length === 0) throw new ApiError(400, 'No fields provided to update');

  values.push(req.params.id);
  try {
    await db.query(`UPDATE qr_codes SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
    const data = await getQrById(req.params.id, req);
    res.json({ success: true, message: 'QR code updated successfully', data });
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'QR code already exists. Use another code.');
    throw error;
  }
});

const deleteQrCode = asyncHandler(async (req, res) => {
  const result = await db.query('DELETE FROM qr_codes WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rowCount === 0) throw new ApiError(404, 'QR code not found');
  res.json({ success: true, message: 'QR code deleted successfully' });
});

const regenerateQrCode = asyncHandler(async (req, res) => {
  const existing = await db.query('SELECT id, title, target_url FROM qr_codes WHERE id = $1', [req.params.id]);
  if (existing.rowCount === 0) throw new ApiError(404, 'QR code not found');

  const requestedCode = normalizeString(req.body.code);
  const newCode = requestedCode ? makeCode(requestedCode) : await buildUniqueCode(`${existing.rows[0].title}_regenerated`);
  if (!newCode) throw new ApiError(400, 'New QR code value cannot be empty');

  try {
    await db.query(
      `UPDATE qr_codes
       SET code = $1,
           regenerate_count = regenerate_count + 1,
           last_regenerated_at = NOW()
       WHERE id = $2`,
      [newCode, req.params.id],
    );
    const data = await getQrById(req.params.id, req);
    res.json({ success: true, message: 'QR code regenerated successfully', data });
  } catch (error) {
    if (error.code === '23505') throw new ApiError(409, 'Regenerated QR code already exists. Try again.');
    throw error;
  }
});

const getQrCode = asyncHandler(async (req, res) => {
  const data = await getQrById(req.params.id, req);
  res.json({ success: true, data });
});

const trackScanAndRedirect = asyncHandler(async (req, res) => {
  const code = makeCode(req.params.code);
  const result = await db.query('SELECT id, target_url, status FROM qr_codes WHERE code = $1', [code]);

  if (result.rowCount === 0 || result.rows[0].status !== 'Active') {
    res.status(404).send('QR code is inactive or not found.');
    return;
  }

  const qr = result.rows[0];
  await db.query('INSERT INTO qr_code_scans (qr_code_id) VALUES ($1)', [qr.id]);
  await db.query('UPDATE qr_codes SET scan_count = scan_count + 1, last_scan_at = NOW() WHERE id = $1', [qr.id]);

  res.redirect(qr.target_url);
});

const getAnalytics = asyncHandler(async (req, res) => {
  const summary = await db.query(`
    SELECT
      COUNT(*)::int AS "totalQrCodes",
      COALESCE(SUM(scan_count), 0)::int AS "totalScans",
      COUNT(*) FILTER (WHERE status = 'Active')::int AS "activeQrCodes",
      COUNT(*) FILTER (WHERE status = 'Inactive')::int AS "inactiveQrCodes"
    FROM qr_codes
  `);

  const topQrCodes = await db.query(`
    SELECT
      id,
      code,
      title,
      target_url AS "targetUrl",
      status,
      scan_count AS "scanCount",
      last_scan_at AS "lastScanAt"
    FROM qr_codes
    ORDER BY scan_count DESC, updated_at DESC
    LIMIT 10
  `);

  const recentScans = await db.query(`
    SELECT
      DATE(scanned_at) AS date,
      COUNT(*)::int AS scans
    FROM qr_code_scans
    WHERE scanned_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(scanned_at)
    ORDER BY date DESC
  `);

  res.json({
    success: true,
    data: {
      ...summary.rows[0],
      topQrCodes: topQrCodes.rows,
      recentScans: recentScans.rows,
    },
  });
});

module.exports = {
  listQrCodes,
  getQrCode,
  createQrCode,
  updateQrCode,
  deleteQrCode,
  regenerateQrCode,
  trackScanAndRedirect,
  getAnalytics,
};
