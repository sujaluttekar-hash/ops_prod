import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const H = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json' }

export async function GET() {
  const checks: any = {}

  // Check each required table
  for (const table of ['butler_locations', 'attendance', 'noticeboard']) {
    const r = await fetch(`${SURL}/rest/v1/${table}?limit=1`, { headers: H })
    checks[table] = r.ok ? '✅ EXISTS' : `❌ MISSING`
  }

  // Check password_hash column
  const pr = await fetch(`${SURL}/rest/v1/profiles?select=id,password_hash&limit=1`, { headers: H })
  const pd = await pr.json()
  checks.password_hash = (pr.ok && !pd?.code) ? '✅ EXISTS' : '❌ MISSING'

  return NextResponse.json({
    checks,
    sql: `-- Run this ENTIRE block in Supabase SQL Editor:
-- supabase.com/dashboard/project/ryuxwnbrdsjwzwdimynd/sql/new

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

CREATE TABLE IF NOT EXISTS noticeboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'announcement',
  squad TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  created_by TEXT NOT NULL,
  acknowledged_by UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION;`
  })
}
