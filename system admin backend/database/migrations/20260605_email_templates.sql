CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  available_variables TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_status ON email_templates(status);
CREATE INDEX IF NOT EXISTS idx_email_templates_sort ON email_templates(sort_order);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON email_templates;
CREATE TRIGGER trg_email_templates_updated_at
BEFORE UPDATE ON email_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO email_templates (template_key, name, description, subject, body, available_variables, status, sort_order)
VALUES
  (
    'system_notification',
    'System notification',
    'General notification template for system administration updates.',
    'System notification - {{actionDate}}',
    'Dear {{userName}},

This is a system administration notification.

Action: {{actionName}}
Date/Time: {{actionDate}}
Contact: {{adminContact}}

Regards,
System Administration Team
SLTMobitel',
    '{{userName}}, {{actionName}}, {{actionDate}}, {{adminContact}}',
    'Active',
    10
  ),
  (
    'new_user_created',
    'New user created',
    'Sent when a new admin user account is created.',
    'New user account created - {{userName}}',
    'Dear {{userName}},

A new system admin account has been created for you.

Username: {{username}}
Created Date/Time: {{createdAt}}

Please contact the system administrator if you need support.

Regards,
System Administration Team
SLTMobitel',
    '{{userName}}, {{username}}, {{createdAt}}, {{adminContact}}',
    'Active',
    20
  ),
  (
    'backup_verification_alert',
    'Backup verification alert',
    'Used when a backup record requires verification or review.',
    'Backup verification required - {{backupReference}}',
    'A backup record requires verification.

Backup Reference: {{backupReference}}
Backup Type: {{backupType}}
Status: {{backupStatus}}
Date/Time: {{backupDate}}

Please review the backup record in the admin dashboard.',
    '{{backupReference}}, {{backupType}}, {{backupStatus}}, {{backupDate}}',
    'Active',
    30
  ),
  (
    'account_status_update',
    'Account status update',
    'Used when a user account status is changed.',
    'Account status updated - {{userName}}',
    'Dear {{userName}},

Your system account status has been updated.

Current Status: {{accountStatus}}
Updated Date/Time: {{updatedAt}}

Regards,
System Administration Team
SLTMobitel',
    '{{userName}}, {{accountStatus}}, {{updatedAt}}, {{adminContact}}',
    'Active',
    40
  )
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order;
