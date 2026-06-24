import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const REG_URL  = 'https://redash.vistarooms.com/api/queries/847/results.csv?api_key=wB001NJMVA6OphBjPx39ktwoiihkiKwsksYF4eQC'
const FEED_URL = 'https://redash.vistarooms.com/api/queries/849/results.csv?api_key=im0PtIJYIygAazC7CyDNdkMCRxd2c9fxrRavG9v7'
const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'

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

function parseDate(s: string): Date | null {
  if (!s || s === 'NA') return null
  const months: Record<string,number> = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11}
  const parts = s.split('-')
  if (parts.length !== 3) return null
  const month = months[parts[1]]
  if (month === undefined) return null
  return new Date(parseInt(parts[2]), month, parseInt(parts[0]))
}

async function getRedashData() {
  if (cache && Date.now() - cache.ts < TTL) return cache
  const [rr, fr] = await Promise.all([fetch(REG_URL), fetch(FEED_URL)])
  const [rc, fc] = await Promise.all([rr.text(), fr.text()])
  cache = { reg: parseCSV(rc), feed: parseCSV(fc), ts: Date.now() }
  return cache
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') || '0')
  const year  = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  // Support custom date range from MIS table date pickers
  const dateFromParam = searchParams.get('dateFrom')
  const dateToParam   = searchParams.get('dateTo')
  const startStr = dateFromParam || `${year}-${String(month+1).padStart(2,'0')}-01`
  const endStr   = dateToParam   || new Date(year, month+1, 0).toISOString().slice(0,10)
  const startDate = new Date(startStr + 'T00:00:00')
  const endDate   = new Date(endStr   + 'T23:59:59')

  try {
    // 1. Get all butlers
    const sb = createClient(SURL, SVC)
    const { data: butlers } = await sb.from('profiles').select('id,name,squad').eq('role','butler').eq('is_active',true).order('name')
    if (!butlers?.length) return NextResponse.json({ results: {} })

    // 2. Get delights with booking IDs for this month — this links butler → booking
    const { data: delights } = await sb.from('guest_delights')
      .select('your_name,booking_id,status')
      .gte('created_at', `${startStr}T00:00:00`)
      .lte('created_at', `${endStr}T23:59:59`)

    // 3. Get allocation tasks for utilisation
    const { data: allocTasks } = await sb.from('tasks')
      .select('type,butler_id,notes,created_at')
      .in('type', ['Check-In','Check-Out','Booking','Non Booking'])

    // 4. Get feedback tasks (7-star from tasks)
    const { data: feedbackTasks } = await sb.from('tasks')
      .select('type,butler_id,notes,status,created_at')
      .eq('type', 'Guest welcome')

    // 5. Get Redash data
    const { reg: regRows, feed: feedRows } = await getRedashData()

    // Index Redash by booking_id for O(1) lookup
    const regByBookingId = new Map(regRows.map(r => [r.booking_id, r]))
    const feedByBookingId = new Map(feedRows.map(f => [f.booking_id, f]))

    const results: Record<string, any> = {}

    for (const b of butlers) {
      const bName = b.name
      const bId = b.id

      // ── Utilisation ──────────────────────────────────────────
      // = unique booking IDs for this butler in date range + non-booking count
      const bAllocTasks = (allocTasks || []).filter((t: any) => {
        const dateFromNotes = (t.notes||'').match(/Date: (\d{4}-\d{2}-\d{2})/)?.[1]
        const d = dateFromNotes || (t.created_at||'').slice(0,10)
        if (d < startStr || d > endStr) return false
        return t.butler_id === bId || (t.notes||'').includes(`Butler: ${bName}`)
      })
      const uniqueBookingTaskIds = new Set(
        bAllocTasks
          .filter((t: any) => t.type !== 'Non Booking')
          .map((t: any) => (t.notes||'').match(/BookingID: (\S+)/)?.[1] || null)
          .filter(Boolean)
      )
      const nonBookingCount = bAllocTasks.filter((t: any) => t.type === 'Non Booking').length
      const utilisation = uniqueBookingTaskIds.size + nonBookingCount

      // ── Booking IDs from our delight table for this butler ───
      const bDelights = (delights || []).filter((d: any) =>
        (d.your_name||'').toLowerCase().trim() === bName.toLowerCase().trim() &&
        d.booking_id
      )
      const bBookingIds = [...new Set(bDelights.map((d: any) => d.booking_id).filter(Boolean))]

      // ── Guest Registration ───────────────────────────────────
      // Primary: match by booking_id butler logged in delight table
      let regForButler = bBookingIds.map(id => regByBookingId.get(id)).filter(Boolean)
      
      // Fallback: only if date range is >= 7 days (avoid showing squad data for single-day filter)
      const rangeDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      if (regForButler.length === 0 && b.squad && rangeDays >= 7) {
        const squadLower = b.squad.toLowerCase()
        regForButler = regRows.filter((r: any) => {
          const d = parseDate(r.checkin)
          if (!d || d < startDate || d > endDate) return false
          return (r.squad_name||'').toLowerCase().includes(squadLower) ||
                 squadLower.includes((r.squad_name||'').toLowerCase())
        })
      }
      
      const regDone = regForButler.filter((r: any) => r['Guest Registration'] === '1').length
      const registrationPct = regForButler.length > 0
        ? Math.round(regDone / regForButler.length * 100)
        : null

      // ── 7 Star Reviews ───────────────────────────────────────
      // Primary: by booking_id; Fallback: by squad
      let feedForButler = bBookingIds.map(id => feedByBookingId.get(id)).filter(Boolean)
      if (feedForButler.length === 0 && b.squad && rangeDays >= 7) {
        const squadLower = b.squad.toLowerCase()
        feedForButler = feedRows.filter((r: any) => {
          const d = parseDate(r.checkin)
          if (!d || d < startDate || d > endDate) return false
          return (r.squad||r.squad_name||'').toLowerCase().includes(squadLower) ||
                 squadLower.includes((r.squad||r.squad_name||'').toLowerCase())
        })
      }
      const ratedBookings = feedForButler.filter((f: any) => f?.primary_rating && f.primary_rating !== 'NA' && f.primary_rating !== '')
      const fiveStarCount = ratedBookings.filter((f: any) => parseFloat(f?.primary_rating) >= 4.5).length
      const sevenStarPct = ratedBookings.length > 0
        ? Math.round(fiveStarCount / ratedBookings.length * 100)
        : null

      // ── OTA Review ───────────────────────────────────────────
      // Bookings on OTA platforms (not Vista/Direct) with rating / total OTA bookings
      const OTA_SOURCES = ['airbnb','makemytrip','gommt','booking.com','expedia','tripadvisor','agoda']
      const otaBookings = feedForButler.filter((f: any) =>
        OTA_SOURCES.some(s => (f?.primary_source||'').toLowerCase().includes(s))
      )
      const otaRated = otaBookings.filter((f: any) => f?.primary_rating && f.primary_rating !== 'NA' && parseFloat(f.primary_rating) >= 4.5)
      const otaPct = otaBookings.length > 0
        ? Math.round(otaRated.length / otaBookings.length * 100)
        : null

      results[bName] = {
        utilisation: utilisation > 0 ? utilisation : null,
        seven_star_pct: sevenStarPct,
        ota_pct: otaPct,
        registration_pct: registrationPct,
        debug: {
          booking_ids_in_app: bBookingIds.length,
          reg_matched: regForButler.length,
          feed_matched: feedForButler.length,
          rated: ratedBookings.length,
          five_star: fiveStarCount,
        }
      }
    }

    return NextResponse.json({ results, month, year, generated_at: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
