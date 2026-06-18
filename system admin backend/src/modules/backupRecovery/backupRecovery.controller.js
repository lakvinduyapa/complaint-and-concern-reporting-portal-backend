const db = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const backupRecordSelect = `
  SELECT
    id,
    backup_reference AS "backupReference",
    backup_type AS "backupType",
    backup_mode AS "backupMode",
    status,
    started_at AS "startedAt",
    completed_at AS "completedAt",
    storage_location AS "storageLocation",
    file_name AS "fileName",
    file_size_mb AS "fileSizeMb",
    encrypted,
    created_by AS "createdBy",
    notes,
    verification_status AS "verificationStatus",
    verified_by AS "verifiedBy",
    verified_at AS "verifiedAt",
    verification_notes AS "verificationNotes",
    archived,
    archived_at AS "archivedAt",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM backup_records
`;

const validBackupTypes = ['Database Backup', 'Uploaded File Backup', 'Full System Backup'];
const validBackupModes = ['Manual', 'Scheduled'];
const validStatuses = ['Success', 'Failed', 'In Progress', 'Pending Verification', 'Verified', 'Archived', 'Inactive'];
const validVerificationStatuses = ['Not Verified', 'Pending Verification', 'Verified', 'Verification Failed'];
const validFrequencies = ['Daily', 'Weekly', 'Monthly'];
const validDrFrequencies = ['Monthly', 'Quarterly', 'Bi-annually', 'Annually'];
const validDrStatuses = ['Not Tested', 'Scheduled', 'Passed', 'Failed'];

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function requireValue(value, message) {
  if (value === undefined || value === null || value === '') throw new ApiError(400, message);
}

function validateEnum(value, validValues, label) {
  if (value !== undefined && value !== null && value !== '' && !validValues.includes(value)) {
    throw new ApiError(400, `${label} must be one of: ${validValues.join(', ')}`);
  }
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const next = Number(value);
  if (!Number.isFinite(next)) throw new ApiError(400, 'Numeric value is invalid');
  return next;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (['true', '1', 'yes', 'Yes'].includes(String(value))) return true;
  if (['false', '0', 'no', 'No'].includes(String(value))) return false;
  return fallback;
}

function toDateOrNull(value) {
  if (!value) return null;
  return value;
}

async function getRecordById(id) {
  const result = await db.query(`${backupRecordSelect} WHERE id = $1`, [id]);
  if (result.rowCount === 0) throw new ApiError(404, 'Backup record not found');
  return result.rows[0];
}

async function createBackupReference() {
  const year = new Date().getFullYear();
  const prefix = `BKP-${year}-`;
  const result = await db.query(
    `SELECT backup_reference FROM backup_records
     WHERE backup_reference LIKE $1
     ORDER BY backup_reference DESC
     LIMIT 1`,
    [`${prefix}%`],
  );

  const lastNumber = result.rowCount
    ? Number(String(result.rows[0].backup_reference).replace(prefix, '')) || 0
    : 0;

  return `${prefix}${String(lastNumber + 1).padStart(6, '0')}`;
}

const getSummary = asyncHandler(async (req, res) => {
  const summaryResult = await db.query(`
    SELECT
      COUNT(*)::int AS "totalBackups",
      COUNT(*) FILTER (WHERE status = 'Success')::int AS "successfulBackups",
      COUNT(*) FILTER (WHERE status = 'Failed')::int AS "failedBackups",
      COUNT(*) FILTER (WHERE verification_status = 'Verified')::int AS "verifiedBackups",
      COUNT(*) FILTER (WHERE archived = true OR status = 'Archived')::int AS "archivedBackups",
      MAX(completed_at) AS "lastBackupAt"
    FROM backup_records
  `);

  const recentResult = await db.query(`${backupRecordSelect} ORDER BY created_at DESC LIMIT 5`);
  const settingsResult = await db.query('SELECT * FROM backup_settings ORDER BY created_at ASC LIMIT 1');

  const data = {
    ...summaryResult.rows[0],
    recentBackups: recentResult.rows,
    settings: settingsResult.rows[0] || null,
  };

  res.json({ success: true, data });
});

