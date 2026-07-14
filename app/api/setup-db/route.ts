import { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_HEADERS, REDASH_REG_URL, REDASH_FEED_URL, ADMIN_ID, SUJAL_ID } from '@/lib/config'
import { NextResponse } from 'next/server'

// SURL → imported as SUPABASE_URL from config
// SUPABASE_SERVICE_KEY → imported as SUPABASE_SERVICE_KEY from config
// H → use SUPABASE_SERVICE_HEADERS from config`, 'Content-Type': 'application/json' }

export async function GET() {
  const checks: Record<string, string> = {}

  for (const t of ['incidents', 'butler_locations', 'attendance']) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?limit=1`, { headers: SUPABASE_SERVICE_HEADERS })
    checks[t] = r.ok ? 'EXISTS' : 'MISSING'
  }

  const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,password_hash&limit=1`, { headers: SUPABASE_SERVICE_HEADERS })
  const pd = await pr.json()
  checks['profiles.password_hash'] = (pr.ok && !pd?.code) ? 'EXISTS' : 'MISSING'

  const tr = await fetch(`${SUPABASE_URL}/rest/v1/tasks?select=id,voice_url,geo_lat&limit=1`, { headers: SUPABASE_SERVICE_HEADERS })
  const td = await tr.json()
  checks['tasks.extra_cols'] = (tr.ok && !td?.code) ? 'EXISTS' : 'MISSING'

  const missing = Object.entries(checks).filter(([,v]) => v === 'MISSING').map(([k]) => k)

  return NextResponse.json({
    checks,
    allGood: missing.length === 0,
    missing,
    action: missing.length === 0
      ? 'All good! App is fully set up.'
      : 'Run the SQL at supabase.com/dashboard/project/ryuxwnbrdsjwzwdimynd/sql/new',
    sql: missing.length > 0 ? [
      'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;',
      'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS voice_url TEXT;',
      'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION;',
      'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION;',
      'CREATE TABLE IF NOT EXISTS incidents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), villa TEXT NOT NULL, category TEXT NOT NULL, severity TEXT NOT NULL DEFAULT \'medium\', description TEXT NOT NULL, reported_by TEXT NOT NULL, reporter_id UUID, squad TEXT, photo_url TEXT, voice_url TEXT, status TEXT NOT NULL DEFAULT \'open\', resolved_at TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());',
      'CREATE TABLE IF NOT EXISTS butler_locations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), butler_id UUID NOT NULL, butler_name TEXT NOT NULL, squad TEXT, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, accuracy DOUBLE PRECISION, updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());',
      'CREATE UNIQUE INDEX IF NOT EXISTS butler_locations_butler_id_idx ON butler_locations(butler_id);',
      'CREATE TABLE IF NOT EXISTS attendance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE NOT NULL, butler_id UUID NOT NULL, status TEXT NOT NULL DEFAULT \'absent\', check_in TEXT, geo_lat DOUBLE PRECISION, geo_lng DOUBLE PRECISION, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());',
      'CREATE UNIQUE INDEX IF NOT EXISTS attendance_date_butler_idx ON attendance(date, butler_id);',
    ].join('\n') : null
  })
}
