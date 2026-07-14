import { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_HEADERS, REDASH_REG_URL, REDASH_FEED_URL, ADMIN_ID, SUJAL_ID } from '@/lib/config'
import { NextResponse } from 'next/server'

// SURL → imported as SUPABASE_URL from config
// SUPABASE_SERVICE_KEY → imported as SUPABASE_SERVICE_KEY from config
// H → use SUPABASE_SERVICE_HEADERS from config` }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const uid = searchParams.get('uid')
  const name = searchParams.get('name')
  const all = searchParams.get('all') === '1'

  // Fetch all tasks via REST API (server-side — guaranteed service key access)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tasks?select=id,type,status,butler_id,notes,due_time,geo_lat,geo_lng,photo_path,completed_at&order=created_at.desc`,
    { headers: SUPABASE_SERVICE_HEADERS, cache: 'no-store' }
  )
  const tasks = await res.json()

  if (!Array.isArray(tasks)) {
    return NextResponse.json({ error: 'Failed to fetch', raw: tasks }, { status: 500 })
  }

  // If admin/all, return everything
  if (all || (!uid && !name)) {
    return NextResponse.json(tasks)
  }

  // Filter for this butler
  const mine = tasks.filter((t: any) =>
    (uid && t.butler_id === uid) ||
    (uid && t.notes && t.notes.includes('ButlerID: ' + uid)) ||
    (name && t.notes && t.notes.includes('Butler: ' + name))
  )

  return NextResponse.json(mine)
}