const listBackupRecords = asyncHandler(async (req, res) => {
  const { search = '', status = '', backupType = '' } = req.query;
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${String(search).trim()}%`);
    conditions.push(`(backup_reference ILIKE $${values.length} OR storage_location ILIKE $${values.length} OR file_name ILIKE $${values.length} OR notes ILIKE $${values.length})`);
  }

  if (status) {
    validateEnum(status, validStatuses, 'Status');
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (backupType) {
    validateEnum(backupType, validBackupTypes, 'Backup type');
    values.push(backupType);
    conditions.push(`backup_type = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(`${backupRecordSelect} ${whereClause} ORDER BY created_at DESC`, values);
  res.json({ success: true, data: result.rows });
});

const getBackupRecord = asyncHandler(async (req, res) => {
  const data = await getRecordById(req.params.id);
  res.json({ success: true, data });
});

const createBackupRecord = asyncHandler(async (req, res) => {
  const backupType = normalizeString(req.body.backupType || req.body.backup_type);
  const backupMode = normalizeString(req.body.backupMode || req.body.backup_mode || 'Manual');
  const status = normalizeString(req.body.status || 'Pending Verification');
  const verificationStatus = normalizeString(req.body.verificationStatus || req.body.verification_status || 'Not Verified');
  const storageLocation = normalizeString(req.body.storageLocation || req.body.storage_location);

  requireValue(backupType, 'Backup type is required');
  requireValue(storageLocation, 'Storage location is required');
  validateEnum(backupType, validBackupTypes, 'Backup type');
  validateEnum(backupMode, validBackupModes, 'Backup mode');
  validateEnum(status, validStatuses, 'Status');
  validateEnum(verificationStatus, validVerificationStatuses, 'Verification status');

  const backupReference = normalizeString(req.body.backupReference || req.body.backup_reference) || await createBackupReference();

  const created = await db.query(
    `INSERT INTO backup_records (
      backup_reference, backup_type, backup_mode, status, started_at, completed_at,
      storage_location, file_name, file_size_mb, encrypted, created_by, notes,
      verification_status, verified_by, verified_at, verification_notes
    ) VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id`,
    [
      backupReference,
      backupType,
      backupMode,
      status,
      toDateOrNull(req.body.startedAt || req.body.started_at),
      toDateOrNull(req.body.completedAt || req.body.completed_at),
      storageLocation,
      normalizeString(req.body.fileName || req.body.file_name),
      toNumberOrNull(req.body.fileSizeMb || req.body.file_size_mb),
      toBoolean(req.body.encrypted, true),
      normalizeString(req.body.createdBy || req.body.created_by || 'System Admin'),
      normalizeString(req.body.notes),
      verificationStatus,
      normalizeString(req.body.verifiedBy || req.body.verified_by),
      toDateOrNull(req.body.verifiedAt || req.body.verified_at),
      normalizeString(req.body.verificationNotes || req.body.verification_notes),
    ],
  );

  const data = await getRecordById(created.rows[0].id);
  res.status(201).json({ success: true, message: 'Backup record created successfully', data });
});

