import { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_HEADERS } from '@/lib/config'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const uid  = searchParams.get('uid')
  const name = searchParams.get('name')
  const all  = searchParams.get('all') === '1'

  try {
    // Use * to avoid breaking if optional columns (geo_lat, voice_url etc) don't exist yet
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?select=*&order=created_at.desc&limit=500`,
      { headers: SUPABASE_SERVICE_HEADERS, cache: 'no-store' }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('Tasks API error:', res.status, err)
      return NextResponse.json({ error: `Supabase error ${res.status}`, detail: err }, { status: 500 })
    }

    const tasks = await res.json()

    if (!Array.isArray(tasks)) {
      console.error('Tasks API: unexpected response', tasks)
      return NextResponse.json({ error: 'Unexpected response from DB', raw: tasks }, { status: 500 })
    }

    // Admin/supervisor — return all
    if (all || (!uid && !name)) {
      return NextResponse.json(tasks)
    }

    // Butler — filter to their own tasks only
    const mine = tasks.filter((t: any) =>
      (uid  && t.butler_id === uid) ||
      (uid  && t.notes?.includes('ButlerID: ' + uid)) ||
      (name && t.notes?.includes('Butler: ' + name))
    )

    return NextResponse.json(mine)

  } catch (e: any) {
    console.error('Tasks API exception:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
