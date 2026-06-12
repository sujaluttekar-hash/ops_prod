import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const H = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}` }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const uid = searchParams.get('uid')
  const name = searchParams.get('name')
  const all = searchParams.get('all') === '1'

  // Fetch all tasks via REST API (server-side — guaranteed service key access)
  const res = await fetch(
    `${SURL}/rest/v1/tasks?select=id,type,status,butler_id,notes,due_time,geo_lat,geo_lng,photo_path,completed_at&order=created_at.desc`,
    { headers: H, cache: 'no-store' }
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
