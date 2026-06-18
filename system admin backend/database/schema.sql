CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS privileges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  module VARCHAR(100) NOT NULL DEFAULT 'general',
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_privileges (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  privilege_id UUID NOT NULL REFERENCES privileges(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, privilege_id)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash TEXT,
  department VARCHAR(120),
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_privileges_module ON privileges(module);
CREATE INDEX IF NOT EXISTS idx_privileges_status ON privileges(status);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_privileges_updated_at ON privileges;
CREATE TRIGGER trg_privileges_updated_at
BEFORE UPDATE ON privileges
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Deleted users audit log: keeps a deletion history while removing the user from active system users.
CREATE TABLE IF NOT EXISTS deleted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id UUID,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(180),
  username VARCHAR(80),
  department VARCHAR(120),
  role_id UUID,
  role_name VARCHAR(100),
  status_at_delete VARCHAR(20),
  deleted_reason TEXT,
  deleted_by VARCHAR(150),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deleted_users_original_user_id ON deleted_users(original_user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_users_deleted_at ON deleted_users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deleted_users_email ON deleted_users(email);


-- System Configurations: configurable reporting portal dropdown/radio/button values.
CREATE TABLE IF NOT EXISTS system_config_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  portal_section VARCHAR(120) NOT NULL DEFAULT 'System Administration',
  input_type VARCHAR(30) NOT NULL DEFAULT 'Dropdown' CHECK (input_type IN ('Dropdown', 'Radio Button', 'Checkbox', 'Button', 'Multi-select', 'Textarea Settings', 'File Upload Settings')),
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_config_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES system_config_groups(id) ON DELETE CASCADE,
  code VARCHAR(120) NOT NULL,
  label VARCHAR(180) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, code)
);

CREATE INDEX IF NOT EXISTS idx_system_config_groups_code ON system_config_groups(code);
CREATE INDEX IF NOT EXISTS idx_system_config_groups_status ON system_config_groups(status);
CREATE INDEX IF NOT EXISTS idx_system_config_options_group_id ON system_config_options(group_id);
CREATE INDEX IF NOT EXISTS idx_system_config_options_status ON system_config_options(status);

DROP TRIGGER IF EXISTS trg_system_config_groups_updated_at ON system_config_groups;
CREATE TRIGGER trg_system_config_groups_updated_at
BEFORE UPDATE ON system_config_groups
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_system_config_options_updated_at ON system_config_options;
CREATE TRIGGER trg_system_config_options_updated_at
BEFORE UPDATE ON system_config_options
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
