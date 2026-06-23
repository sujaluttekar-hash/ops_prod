import { NextResponse } from 'next/server'

const REG_URL  = 'https://redash.vistarooms.com/api/queries/847/results.csv?api_key=wB001NJMVA6OphBjPx39ktwoiihkiKwsksYF4eQC'
const FEED_URL = 'https://redash.vistarooms.com/api/queries/849/results.csv?api_key=im0PtIJYIygAazC7CyDNdkMCRxd2c9fxrRavG9v7'

// In-memory cache
let cache: { data: any[]; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 min

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const vals: string[] = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue }
      if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue }
      cur += ch
    }
    vals.push(cur.trim())
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim() })
    return obj
  })
}

async function getAllBookings() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data

  const [regRes, feedRes] = await Promise.all([
    fetch(REG_URL),
    fetch(FEED_URL),
  ])
  const [regCSV, feedCSV] = await Promise.all([regRes.text(), feedRes.text()])
  const regRows  = parseCSV(regCSV)
  const feedRows = parseCSV(feedCSV)

  // Merge — registration is the primary source
  const map = new Map<string, any>()
  
  regRows.forEach(r => {
    map.set(r.booking_id, {
      booking_id:   r.booking_id,
      guest_name:   r.guest_name,
      villa_name:   r.vista_name || r.property_name,
      checkin:      r.checkin,
      checkout:     r.checkout,
      pax:          r.number_of_pax,
      source:       'registration',
      guest_reg_pct: r['Guest Details Collection %'],
      id_pct:       r['IDs Collection%'],
      indemnity_pct: r['Indemnity Collection %'],
      guest_registration: r['Guest Registration'],
    })
  })

  feedRows.forEach(f => {
    if (!map.has(f.booking_id)) {
      map.set(f.booking_id, {
        booking_id: f.booking_id,
        guest_name: f.guest_name,
        villa_name: f.property_name,
        checkin:    f.checkin,
        checkout:   f.checkout,
        source:     'feedback',
        rating:     f.primary_rating,
        comment:    f.comment,
        platform:   f.posted_on,
      })
    } else {
      // Enrich existing with feedback
      const existing = map.get(f.booking_id)
      map.set(f.booking_id, {
        ...existing,
        rating:   f.primary_rating,
        comment:  f.comment,
        platform: f.posted_on,
        feedback_date: f.feedback_created_date,
      })
    }
  })

  const data = Array.from(map.values())
  cache = { data, ts: Date.now() }
  return data
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim().toLowerCase()

  try {
    const all = await getAllBookings()

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [], total: all.length })
    }

    const results = all.filter(b =>
      b.booking_id?.toLowerCase().includes(q) ||
      b.guest_name?.toLowerCase().includes(q) ||
      b.villa_name?.toLowerCase().includes(q)
    ).slice(0, 8)

    return NextResponse.json({ results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
