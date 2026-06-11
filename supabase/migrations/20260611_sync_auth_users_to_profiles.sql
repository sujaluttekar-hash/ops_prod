-- ============================================================
-- Sync all existing auth.users into profiles
-- Safe to run multiple times (ON CONFLICT DO UPDATE)
-- ============================================================

INSERT INTO profiles (id, email, name, role, is_active, created_at)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    split_part(u.email, '@', 1)
  ) AS name,
  CASE
    WHEN u.email ILIKE '%admin%'       THEN 'super_admin'
    WHEN u.email ILIKE '%supervisor%'  THEN 'ops_manager'
    WHEN u.email ILIKE '%manager%'     THEN 'ops_manager'
    WHEN u.email ILIKE '%trainer%'     THEN 'trainer'
    ELSE 'butler'
  END AS role,
  TRUE AS is_active,
  NOW() AS created_at
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  email      = EXCLUDED.email,
  name       = COALESCE(profiles.name, EXCLUDED.name),
  role       = COALESCE(profiles.role, EXCLUDED.role),
  is_active  = TRUE,
  updated_at = NOW();

-- Also fix any profiles where id doesn't match auth.users
-- (email exists in profiles but with wrong id)
UPDATE profiles p
SET id = u.id, updated_at = NOW()
FROM auth.users u
WHERE p.email = u.email
  AND p.id != u.id;

-- Ensure the auto-create trigger is in place for future signups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, name, email, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'butler',
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
