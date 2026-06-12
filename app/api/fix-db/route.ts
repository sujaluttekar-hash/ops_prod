import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const H = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json' }

export async function GET() {
  // Try inserting directly to see if table exists
  const testRes = await fetch(`${SURL}/rest/v1/butler_locations?limit=1`, {
    headers: { 'apikey': SVC, 'Authorization': `Bearer ${SVC}` }
  })
  const testData = await testRes.json()
  const tableExists = testRes.ok && !testData?.code

  return NextResponse.json({
    tableExists,
    tableStatus: testRes.status,
    message: tableExists
      ? 'butler_locations table EXISTS ✅'
      : 'butler_locations table MISSING ❌ — run SQL in Supabase dashboard',
    sql: `CREATE TABLE IF NOT EXISTS butler_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  butler_id UUID NOT NULL,
  butler_name TEXT NOT NULL,
  squad TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS butler_locations_butler_id_idx ON butler_locations(butler_id);`
  })
}
