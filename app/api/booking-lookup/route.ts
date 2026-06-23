import { NextResponse } from 'next/server'

const REG_URL  = 'https://redash.vistarooms.com/api/queries/847/results.csv?api_key=wB001NJMVA6OphBjPx39ktwoiihkiKwsksYF4eQC'
const FEED_URL = 'https://redash.vistarooms.com/api/queries/849/results.csv?api_key=im0PtIJYIygAazC7CyDNdkMCRxd2c9fxrRavG9v7'

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get('booking_id')?.trim()
  if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  try {
    const [regRes, feedRes] = await Promise.all([
      fetch(REG_URL, { next: { revalidate: 300 } }),
      fetch(FEED_URL, { next: { revalidate: 300 } }),
    ])
    const [regCSV, feedCSV] = await Promise.all([regRes.text(), feedRes.text()])
    const regRows  = parseCSV(regCSV)
    const feedRows = parseCSV(feedCSV)

    const reg  = regRows.find(r  => r.booking_id  === bookingId)
    const feed = feedRows.find(f => f.booking_id === bookingId)

    return NextResponse.json({
      booking_id: bookingId,
      found: !!(reg || feed),
      registration: reg ? {
        guest_name:          reg.guest_name,
        property_name:       reg.vista_name || reg.property_name,
        checkin:             reg.checkin,
        checkout:            reg.checkout,
        pax:                 reg.number_of_pax,
        guest_details_pct:   reg['Guest Details Collection %'],
        id_pct:              reg['IDs Collection%'],
        indemnity_pct:       reg['Indemnity Collection %'],
        guest_registration:  reg['Guest Registration'],  // "1" = complete
        booking_status:      reg.booking_status,
        source:              reg.primary_source,
        sem:                 reg.Sem_Name,
      } : null,
      feedback: feed ? {
        guest_name:     feed.guest_name,
        property_name:  feed.property_name,
        checkin:        feed.checkin,
        checkout:       feed.checkout,
        rating:         feed.primary_rating,
        meals_rating:   feed.meals_rating,
        comment:        feed.comment,
        platform:       feed.posted_on,
        feedback_date:  feed.feedback_created_date,
        source:         feed.primary_source,
      } : null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
