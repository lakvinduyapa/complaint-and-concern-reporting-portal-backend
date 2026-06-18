CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS backup_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_reference VARCHAR(40) NOT NULL UNIQUE,
  backup_type VARCHAR(40) NOT NULL CHECK (backup_type IN ('Database Backup', 'Uploaded File Backup', 'Full System Backup')),
  backup_mode VARCHAR(20) NOT NULL DEFAULT 'Manual' CHECK (backup_mode IN ('Manual', 'Scheduled')),
  status VARCHAR(30) NOT NULL DEFAULT 'Pending Verification' CHECK (status IN ('Success', 'Failed', 'In Progress', 'Pending Verification', 'Verified', 'Archived', 'Inactive')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  storage_location TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size_mb NUMERIC(12,2),
  encrypted BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(150),
  notes TEXT,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'Not Verified' CHECK (verification_status IN ('Not Verified', 'Pending Verification', 'Verified', 'Verification Failed')),
  verified_by VARCHAR(150),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_frequency VARCHAR(20) NOT NULL DEFAULT 'Daily' CHECK (backup_frequency IN ('Daily', 'Weekly', 'Monthly')),
  backup_time VARCHAR(10) NOT NULL DEFAULT '23:00',
  default_backup_type VARCHAR(40) NOT NULL DEFAULT 'Full System Backup' CHECK (default_backup_type IN ('Database Backup', 'Uploaded File Backup', 'Full System Backup')),
  storage_location TEXT NOT NULL DEFAULT 'To be confirmed by IT infrastructure team',
  retention_days INTEGER NOT NULL DEFAULT 90,
  encryption_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disaster_recovery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rto_hours INTEGER NOT NULL DEFAULT 4,
  rpo_hours INTEGER NOT NULL DEFAULT 24,
  dr_test_frequency VARCHAR(30) NOT NULL DEFAULT 'Bi-annually' CHECK (dr_test_frequency IN ('Monthly', 'Quarterly', 'Bi-annually', 'Annually')),
  last_dr_test_date DATE,
  next_dr_test_date DATE,
  dr_test_status VARCHAR(30) NOT NULL DEFAULT 'Not Tested' CHECK (dr_test_status IN ('Not Tested', 'Scheduled', 'Passed', 'Failed')),
  dr_test_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_archival_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_after_years INTEGER NOT NULL DEFAULT 2,
  archive_storage_location TEXT NOT NULL DEFAULT 'Secure cold storage - to be confirmed by IT infrastructure team',
  retrieval_sla_hours INTEGER NOT NULL DEFAULT 48,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_records_type ON backup_records(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_records_status ON backup_records(status);
CREATE INDEX IF NOT EXISTS idx_backup_records_started_at ON backup_records(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_records_archived ON backup_records(archived);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_backup_records_updated_at ON backup_records;
CREATE TRIGGER trg_backup_records_updated_at
BEFORE UPDATE ON backup_records
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_backup_settings_updated_at ON backup_settings;
CREATE TRIGGER trg_backup_settings_updated_at
BEFORE UPDATE ON backup_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_disaster_recovery_settings_updated_at ON disaster_recovery_settings;
CREATE TRIGGER trg_disaster_recovery_settings_updated_at
BEFORE UPDATE ON disaster_recovery_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_data_archival_settings_updated_at ON data_archival_settings;
CREATE TRIGGER trg_data_archival_settings_updated_at
BEFORE UPDATE ON data_archival_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO backup_settings (backup_frequency, backup_time, default_backup_type, storage_location, retention_days, encryption_enabled, notifications_enabled, status)
SELECT 'Daily', '23:00', 'Full System Backup', 'To be confirmed by IT infrastructure team', 90, TRUE, FALSE, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM backup_settings);

INSERT INTO disaster_recovery_settings (rto_hours, rpo_hours, dr_test_frequency, dr_test_status, dr_test_notes)
SELECT 4, 24, 'Bi-annually', 'Not Tested', 'Default values based on Backup & Recovery requirement: RTO 4 hours and RPO 24 hours.'
WHERE NOT EXISTS (SELECT 1 FROM disaster_recovery_settings);

INSERT INTO data_archival_settings (archive_after_years, archive_storage_location, retrieval_sla_hours, status, notes)
SELECT 2, 'Secure cold storage - to be confirmed by IT infrastructure team', 48, 'Active', 'Records older than 2 years should be archived and retrievable within 48 hours when requested.'
WHERE NOT EXISTS (SELECT 1 FROM data_archival_settings);

INSERT INTO backup_records (backup_reference, backup_type, backup_mode, status, started_at, completed_at, storage_location, file_name, file_size_mb, encrypted, created_by, notes, verification_status)
SELECT 'BKP-2026-000001', 'Full System Backup', 'Manual', 'Pending Verification', NOW(), NULL, 'To be confirmed by IT infrastructure team', 'manual-backup-record-placeholder.zip', NULL, TRUE, 'System Admin', 'Initial backup record placeholder. This version manages records first; actual backup file generation can be added after hosting/server details are confirmed.', 'Pending Verification'
WHERE NOT EXISTS (SELECT 1 FROM backup_records WHERE backup_reference = 'BKP-2026-000001');
