import { getRedashData } from '@/lib/redash-cache'
import { NextResponse } from 'next/server'

async function getAllBookings() {
  const { reg: regRows, feed: feedRows } = await getRedashData()
  const map = new Map<string, any>()

  regRows.forEach((r:any) => {
    map.set(r.booking_id, {
      booking_id:   r.booking_id,
      guest_name:   r.guest_name,
      villa_name:   r.vista_name || r.property_name,
      checkin:      r.checkin,
      checkout:     r.checkout,
      pax:          r.number_of_pax,
      guest_registration: r['Guest Registration'],
      squad: r.squad_name || r.squad || '',
    })
  })

  feedRows.forEach((f:any) => {
    if (!map.has(f.booking_id)) {
      map.set(f.booking_id, {
        booking_id: f.booking_id,
        guest_name: f.guest_name,
        villa_name: f.property_name,
        checkin:    f.checkin,
        squad:      f.squad || '',
        rating:     f.primary_rating,
        platform:   f.posted_on,
      })
    } else {
      const existing = map.get(f.booking_id)
      map.set(f.booking_id, { ...existing, rating: f.primary_rating, platform: f.posted_on })
    }
  })

  return Array.from(map.values())
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim().toLowerCase()

  try {
    const all = await getAllBookings()
    if (!q || q.length < 2) return NextResponse.json({ results: [], total: all.length })

    const results = all.filter((b:any) =>
      b.booking_id?.toLowerCase().includes(q) ||
      b.guest_name?.toLowerCase().includes(q) ||
      b.villa_name?.toLowerCase().includes(q)
    ).slice(0, 8)

    return NextResponse.json({ results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
