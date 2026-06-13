import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const H = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json' }

export async function GET() {
  const results: any = {}

  // 1. Check butler_locations table
  const locRes = await fetch(`${SURL}/rest/v1/butler_locations?limit=1`, { headers: H })
  results.butler_locations = locRes.ok ? '✅ EXISTS' : `❌ MISSING`

  // 2. Check attendance table
  const attRes = await fetch(`${SURL}/rest/v1/attendance?limit=1`, { headers: H })
  results.attendance = attRes.ok ? '✅ EXISTS' : `❌ MISSING`

  // 3. Check profiles has password_hash column by inserting test check
  const profRes = await fetch(`${SURL}/rest/v1/profiles?select=id,password_hash&limit=1`, { headers: H })
  const profData = await profRes.json()
  results.password_hash_column = profRes.ok && !profData?.code ? '✅ EXISTS' : `❌ MISSING — run: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;`

  // 4. List storage buckets
  const bucketsRes = await fetch(`${SURL}/storage/v1/bucket`, { headers: H })
  const buckets = await bucketsRes.json()
  results.storage_buckets = Array.isArray(buckets) ? buckets.map((b: any) => b.name) : buckets

  // 5. Count task photos
  const tasksRes = await fetch(`${SURL}/rest/v1/tasks?select=id,photo_path&not.photo_path=is.null&limit=10`, { headers: H })
  const tasks = await tasksRes.json()
  results.tasks_with_photos = Array.isArray(tasks) ? tasks.length : 0
  results.sample_photo_url = Array.isArray(tasks) && tasks[0] ? tasks[0].photo_path : null

  results.sql_needed = `-- Run ALL of this in Supabase SQL Editor:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

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

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  butler_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'absent',
  check_in TEXT, check_out TEXT,
  geo_lat DOUBLE PRECISION, geo_lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_date_butler_idx ON attendance(date, butler_id);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION;`

  return NextResponse.json(results)
}
