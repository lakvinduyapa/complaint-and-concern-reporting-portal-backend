INSERT INTO roles (name, description, status) VALUES
  ('System Admin', 'Full access to user management, role management, privilege assignment, QR link management, backup records, and system settings.', 'Active'),
  ('Backup Operator', 'Can manage backup records, backup verification, disaster recovery settings, and data archival records.', 'Active'),
  ('Auditor', 'Read-only access to audit logs, system records, and administrative reports.', 'Active')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  status = EXCLUDED.status;

INSERT INTO privileges (code, name, description, module, status) VALUES
  ('manage_users', 'Manage Users', 'Can create, update, and deactivate user accounts.', 'user_management', 'Active'),
  ('manage_roles', 'Manage Roles', 'Can create and update portal roles.', 'user_management', 'Active'),
  ('manage_privileges', 'Manage Privileges', 'Can create, update, and assign privilege records.', 'user_management', 'Active'),
  ('manage_qr_codes', 'Manage QR Codes', 'Can create, update, regenerate, and deactivate QR code records.', 'qr_management', 'Active'),
  ('manage_backups', 'Manage Backups', 'Can add, verify, archive, and review backup records.', 'backup_recovery', 'Active'),
  ('manage_email_templates', 'Manage Email Templates', 'Can create, update, and deactivate system email templates.', 'system_configurations', 'Active'),
  ('view_audit_logs', 'View Audit Logs', 'Can view audit logs and system activity records.', 'security', 'Active')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  module = EXCLUDED.module,
  status = EXCLUDED.status;

INSERT INTO role_privileges (role_id, privilege_id)
SELECT r.id, p.id
FROM roles r
JOIN privileges p ON p.code IN ('manage_users', 'manage_roles', 'manage_privileges', 'manage_qr_codes', 'manage_backups', 'manage_email_templates', 'view_audit_logs')
WHERE r.name = 'System Admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_privileges (role_id, privilege_id)
SELECT r.id, p.id
FROM roles r
JOIN privileges p ON p.code IN ('manage_backups')
WHERE r.name = 'Backup Operator'
ON CONFLICT DO NOTHING;

INSERT INTO role_privileges (role_id, privilege_id)
SELECT r.id, p.id
FROM roles r
JOIN privileges p ON p.code IN ('view_audit_logs')
WHERE r.name = 'Auditor'
ON CONFLICT DO NOTHING;

INSERT INTO users (full_name, email, username, department, role_id, status)
SELECT 'Amina Rahman', 'amina.rahman@portal.gov', 'aminar', 'Administration', r.id, 'Active'
FROM roles r WHERE r.name = 'System Admin'
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (full_name, email, username, department, role_id, status)
SELECT 'Kamal Perera', 'kamal.perera@portal.gov', 'kperera', 'IT Operations', r.id, 'Inactive'
FROM roles r WHERE r.name = 'Backup Operator'
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (full_name, email, username, department, role_id, status)
SELECT 'Nadia Silva', 'nadia.silva@portal.gov', 'nadias', 'Audit', r.id, 'Active'
FROM roles r WHERE r.name = 'Auditor'
ON CONFLICT (username) DO NOTHING;

INSERT INTO system_config_groups (code, name, description, portal_section, input_type, status, sort_order) VALUES
  ('admin_setting', 'Admin Setting', 'General system administration setting values.', 'System Administration', 'Dropdown', 'Active', 10),
  ('notification_type', 'Notification Type', 'General notification types used by the admin system.', 'System Administration', 'Dropdown', 'Active', 20)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  portal_section = EXCLUDED.portal_section,
  input_type = EXCLUDED.input_type,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order;

WITH option_seed(group_code, code, label, description, status, sort_order) AS (
  VALUES
    ('admin_setting', 'enabled', 'Enabled', 'Feature or setting is enabled.', 'Active', 10),
    ('admin_setting', 'disabled', 'Disabled', 'Feature or setting is disabled.', 'Active', 20),
    ('notification_type', 'system_alert', 'System Alert', 'General system alert notification.', 'Active', 10),
    ('notification_type', 'backup_alert', 'Backup Alert', 'Backup and recovery related notification.', 'Active', 20),
    ('notification_type', 'account_alert', 'Account Alert', 'User account related notification.', 'Active', 30)
)
INSERT INTO system_config_options (group_id, code, label, description, status, sort_order)
SELECT g.id, seed.code, seed.label, seed.description, seed.status, seed.sort_order
FROM option_seed seed
JOIN system_config_groups g ON g.code = seed.group_code
ON CONFLICT (group_id, code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order;