const updateBackupRecord = asyncHandler(async (req, res) => {
  await getRecordById(req.params.id);

  if (req.body.backupType !== undefined || req.body.backup_type !== undefined) validateEnum(req.body.backupType || req.body.backup_type, validBackupTypes, 'Backup type');
  if (req.body.backupMode !== undefined || req.body.backup_mode !== undefined) validateEnum(req.body.backupMode || req.body.backup_mode, validBackupModes, 'Backup mode');
  if (req.body.status !== undefined) validateEnum(req.body.status, validStatuses, 'Status');
  if (req.body.verificationStatus !== undefined || req.body.verification_status !== undefined) validateEnum(req.body.verificationStatus || req.body.verification_status, validVerificationStatuses, 'Verification status');

  const fields = [];
  const values = [];
  function addField(column, value) {
    if (value !== undefined) {
      values.push(value === '' ? null : value);
      fields.push(`${column} = $${values.length}`);
    }
  }

  addField('backup_reference', normalizeString(req.body.backupReference || req.body.backup_reference));
  addField('backup_type', normalizeString(req.body.backupType || req.body.backup_type));
  addField('backup_mode', normalizeString(req.body.backupMode || req.body.backup_mode));
  addField('status', normalizeString(req.body.status));
  if (req.body.startedAt !== undefined || req.body.started_at !== undefined) addField('started_at', toDateOrNull(req.body.startedAt || req.body.started_at));
  if (req.body.completedAt !== undefined || req.body.completed_at !== undefined) addField('completed_at', toDateOrNull(req.body.completedAt || req.body.completed_at));
  addField('storage_location', normalizeString(req.body.storageLocation || req.body.storage_location));
  addField('file_name', normalizeString(req.body.fileName || req.body.file_name));
  addField('file_size_mb', req.body.fileSizeMb !== undefined || req.body.file_size_mb !== undefined ? toNumberOrNull(req.body.fileSizeMb || req.body.file_size_mb) : undefined);
  addField('encrypted', req.body.encrypted !== undefined ? toBoolean(req.body.encrypted, true) : undefined);
  addField('created_by', normalizeString(req.body.createdBy || req.body.created_by));
  addField('notes', normalizeString(req.body.notes));
  addField('verification_status', normalizeString(req.body.verificationStatus || req.body.verification_status));
  addField('verified_by', normalizeString(req.body.verifiedBy || req.body.verified_by));
  if (req.body.verifiedAt !== undefined || req.body.verified_at !== undefined) addField('verified_at', toDateOrNull(req.body.verifiedAt || req.body.verified_at));
  addField('verification_notes', normalizeString(req.body.verificationNotes || req.body.verification_notes));

  if (fields.length === 0) throw new ApiError(400, 'No fields provided to update');

  values.push(req.params.id);
  await db.query(`UPDATE backup_records SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
  const data = await getRecordById(req.params.id);
  res.json({ success: true, message: 'Backup record updated successfully', data });
});

const verifyBackupRecord = asyncHandler(async (req, res) => {
  await getRecordById(req.params.id);
  const verificationStatus = normalizeString(req.body.verificationStatus || req.body.verification_status || 'Verified');
  validateEnum(verificationStatus, validVerificationStatuses, 'Verification status');

  await db.query(
    `UPDATE backup_records
     SET verification_status = $1,
         verified_by = $2,
         verified_at = COALESCE($3, NOW()),
         verification_notes = $4,
         status = CASE WHEN $1 = 'Verified' THEN 'Verified' ELSE status END
     WHERE id = $5`,
    [
      verificationStatus,
      normalizeString(req.body.verifiedBy || req.body.verified_by || 'System Admin'),
      toDateOrNull(req.body.verifiedAt || req.body.verified_at),
      normalizeString(req.body.verificationNotes || req.body.verification_notes),
      req.params.id,
    ],
  );

  const data = await getRecordById(req.params.id);
  res.json({ success: true, message: 'Backup verification updated successfully', data });
});

const archiveBackupRecord = asyncHandler(async (req, res) => {
  await getRecordById(req.params.id);
  await db.query(
    `UPDATE backup_records
     SET archived = true,
         archived_at = NOW(),
         status = 'Archived',
         notes = COALESCE($2, notes)
     WHERE id = $1`,
    [req.params.id, normalizeString(req.body?.notes)],
  );
  const data = await getRecordById(req.params.id);
  res.json({ success: true, message: 'Backup record archived successfully', data });
});

const getBackupSettings = asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT
      id,
      backup_frequency AS "backupFrequency",
      backup_time AS "backupTime",
      default_backup_type AS "defaultBackupType",
      storage_location AS "storageLocation",
      retention_days AS "retentionDays",
      encryption_enabled AS "encryptionEnabled",
      notifications_enabled AS "notificationsEnabled",
      status,
      updated_at AS "updatedAt"
    FROM backup_settings
    ORDER BY created_at ASC LIMIT 1
  `);
  res.json({ success: true, data: result.rows[0] || null });
});

