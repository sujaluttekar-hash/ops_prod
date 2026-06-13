import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const H = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}` }

export async function GET() {
  const checks: Record<string,string> = {}
  for (const t of ['butler_locations','attendance','incidents']) {
    const r = await fetch(`${SURL}/rest/v1/${t}?limit=1`, { headers: H })
    checks[t] = r.ok ? 'EXISTS' : 'MISSING'
  }
  const pr = await fetch(`${SURL}/rest/v1/profiles?select=id,password_hash&limit=1`, { headers: H })
  const pd = await pr.json()
  checks['password_hash'] = (pr.ok && !pd?.code) ? 'EXISTS' : 'MISSING'

  return NextResponse.json({
    checks,
    sql: [
      'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;',
      'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION;',
      'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION;',
      'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS voice_url TEXT;',
      'CREATE TABLE IF NOT EXISTS butler_locations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), butler_id UUID NOT NULL, butler_name TEXT NOT NULL, squad TEXT, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, accuracy DOUBLE PRECISION, updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());',
      'CREATE UNIQUE INDEX IF NOT EXISTS butler_locations_butler_id_idx ON butler_locations(butler_id);',
      'CREATE TABLE IF NOT EXISTS attendance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE NOT NULL, butler_id UUID NOT NULL, status TEXT NOT NULL DEFAULT 0x27absent0x27, check_in TEXT, geo_lat DOUBLE PRECISION, geo_lng DOUBLE PRECISION, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());',
      'CREATE UNIQUE INDEX IF NOT EXISTS attendance_date_butler_idx ON attendance(date, butler_id);',
      'CREATE TABLE IF NOT EXISTS incidents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), villa TEXT NOT NULL, category TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 0x27medium0x27, description TEXT NOT NULL, reported_by TEXT NOT NULL, reporter_id UUID, squad TEXT, photo_url TEXT, voice_url TEXT, status TEXT NOT NULL DEFAULT 0x27open0x27, resolved_at TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());',
    ].join('\n')
  })
}
