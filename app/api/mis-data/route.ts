import { NextResponse } from 'next/server'

const REG_URL  = 'https://redash.vistarooms.com/api/queries/847/results.csv?api_key=wB001NJMVA6OphBjPx39ktwoiihkiKwsksYF4eQC'
const FEED_URL = 'https://redash.vistarooms.com/api/queries/849/results.csv?api_key=im0PtIJYIygAazC7CyDNdkMCRxd2c9fxrRavG9v7'

let cache: { reg: any[]; feed: any[]; ts: number } | null = null
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

// Parse DD-Mon-YYYY → Date
function parseDate(s: string): Date | null {
  if (!s || s === 'NA') return null
  const months: Record<string,number> = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11}
  const parts = s.split('-')
  if (parts.length !== 3) return null
  const [d, mon, y] = parts
  const month = months[mon]
  if (month === undefined) return null
  return new Date(parseInt(y), month, parseInt(d))
}

async function getData() {
  if (cache && Date.now() - cache.ts < TTL) return cache
  const [rr, fr] = await Promise.all([fetch(REG_URL), fetch(FEED_URL)])
  const [rc, fc] = await Promise.all([rr.text(), fr.text()])
  const reg = parseCSV(rc)
  const feed = parseCSV(fc)
  cache = { reg, feed, ts: Date.now() }
  return cache
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') || '0') // 0-based
  const year  = parseInt(searchParams.get('year')  || String(new Date().getFullYear()))
  // Butler names from app
  const butlerNames = (searchParams.get('butlers') || '').split(',').filter(Boolean)

  try {
    const { reg, feed } = await getData()

    // Date range
    const startDate = new Date(year, month, 1)
    const endDate   = new Date(year, month+1, 0) // last day

    function inRange(row: any) {
      const d = parseDate(row.checkin || row.checkout)
      if (!d) return false
      return d >= startDate && d <= endDate
    }

    // Filter rows for this month
    const regMonth  = reg.filter(inRange)
    const feedMonth = feed.filter(inRange)

    // Build per-butler metrics
    const results: Record<string, any> = {}

    for (const name of butlerNames) {
      const nameLower = name.toLowerCase().trim()

      // Registration rows for this butler
      // Match by Sem_Name (SEM is the butler equivalent in registration data)
      const butlerRegRows = regMonth.filter(r =>
        (r.Sem_Name||r.sem_name||'').toLowerCase().trim() === nameLower ||
        (r.squad_name||'').toLowerCase().trim() === nameLower
      )

      // Unique booking IDs (utilisation)
      const uniqueBookingIds = new Set(butlerRegRows.map(r => r.booking_id).filter(Boolean))
      // Non-booking tasks: we don't have this from Redash — it comes from app DB
      // Will be merged with app data on frontend
      const utilisation = uniqueBookingIds.size

      // 7 star: % of bookings (by this butler's squad/sem) with primary_rating = "5"
      const feedButler = feedMonth.filter(r =>
        (r.sem_name||r.Sem_Name||'').toLowerCase().trim() === nameLower ||
        butlerRegRows.some(br => br.booking_id === r.booking_id) // bookings handled by this butler
      )
      const ratedBookings = feedButler.filter(r => r.primary_rating && r.primary_rating !== 'NA')
      const fiveStarBookings = ratedBookings.filter(r => parseFloat(r.primary_rating) >= 4.5)
      const sevenStarPct = ratedBookings.length > 0
        ? Math.round(fiveStarBookings.length / ratedBookings.length * 100)
        : null

      // OTA Review: bookings with primary_rating on OTA platforms / total non-NB bookings
      const otaBookings = feedButler.filter(r =>
        r.primary_source && !['vista','direct','offline','na'].some(s => (r.primary_source||'').toLowerCase().includes(s))
      )
      const otaRated = otaBookings.filter(r => r.primary_rating && r.primary_rating !== 'NA' && parseFloat(r.primary_rating) >= 4.5)
      const otaPct = otaBookings.length > 0
        ? Math.round(otaRated.length / otaBookings.length * 100)
        : null

      // Guest Registration: Guest Registration = "1" / total bookings for this butler
      const totalBookings = butlerRegRows.length
      const registeredBookings = butlerRegRows.filter(r => r['Guest Registration'] === '1').length
      const registrationPct = totalBookings > 0
        ? Math.round(registeredBookings / totalBookings * 100)
        : null

      results[name] = {
        utilisation_from_redash: utilisation,
        seven_star_pct: sevenStarPct,
        ota_pct: otaPct,
        registration_pct: registrationPct,
        registration_total: totalBookings,
        registration_done: registeredBookings,
        rated_bookings: ratedBookings.length,
        five_star: fiveStarBookings.length,
        ota_total: otaBookings.length,
        ota_five_star: otaRated.length,
      }
    }

    return NextResponse.json({ results, month, year })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
