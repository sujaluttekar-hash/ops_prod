import { getRedashData } from '@/lib/redash-cache'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get('booking_id')?.trim()
  if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  try {
    const { reg: regRows, feed: feedRows } = await getRedashData()
    const reg  = regRows.find((r:any)  => r.booking_id  === bookingId)
    const feed = feedRows.find((f:any) => f.booking_id === bookingId)

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
        guest_registration:  reg['Guest Registration'],
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
