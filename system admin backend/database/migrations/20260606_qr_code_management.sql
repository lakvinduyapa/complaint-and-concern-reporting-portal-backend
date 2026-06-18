CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  target_url TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  scan_count INTEGER NOT NULL DEFAULT 0 CHECK (scan_count >= 0),
  regenerate_count INTEGER NOT NULL DEFAULT 0 CHECK (regenerate_count >= 0),
  last_scan_at TIMESTAMPTZ,
  last_regenerated_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_code_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_sort_order ON qr_codes(sort_order);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_qr_code_id ON qr_code_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_scanned_at ON qr_code_scans(scanned_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_qr_codes_updated_at ON qr_codes;
CREATE TRIGGER trg_qr_codes_updated_at
BEFORE UPDATE ON qr_codes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO qr_codes (code, title, target_url, description, status, sort_order)
VALUES
  (
    'system_portal_main_qr',
    'System Portal Main QR',
    'http://localhost:5173',
    'Main QR code linked to the selected system portal URL. Update target URL when production portal URL is ready.',
    'Active',
    10
  )
ON CONFLICT (code) DO NOTHING;
