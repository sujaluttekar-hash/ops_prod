import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const H    = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' }

// POST — butler saves their location
export async function POST(req: Request) {
  const { butler_id, butler_name, squad, lat, lng, accuracy } = await req.json()
  if (!butler_id || !lat || !lng) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  const res = await fetch(`${SURL}/rest/v1/butler_locations`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ butler_id, butler_name, squad, lat, lng, accuracy, updated_at: new Date().toISOString() }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// GET — admin fetches all live locations
export async function GET() {
  const res = await fetch(
    `${SURL}/rest/v1/butler_locations?select=*&order=updated_at.desc`,
    { headers: { 'apikey': SVC, 'Authorization': `Bearer ${SVC}` }, cache: 'no-store' }
  )
  const data = await res.json()
  return NextResponse.json(Array.isArray(data) ? data : [])
}
