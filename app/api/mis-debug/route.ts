import { NextResponse } from 'next/server'
const REG_URL  = 'https://redash.vistarooms.com/api/queries/847/results.csv?api_key=wB001NJMVA6OphBjPx39ktwoiihkiKwsksYF4eQC'
const FEED_URL = 'https://redash.vistarooms.com/api/queries/849/results.csv?api_key=im0PtIJYIygAazC7CyDNdkMCRxd2c9fxrRavG9v7'
function parseCSV(csv: string) {
  const lines = csv.trim().split('\n'); if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''))
  return lines.slice(1).map(line => {
    const vals: string[] = []; let cur = '', inQ = false
    for (const ch of line) { if (ch === '"') { inQ = !inQ; continue } if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue } cur += ch }
    vals.push(cur.trim()); const obj: Record<string,string> = {}; headers.forEach((h,i) => { obj[h] = (vals[i]||'').trim() }); return obj
  })
}
export async function GET() {
  const [rr, fr] = await Promise.all([fetch(REG_URL), fetch(FEED_URL)])
  const [rc, fc] = await Promise.all([rr.text(), fr.text()])
  const reg = parseCSV(rc); const feed = parseCSV(fc)
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