const updateBackupSettings = asyncHandler(async (req, res) => {
  const backupFrequency = normalizeString(req.body.backupFrequency || req.body.backup_frequency || 'Daily');
  const defaultBackupType = normalizeString(req.body.defaultBackupType || req.body.default_backup_type || 'Full System Backup');
  validateEnum(backupFrequency, validFrequencies, 'Backup frequency');
  validateEnum(defaultBackupType, validBackupTypes, 'Default backup type');

  const result = await db.query(
    `UPDATE backup_settings
     SET backup_frequency = $1,
         backup_time = $2,
         default_backup_type = $3,
         storage_location = $4,
         retention_days = $5,
         encryption_enabled = $6,
         notifications_enabled = $7,
         status = $8
     WHERE id = (SELECT id FROM backup_settings ORDER BY created_at ASC LIMIT 1)
     RETURNING id`,
    [
      backupFrequency,
      normalizeString(req.body.backupTime || req.body.backup_time || '23:00'),
      defaultBackupType,
      normalizeString(req.body.storageLocation || req.body.storage_location || ''),
      Number(req.body.retentionDays || req.body.retention_days || 90),
      toBoolean(req.body.encryptionEnabled ?? req.body.encryption_enabled, true),
      toBoolean(req.body.notificationsEnabled ?? req.body.notifications_enabled, false),
      normalizeString(req.body.status || 'Active'),
    ],
  );

  if (result.rowCount === 0) {
    await db.query(
      `INSERT INTO backup_settings (backup_frequency, backup_time, default_backup_type, storage_location, retention_days, encryption_enabled, notifications_enabled, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [backupFrequency, req.body.backupTime || '23:00', defaultBackupType, req.body.storageLocation || '', Number(req.body.retentionDays || 90), toBoolean(req.body.encryptionEnabled, true), toBoolean(req.body.notificationsEnabled, false), req.body.status || 'Active'],
    );
  }

  const dataResult = await db.query(`SELECT id, backup_frequency AS "backupFrequency", backup_time AS "backupTime", default_backup_type AS "defaultBackupType", storage_location AS "storageLocation", retention_days AS "retentionDays", encryption_enabled AS "encryptionEnabled", notifications_enabled AS "notificationsEnabled", status, updated_at AS "updatedAt" FROM backup_settings ORDER BY created_at ASC LIMIT 1`);
  res.json({ success: true, message: 'Backup settings updated successfully', data: dataResult.rows[0] });
});

const getDrSettings = asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT
      id,
      rto_hours AS "rtoHours",
      rpo_hours AS "rpoHours",
      dr_test_frequency AS "drTestFrequency",
      last_dr_test_date AS "lastDrTestDate",
      next_dr_test_date AS "nextDrTestDate",
      dr_test_status AS "drTestStatus",
      dr_test_notes AS "drTestNotes",
      updated_at AS "updatedAt"
    FROM disaster_recovery_settings
    ORDER BY created_at ASC LIMIT 1
  `);
  res.json({ success: true, data: result.rows[0] || null });
});

const updateDrSettings = asyncHandler(async (req, res) => {
  const drTestFrequency = normalizeString(req.body.drTestFrequency || req.body.dr_test_frequency || 'Bi-annually');
  const drTestStatus = normalizeString(req.body.drTestStatus || req.body.dr_test_status || 'Not Tested');
  validateEnum(drTestFrequency, validDrFrequencies, 'DR test frequency');
  validateEnum(drTestStatus, validDrStatuses, 'DR test status');

  const result = await db.query(
    `UPDATE disaster_recovery_settings
     SET rto_hours = $1,
         rpo_hours = $2,
         dr_test_frequency = $3,
         last_dr_test_date = $4,
         next_dr_test_date = $5,
         dr_test_status = $6,
         dr_test_notes = $7
     WHERE id = (SELECT id FROM disaster_recovery_settings ORDER BY created_at ASC LIMIT 1)
     RETURNING id`,
    [
      Number(req.body.rtoHours || req.body.rto_hours || 4),
      Number(req.body.rpoHours || req.body.rpo_hours || 24),
      drTestFrequency,
      toDateOrNull(req.body.lastDrTestDate || req.body.last_dr_test_date),
      toDateOrNull(req.body.nextDrTestDate || req.body.next_dr_test_date),
      drTestStatus,
      normalizeString(req.body.drTestNotes || req.body.dr_test_notes),
    ],
  );

  if (result.rowCount === 0) {
    await db.query(
      `INSERT INTO disaster_recovery_settings (rto_hours, rpo_hours, dr_test_frequency, last_dr_test_date, next_dr_test_date, dr_test_status, dr_test_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [Number(req.body.rtoHours || 4), Number(req.body.rpoHours || 24), drTestFrequency, req.body.lastDrTestDate || null, req.body.nextDrTestDate || null, drTestStatus, req.body.drTestNotes || null],
    );
  }

  const dataResult = await db.query(`SELECT id, rto_hours AS "rtoHours", rpo_hours AS "rpoHours", dr_test_frequency AS "drTestFrequency", last_dr_test_date AS "lastDrTestDate", next_dr_test_date AS "nextDrTestDate", dr_test_status AS "drTestStatus", dr_test_notes AS "drTestNotes", updated_at AS "updatedAt" FROM disaster_recovery_settings ORDER BY created_at ASC LIMIT 1`);
  res.json({ success: true, message: 'Disaster recovery settings updated successfully', data: dataResult.rows[0] });
});

const getArchiveSettings = asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT
      id,
      archive_after_years AS "archiveAfterYears",
      archive_storage_location AS "archiveStorageLocation",
      retrieval_sla_hours AS "retrievalSlaHours",
      status,
      notes,
      updated_at AS "updatedAt"
    FROM data_archival_settings
    ORDER BY created_at ASC LIMIT 1
  `);
  res.json({ success: true, data: result.rows[0] || null });
});

const updateArchiveSettings = asyncHandler(async (req, res) => {
  const status = normalizeString(req.body.status || 'Active');
  validateEnum(status, ['Active', 'Inactive'], 'Status');

  const result = await db.query(
    `UPDATE data_archival_settings
     SET archive_after_years = $1,
         archive_storage_location = $2,
         retrieval_sla_hours = $3,
         status = $4,
         notes = $5
     WHERE id = (SELECT id FROM data_archival_settings ORDER BY created_at ASC LIMIT 1)
     RETURNING id`,
    [
      Number(req.body.archiveAfterYears || req.body.archive_after_years || 2),
      normalizeString(req.body.archiveStorageLocation || req.body.archive_storage_location || ''),
      Number(req.body.retrievalSlaHours || req.body.retrieval_sla_hours || 48),
      status,
      normalizeString(req.body.notes),
    ],
  );

  if (result.rowCount === 0) {
    await db.query(
      `INSERT INTO data_archival_settings (archive_after_years, archive_storage_location, retrieval_sla_hours, status, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [Number(req.body.archiveAfterYears || 2), req.body.archiveStorageLocation || '', Number(req.body.retrievalSlaHours || 48), status, req.body.notes || null],
    );
  }

  const dataResult = await db.query(`SELECT id, archive_after_years AS "archiveAfterYears", archive_storage_location AS "archiveStorageLocation", retrieval_sla_hours AS "retrievalSlaHours", status, notes, updated_at AS "updatedAt" FROM data_archival_settings ORDER BY created_at ASC LIMIT 1`);
  res.json({ success: true, message: 'Data archival settings updated successfully', data: dataResult.rows[0] });
});

module.exports = {
  getSummary,
  listBackupRecords,
  getBackupRecord,
  createBackupRecord,
  updateBackupRecord,
  verifyBackupRecord,
  archiveBackupRecord,
  getBackupSettings,
  updateBackupSettings,
  getDrSettings,
  updateDrSettings,
  getArchiveSettings,
  updateArchiveSettings,
};
