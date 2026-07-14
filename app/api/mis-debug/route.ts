import { getRedashData, parseRedashCSV } from '@/lib/redash-cache'
import { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_HEADERS, REDASH_REG_URL, REDASH_FEED_URL, ADMIN_ID, SUJAL_ID } from '@/lib/config'
import { NextResponse } from 'next/server'
const REG_URL  = REDASH_REG_URL
const FEED_URL = REDASH_FEED_URL

export async function GET() {
  const [rr, fr] = await Promise.all([fetch(REG_URL), fetch(FEED_URL)])
  const [rc, fc] = await Promise.all([rr.text(), fr.text()])
  const reg = parseRedashCSV(rc); const feed = parseRedashCSV(fc)
  const regDates = [...new Set(reg.map(r => r.checkin).filter(Boolean))].sort()
  const feedDates = [...new Set(feed.map(f => f.checkin).filter(Boolean))].sort()
  const regSquads = [...new Set(reg.map(r => r.squad_name).filter(Boolean))].sort()
  const feedSquads = [...new Set(feed.map(f => f.squad).filter(Boolean))].sort()
  const regJune = reg.filter(r => (r.checkin||'').includes('Jun'))
  const feedJune = feed.filter(f => (f.checkin||'').includes('Jun') || f.checkout_month === 'Jun-2026')
  return NextResponse.json({
    reg_total: reg.length, reg_earliest: regDates[0], reg_latest: regDates[regDates.length-1],
    reg_squads: regSquads, reg_june_count: regJune.length, reg_june_sample: regJune[0],
    feed_total: feed.length, feed_earliest: feedDates[0], feed_latest: feedDates[feedDates.length-1],
    feed_squads: feedSquads, feed_june_count: feedJune.length, feed_june_sample: feedJune[0],
  })
}
