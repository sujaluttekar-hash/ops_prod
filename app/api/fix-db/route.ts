import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const H = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json' }

export async function GET() {
  const results: any = {}

  // 1. Check if butler_locations table exists
  const checkRes = await fetch(`${SURL}/rest/v1/butler_locations?limit=1`, {
    headers: { 'apikey': SVC, 'Authorization': `Bearer ${SVC}` }
  })
  results.butler_locations_exists = checkRes.ok ? '✅ EXISTS' : `❌ MISSING (${checkRes.status})`

  // 2. Check attendance table
  const attRes = await fetch(`${SURL}/rest/v1/attendance?limit=1`, {
    headers: { 'apikey': SVC, 'Authorization': `Bearer ${SVC}` }
  })
  results.attendance_exists = attRes.ok ? '✅ EXISTS' : `❌ MISSING (${attRes.status})`

  // 3. Try inserting a test location (Lonavala center)
  if (checkRes.ok) {
    const testInsert = await fetch(`${SURL}/rest/v1/butler_locations`, {
      method: 'POST',
      headers: { ...H, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        butler_id: '24e03c68-5cd0-47aa-a695-75850ac2a81d',
        butler_name: 'Test Butler',
        squad: 'Lonavala',
        lat: 18.754,
        lng: 73.405,
        accuracy: 10,
        updated_at: new Date().toISOString()
      })
    })
    results.test_insert = testInsert.ok ? '✅ Insert works' : `❌ Insert failed (${testInsert.status}: ${await testInsert.text()})`
  }

  // 4. Read all locations
  if (checkRes.ok) {
    const locsRes = await fetch(`${SURL}/rest/v1/butler_locations?select=*`, {
      headers: { 'apikey': SVC, 'Authorization': `Bearer ${SVC}` }
    })
    const locs = await locsRes.json()
    results.locations_count = Array.isArray(locs) ? locs.length : 'error'
    results.locations = Array.isArray(locs) ? locs : locs
  }

  results.sql_to_run = `-- Run this in Supabase SQL Editor if tables are missing:
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
  check_in TEXT,
  check_out TEXT,
  geo_lat DOUBLE PRECISION,
  geo_lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_date_butler_idx ON attendance(date, butler_id);`

  return NextResponse.json(results)
}
