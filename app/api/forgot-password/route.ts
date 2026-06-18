import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const ADMIN_EMAIL = 'sujal.uttekar@stayvista.com'

const USERS: Record<string, { name: string; password: string }> = {
  'admin@stayvista.com':         { name: 'Aditi',           password: 'StayVista@2026' },
  'sujal@stayvista.com':         { name: 'Sujal',           password: 'sujal@123'      },
  'sujal.uttekar@stayvista.com': { name: 'Sujal Uttekar',   password: 'StayVista@2026' },
  'atish@stayvista.com':         { name: 'Atish Tandkar',   password: 'atish@123'      },
  'kalpesh@stayvista.com':       { name: 'Kalpesh Ther',    password: 'kalpesh@123'    },
  'kohinoor@stayvista.com':      { name: 'Kohinoor Shinde', password: 'kohinoor@123'   },
  'manoj@stayvista.com':         { name: 'Manoj Valmiki',   password: 'manoj@123'      },
  'nimish@stayvista.com':        { name: 'Nimish',          password: 'nimish@123'     },
  'butler@stayvista.com':        { name: 'Ravi Kumar',      password: 'butler@123'     },
  'vinayak@stayvista.com':       { name: 'Vinayak Kharade', password: 'vinayak@123'    },
  'vishal@stayvista.com':        { name: 'Vishal',          password: 'vishal@123'     },
}

async function sendViaResend(to: string[], subject: string, html: string) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set')
  
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'StayVista Butler Ops <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  })
  
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `Resend error ${res.status}`)
  return data
}

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const key = email.toLowerCase().trim()
  let userName = ''
  let userPassword = ''

  // Check hardcoded list
  if (USERS[key]) {
    userName = USERS[key].name
    userPassword = USERS[key].password
  } else {
    // Check DB
    try {
      const res = await fetch(
        `${SURL}/rest/v1/profiles?email=eq.${encodeURIComponent(key)}&is_active=eq.true&select=name,password_hash`,
        { headers: { 'apikey': SVC, 'Authorization': `Bearer ${SVC}` } }
      )
      const users = await res.json()
      if (Array.isArray(users) && users.length > 0 && users[0].password_hash) {
        userName = users[0].name
        userPassword = users[0].password_hash
      }
    } catch {}
  }

  // Always return success — don't reveal if email exists
  if (!userName) return NextResponse.json({ success: true })

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,sans-serif;">
<div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="height:3px;background:linear-gradient(90deg,#9CCCFC,#FED5A9,#E9A0A7);"></div>
  <div style="padding:36px 32px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:44px;height:44px;background:linear-gradient(135deg,#9CCCFC,#E9A0A7);border-radius:11px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;">S</div>
      <div style="font-size:14px;font-weight:700;color:#1B1D1F;margin-top:8px;letter-spacing:1.5px;">STAYVISTA</div>
      <div style="font-size:11px;color:#9CA3AF;">Butler Operations Platform</div>
    </div>
    <h2 style="font-size:20px;font-weight:700;color:#1B1D1F;margin:0 0 8px;">Hi ${userName} 👋</h2>
    <p style="font-size:14px;color:#6B7280;margin:0 0 24px;line-height:1.6;">Here are your login credentials for the StayVista Butler Ops app.</p>
    <div style="background:#F7F7F5;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <div style="margin-bottom:14px;">
        <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">Email address</div>
        <div style="font-size:15px;font-weight:600;color:#1B1D1F;">${key}</div>
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">Password</div>
        <div style="font-size:18px;font-weight:700;color:#1B1D1F;font-family:monospace;background:#fff;padding:10px 14px;border-radius:8px;border:1.5px solid #9CCCFC;letter-spacing:1px;">${userPassword}</div>
      </div>
    </div>
    <a href="https://ops-prod-sujals-projects-0d52b5a2.vercel.app" style="display:block;text-align:center;background:#9CCCFC;color:#1B1D1F;text-decoration:none;padding:13px;border-radius:10px;font-weight:700;font-size:14px;margin-bottom:20px;">Open app →</a>
    <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:0;">If you didn't request this, contact your supervisor.</p>
  </div>
</div>
</body></html>`

  const adminHtml = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;padding:24px;background:#F7F7F5;">
<div style="max-width:420px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
  <h3 style="margin:0 0 12px;color:#1B1D1F;">🔑 Password request</h3>
  <p style="color:#6B7280;font-size:14px;margin:0 0 16px;"><strong>${userName}</strong> (${key}) just requested their login credentials.</p>
  <div style="background:#F7F7F5;border-radius:8px;padding:14px;">
    <div style="font-size:11px;color:#9CA3AF;margin-bottom:4px;">Password sent to them:</div>
    <div style="font-family:monospace;font-size:16px;font-weight:700;color:#1B1D1F;">${userPassword}</div>
  </div>
</div>
</body></html>`

  try {
    // Send to user AND admin in one Resend call (cc admin)
    await sendViaResend(
      [key, ADMIN_EMAIL],
      `Your StayVista Butler Ops login — ${userName}`,
      html
    )
    return NextResponse.json({ success: true, sent: true })
  } catch (e: any) {
    console.error('[forgot-password] Email send failed:', e.message)
    // Still return success so UX isn't broken — but log the error
    return NextResponse.json({ success: true, sent: false, debug: e.message })
  }
}
