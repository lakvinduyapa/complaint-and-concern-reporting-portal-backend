CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
