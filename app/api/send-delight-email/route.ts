import { NextResponse } from 'next/server'

const TO = 'sujal.uttekar@stayvista.com'

export async function POST(req: Request) {
  const body = await req.json()
  const { entry, approvedBy, photos } = body

  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) {
    console.log('[delight-email] No RESEND_API_KEY set — skipping email')
    return NextResponse.json({ sent: false, reason: 'no_api_key' })
  }

  const photoCount = (photos || []).length
  const approvedCount = (photos || []).filter((p: any) => p.photo_status === 'approved').length

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,sans-serif;">
<div style="max-width:500px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.07);">
  <div style="height:3px;background:linear-gradient(90deg,#9CCCFC,#FED5A9,#E9A0A7);"></div>
  <div style="padding:28px 32px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <div style="width:36px;height:36px;background:linear-gradient(135deg,#9CCCFC,#E9A0A7);border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;">S</div>
      <div>
        <div style="font-size:13px;font-weight:700;color:#1B1D1F;letter-spacing:1px;">STAYVISTA</div>
        <div style="font-size:10px;color:#9CA3AF;">Butler Operations</div>
      </div>
    </div>
    <h2 style="font-size:18px;font-weight:700;color:#1B1D1F;margin:0 0 4px;">✅ Guest delight acknowledged</h2>
    <p style="font-size:13px;color:#6B7280;margin:0 0 20px;">A delight entry has been acknowledged and marked complete.</p>
    <div style="background:#F7F7F5;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        ${[
          ['Villa',         entry.villa_name || '—'],
          ['Butler',        entry.your_name || '—'],
          ['Squad',         entry.squad || '—'],
          ['Booking ID',    entry.booking_id ? `#${entry.booking_id}` : '—'],
          ['Booking type',  entry.booking_type || '—'],
          ['Booking date',  entry.booking_date || '—'],
          ['Photos',        `${approvedCount} approved / ${photoCount} total`],
          ['Acknowledged by', approvedBy || 'Admin'],
          ['Status',        '✅ Completed'],
        ].map(([k, v]) => `
        <tr>
          <td style="font-size:11px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;padding:5px 0;width:40%;">${k}</td>
          <td style="font-size:13px;font-weight:600;color:#1B1D1F;padding:5px 0;">${v}</td>
        </tr>`).join('')}
      </table>
    </div>
    <a href="https://ops-prod-sujals-projects-0d52b5a2.vercel.app/delight"
      style="display:block;text-align:center;background:#9CCCFC;color:#1B1D1F;text-decoration:none;padding:12px;border-radius:10px;font-weight:700;font-size:13px;">
      View in app →
    </a>
    <p style="font-size:11px;color:#9CA3AF;text-align:center;margin:14px 0 0;">StayVista Butler Ops · This is an automated notification</p>
  </div>
</div>
</body></html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'StayVista Butler Ops <onboarding@resend.dev>',
        to: [TO],
        subject: `✅ Delight acknowledged — ${entry.villa_name || 'villa'} by ${entry.your_name || 'butler'}`,
        html,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('[delight-email] Resend error:', data)
      return NextResponse.json({ sent: false, error: data })
    }
    console.log('[delight-email] Sent to', TO, 'id:', data.id)
    return NextResponse.json({ sent: true, id: data.id })
  } catch (e: any) {
    console.error('[delight-email] Exception:', e.message)
    return NextResponse.json({ sent: false, error: e.message })
  }
}
