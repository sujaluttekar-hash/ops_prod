-- ── Butler live locations ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS butler_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  butler_id UUID NOT NULL,
  butler_name TEXT NOT NULL,
  squad TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS butler_locations_butler_id_idx ON butler_locations(butler_id);

-- ── Attendance ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  butler_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present','absent','half_day')),
  check_in TEXT,
  check_out TEXT,
  geo_lat DOUBLE PRECISION,
  geo_lng DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_date_butler_idx ON attendance(date, butler_id);

-- ── Tasks: add geo columns if missing ────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_butler_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_property_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_type_check;

-- ── Notifications: fix column name ───────────────────────────
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT;
