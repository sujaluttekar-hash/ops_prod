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

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const key = email.toLowerCase().trim()
  let userName = ''
  let userPassword = ''

  if (USERS[key]) {
    userName = USERS[key].name
    userPassword = USERS[key].password
  } else {
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

  if (!userName) return NextResponse.json({ success: true })

  // Try multiple email providers in order
  const RESEND_KEY = process.env.RESEND_API_KEY
  const BREVO_KEY  = process.env.BREVO_API_KEY

  const subject = `StayVista Butler Ops — Login credentials for ${userName}`
  const textBody = `Hi ${userName},\n\nYour login credentials:\nEmail: ${key}\nPassword: ${userPassword}\n\nApp URL: https://ops-prod-sujals-projects-0d52b5a2.vercel.app\n\nStayVista Butler Ops Team`

  const htmlBody = `<div style="font-family:sans-serif;max-width:460px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:14px;">
<div style="height:3px;background:linear-gradient(90deg,#9CCCFC,#FED5A9,#E9A0A7);border-radius:2px;margin-bottom:28px;"></div>
<h2 style="font-size:20px;color:#1B1D1F;margin:0 0 6px;">Hi ${userName} 👋</h2>
<p style="color:#6B7280;font-size:14px;margin:0 0 22px;">Your login credentials for StayVista Butler Ops:</p>
<div style="background:#F7F7F5;border-radius:10px;padding:18px 20px;margin-bottom:22px;">
  <div style="margin-bottom:12px;">
    <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:4px;">Email</div>
    <div style="font-size:15px;font-weight:600;color:#1B1D1F;">${key}</div>
  </div>
  <div>
    <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:4px;">Password</div>
    <div style="font-size:20px;font-weight:700;color:#1B1D1F;font-family:monospace;background:#fff;padding:10px 14px;border-radius:8px;border:2px solid #9CCCFC;">${userPassword}</div>
  </div>
</div>
<a href="https://ops-prod-sujals-projects-0d52b5a2.vercel.app" style="display:block;text-align:center;background:#9CCCFC;color:#1B1D1F;text-decoration:none;padding:13px;border-radius:10px;font-weight:700;font-size:14px;">Open app →</a>
</div>`

  const results: string[] = []

  // 1. Try Brevo (sends from any email, no domain needed)
  if (BREVO_KEY) {
    try {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'StayVista Butler Ops', email: 'noreply@stayvista.com' },
          to: [{ email: key, name: userName }],
          bcc: [{ email: ADMIN_EMAIL, name: 'Sujal (Admin)' }],
          subject,
          htmlContent: htmlBody,
          textContent: textBody,
        }),
      })
      const d = await r.json()
      if (r.ok) { results.push('brevo:ok'); }
      else results.push(`brevo:fail:${JSON.stringify(d)}`)
    } catch (e: any) { results.push(`brevo:error:${e.message}`) }
  }

  // 2. Try Resend (sends to verified emails on free plan)
  if (RESEND_KEY && !results.includes('brevo:ok')) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'StayVista Butler Ops <onboarding@resend.dev>',
          to: [key, ADMIN_EMAIL],
          subject,
          html: htmlBody,
        }),
      })
      const d = await r.json()
      if (r.ok) results.push('resend:ok')
      else results.push(`resend:fail:${JSON.stringify(d)}`)
    } catch (e: any) { results.push(`resend:error:${e.message}`) }
  }

  console.log('[forgot-password]', key, userName, results)
  return NextResponse.json({ success: true, debug: results })
}
