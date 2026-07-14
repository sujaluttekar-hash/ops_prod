import { getRedashData, parseRedashCSV } from '@/lib/redash-cache'
import { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_HEADERS, REDASH_REG_URL, REDASH_FEED_URL, ADMIN_ID, SUJAL_ID } from '@/lib/config'
import { NextResponse } from 'next/server'







export async function POST(req: Request) {
  const { booking_ids } = await req.json()
  if (!Array.isArray(booking_ids) || booking_ids.length === 0)
    return NextResponse.json({})

  try {
    const { reg: regRaw, feed: feedRaw } = await getRedashData()
  const reg = new Map(regRaw.map((r:any) => [r.booking_id, r]))
  const feed = new Map(feedRaw.map((f:any) => [f.booking_id, f]))
    const result: Record<string, any> = {}

    for (const id of booking_ids) {
      const r = reg.get(id)
      const f = feed.get(id)
      if (!r && !f) { result[id] = { found: false }; continue }
      result[id] = {
        found: true,
        guest_registration: r?.['Guest Registration'] === '1',
        guest_details_pct:  r?.['Guest Details Collection %'] || null,
        rating:             f?.primary_rating !== 'NA' ? f?.primary_rating : null,
        platform:           f?.posted_on || null,
        comment:            f?.comment !== 'NA' ? f?.comment : null,
        feedback_date:      f?.feedback_created_date !== 'NA' ? f?.feedback_created_date : null,
      }
    }
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
