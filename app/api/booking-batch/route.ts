import { NextResponse } from 'next/server'

const REG_URL  = 'https://redash.vistarooms.com/api/queries/847/results.csv?api_key=wB001NJMVA6OphBjPx39ktwoiihkiKwsksYF4eQC'
const FEED_URL = 'https://redash.vistarooms.com/api/queries/849/results.csv?api_key=im0PtIJYIygAazC7CyDNdkMCRxd2c9fxrRavG9v7'

let cache: { reg: Map<string,any>; feed: Map<string,any>; ts: number } | null = null
const TTL = 5 * 60 * 1000

function parseCSV(csv: string): Record<string,string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''))
  return lines.slice(1).map(line => {
    const vals: string[] = []; let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue }
      if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue }
      cur += ch
    }
    vals.push(cur.trim())
    const obj: Record<string,string> = {}
    headers.forEach((h,i) => { obj[h] = (vals[i]||'').trim() })
    return obj
  })
}

async function getMaps() {
  if (cache && Date.now() - cache.ts < TTL) return cache
  const [rr, fr] = await Promise.all([fetch(REG_URL), fetch(FEED_URL)])
  const [rc, fc] = await Promise.all([rr.text(), fr.text()])
  const reg = new Map(parseCSV(rc).map(r => [r.booking_id, r]))
  const feed = new Map(parseCSV(fc).map(f => [f.booking_id, f]))
  cache = { reg, feed, ts: Date.now() }
  return cache
}

export async function POST(req: Request) {
  const { booking_ids } = await req.json()
  if (!Array.isArray(booking_ids) || booking_ids.length === 0)
    return NextResponse.json({})

  try {
    const { reg, feed } = await getMaps()
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
