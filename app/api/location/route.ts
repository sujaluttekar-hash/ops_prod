import { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_HEADERS, REDASH_REG_URL, REDASH_FEED_URL, ADMIN_ID, SUJAL_ID } from '@/lib/config'
import { NextResponse } from 'next/server'

// SURL → imported as SUPABASE_URL from config
// SUPABASE_SERVICE_KEY → imported as SUPABASE_SERVICE_KEY from config
// H → use SUPABASE_SERVICE_HEADERS from config`, 'Content-Type': 'application/json' }

// POST — butler saves their location
export async function POST(req: Request) {
  const body = await req.json()
  const { butler_id, butler_name, squad, lat, lng, accuracy } = body
  if (!butler_id || !lat || !lng) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  // Upsert by butler_id using on_conflict
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/butler_locations`,
    {
      method: 'POST',
      headers: { ...SUPABASE_SERVICE_HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ butler_id, butler_name, squad, lat, lng, accuracy, updated_at: new Date().toISOString() }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    // If table doesn't exist, return a clear message
    return NextResponse.json({ error: err, hint: 'Run the SQL migration to create butler_locations table' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// GET — fetch all live butler locations
export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/butler_locations?select=*&order=updated_at.desc`,
    { headers: SUPABASE_SERVICE_HEADERS, cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json([])
  const data = await res.json()
  return NextResponse.json(Array.isArray(data) ? data : [])
}
