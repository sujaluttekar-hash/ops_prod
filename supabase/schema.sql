-- ============================================================
-- StayVista Butler Operations — Complete Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- Drop everything first (be careful!)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS credential_access_log CASCADE;
DROP TABLE IF EXISTS credentials CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS shift_swaps CASCADE;
DROP TABLE IF EXISTS rosters CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS trainings CASCADE;
DROP TABLE IF EXISTS huddles CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS delight_photos CASCADE;
DROP TABLE IF EXISTS guest_delights CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS properties CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at();

-- ─── PROPERTIES ──────────────────────────────────────────

CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'occupied' CHECK (status IN ('occupied', 'partial', 'vacant'))
);

INSERT INTO properties (id, name, location, status) VALUES
  ('lonavala', 'Villa Serenity', 'Lonavala', 'occupied'),
  ('alibaug', 'Casa Azure', 'Alibaug', 'occupied'),
  ('karjat', 'The Hillside', 'Karjat', 'partial'),
  ('nashik', 'Villa Bloom', 'Nashik', 'vacant'),
  ('pune', 'Casa Paradiso', 'Pune', 'occupied')
ON CONFLICT (id) DO NOTHING;

-- ─── PROFILES ────────────────────────────────────────────

CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'butler' CHECK (role IN ('super_admin', 'ops_manager', 'butler', 'trainer')),
  squad TEXT,
  property_id TEXT REFERENCES properties(id),
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, name, email, role, is_active)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.email, 'butler', true)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─── GUEST DELIGHTS ──────────────────────────────────────

CREATE TABLE guest_delights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  your_name TEXT NOT NULL,
  squad TEXT,
  booking_date DATE NOT NULL,
  booking_id TEXT,
  villa_name TEXT NOT NULL,
  booking_type TEXT NOT NULL DEFAULT 'Booking',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_guest_delights_date ON guest_delights(booking_date);
CREATE INDEX idx_guest_delights_status ON guest_delights(status);

-- ─── DELIGHT PHOTOS ──────────────────────────────────────

CREATE TABLE delight_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delight_id UUID NOT NULL REFERENCES guest_delights(id) ON DELETE CASCADE,
  pointer_key TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  captured_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_delight_photos_delight ON delight_photos(delight_id);

-- ─── TASKS ───────────────────────────────────────────────

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  property_id TEXT REFERENCES properties(id),
  butler_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'delayed')),
  due_time TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  photo_path TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tasks_butler ON tasks(butler_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- ─── HUDDLES ─────────────────────────────────────────────

CREATE TABLE huddles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team TEXT NOT NULL,
  huddle_date DATE NOT NULL,
  time TEXT,
  participants_expected INTEGER DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'tbc', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_huddles_date ON huddles(huddle_date);

-- ─── TRAININGS ───────────────────────────────────────────

CREATE TABLE trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  training_date DATE,
  type TEXT DEFAULT 'Functional' CHECK (type IN ('Functional', 'Mandatory')),
  total_seats INTEGER DEFAULT 8,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'upcoming', 'completed')),
  has_quiz BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trainings_date ON trainings(training_date);

-- ─── QUIZZES ─────────────────────────────────────────────

CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── QUIZ QUESTIONS ──────────────────────────────────────

CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'short')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── QUIZ ATTEMPTS ───────────────────────────────────────

CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  butler_id UUID NOT NULL REFERENCES auth.users(id),
  quiz_id UUID NOT NULL REFERENCES quizzes(id),
  score INTEGER,
  passed BOOLEAN,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_butler ON quiz_attempts(butler_id);

-- ─── ROSTERS ─────────────────────────────────────────────

CREATE TABLE rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  butler_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('morning', 'afternoon', 'evening', 'night')),
  assigned_property TEXT REFERENCES properties(id),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'absent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rosters_butler ON rosters(butler_id);
CREATE INDEX idx_rosters_date ON rosters(date);

-- ─── SHIFT SWAPS ─────────────────────────────────────────

CREATE TABLE shift_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  swap_with UUID NOT NULL REFERENCES auth.users(id),
  original_date DATE NOT NULL,
  swap_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── CREDENTIALS ─────────────────────────────────────────

CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  property TEXT NOT NULL,
  value TEXT NOT NULL,
  expiry DATE,
  expiry_warning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_credentials_property ON credentials(property);

-- ─── CREDENTIAL ACCESS LOG ───────────────────────────────

CREATE TABLE credential_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES credentials(id),
  accessed_by UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('view', 'copy')),
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ─── AUDIT LOGS ──────────────────────────────────────────

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);

-- ─── STORAGE BUCKETS ─────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('delight-photos', 'delight-photos', true),
  ('task-photos', 'task-photos', true),
  ('training-materials', 'training-materials', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage policies
CREATE POLICY "Public read delight photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'delight-photos');

CREATE POLICY "Authenticated upload delight photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'delight-photos');

CREATE POLICY "Public read task photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'task-photos');

CREATE POLICY "Authenticated upload task photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-photos');

CREATE POLICY "Authenticated read training materials" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'training-materials');

CREATE POLICY "Authenticated upload training materials" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'training-materials');

-- ─── ROW LEVEL SECURITY ──────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_delights ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE huddles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Profiles: authenticated users can view all, edit own
CREATE POLICY "View all profiles" ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Update own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Guest delights: authenticated users can view/insert
CREATE POLICY "View guest delights" ON guest_delights FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Insert guest delights" ON guest_delights FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Tasks: authenticated users can view, butlers can update own
CREATE POLICY "View tasks" ON tasks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Insert tasks" ON tasks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Update own tasks" ON tasks FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Huddles: authenticated users can view
CREATE POLICY "View huddles" ON huddles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Insert huddles" ON huddles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Trainings: authenticated users can view
CREATE POLICY "View trainings" ON trainings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Insert trainings" ON trainings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Credentials: only super_admin and ops_manager can view
CREATE POLICY "Admins view credentials" ON credentials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'ops_manager')
    )
  );

CREATE POLICY "Admins manage credentials" ON credentials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'ops_manager')
    )
  );

-- ============================================================
-- DONE! Your schema is ready
-- ============================================================
