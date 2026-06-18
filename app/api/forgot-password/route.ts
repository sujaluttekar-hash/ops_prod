import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const ADMIN_EMAIL = 'sujal.uttekar@stayvista.com'

// Hardcoded user list (matches login page)
const USERS: Record<string, { name: string; password: string; role: string }> = {
  'admin@stayvista.com':         { name: 'Aditi',           password: 'StayVista@2026', role: 'super_admin' },
  'sujal@stayvista.com':         { name: 'Sujal',           password: 'sujal@123',      role: 'ops_manager' },
  'sujal.uttekar@stayvista.com': { name: 'Sujal Uttekar',   password: 'StayVista@2026', role: 'butler'      },
  'atish@stayvista.com':         { name: 'Atish Tandkar',   password: 'atish@123',      role: 'butler'      },
  'kalpesh@stayvista.com':       { name: 'Kalpesh Ther',    password: 'kalpesh@123',    role: 'butler'      },
  'kohinoor@stayvista.com':      { name: 'Kohinoor Shinde', password: 'kohinoor@123',   role: 'butler'      },
  'manoj@stayvista.com':         { name: 'Manoj Valmiki',   password: 'manoj@123',      role: 'butler'      },
  'nimish@stayvista.com':        { name: 'Nimish',          password: 'nimish@123',     role: 'butler'      },
  'butler@stayvista.com':        { name: 'Ravi Kumar',      password: 'butler@123',     role: 'butler'      },
  'vinayak@stayvista.com':       { name: 'Vinayak Kharade', password: 'vinayak@123',    role: 'butler'      },
  'vishal@stayvista.com':        { name: 'Vishal',          password: 'vishal@123',     role: 'butler'      },
}

async function sendEmail(to: string, subject: string, html: string) {
  // Use Resend free tier (100 emails/day free, no credit card)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY || 're_placeholder'}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'StayVista Butler Ops <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  })
  return res.ok
}

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const key = email.toLowerCase().trim()

  // Check hardcoded users first
  let userName = ''
  let userPassword = ''
  let found = false

  if (USERS[key]) {
    userName = USERS[key].name
    userPassword = USERS[key].password
    found = true
  } else {
    // Check DB for newly added users
    try {
      const res = await fetch(
        `${SURL}/rest/v1/profiles?email=eq.${encodeURIComponent(key)}&is_active=eq.true&select=name,password_hash`,
        { headers: { 'apikey': SVC, 'Authorization': `Bearer ${SVC}` } }
      )
      const users = await res.json()
      if (Array.isArray(users) && users.length > 0) {
        userName = users[0].name
        userPassword = users[0].password_hash || '(contact admin)'
        found = true
      }
    } catch {}
  }

  if (!found) {
    // Don't reveal if email exists — always return success
    return NextResponse.json({ success: true })
  }

  const userHtml = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #9CCCFC, #E9A0A7); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: #fff;">S</div>
        <div style="font-size: 16px; font-weight: 700; color: #1B1D1F; margin-top: 10px; letter-spacing: 1px;">STAYVISTA</div>
        <div style="font-size: 12px; color: #9CA3AF;">Butler Operations Platform</div>
      </div>
      <h2 style="font-size: 20px; font-weight: 700; color: #1B1D1F; margin-bottom: 8px;">Your login credentials</h2>
      <p style="color: #6B7280; font-size: 14px; margin-bottom: 24px;">Hi ${userName}, here are your login details for the StayVista Butler Ops app.</p>
      <div style="background: #F7F7F5; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Email</div>
          <div style="font-size: 15px; font-weight: 600; color: #1B1D1F;">${key}</div>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Password</div>
          <div style="font-size: 15px; font-weight: 700; color: #1B1D1F; font-family: monospace; background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.08);">${userPassword}</div>
        </div>
      </div>
      <a href="https://ops-prod.vercel.app" style="display: block; text-align: center; background: #9CCCFC; color: #1B1D1F; text-decoration: none; padding: 13px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-bottom: 20px;">Open app → ops-prod.vercel.app</a>
      <p style="font-size: 12px; color: #9CA3AF; text-align: center;">If you didn't request this, please ignore this email or contact your supervisor.</p>
    </div>
  `

  const adminHtml = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h2 style="font-size: 18px; color: #1B1D1F;">Password reset requested</h2>
      <p style="color: #6B7280; font-size: 14px;"><strong>${userName}</strong> (${key}) requested their password on the StayVista Butler Ops platform.</p>
      <div style="background: #F7F7F5; border-radius: 10px; padding: 16px 20px; margin: 16px 0;">
        <div style="font-size: 12px; color: #9CA3AF; margin-bottom: 4px;">Their password was sent to them:</div>
        <div style="font-family: monospace; font-size: 15px; font-weight: 700;">${userPassword}</div>
      </div>
      <p style="font-size: 12px; color: #9CA3AF;">No action needed — this is just a notification.</p>
    </div>
  `

  // Send both emails (non-blocking — don't fail if Resend not configured)
  const RESEND_KEY = process.env.RESEND_API_KEY
  if (RESEND_KEY && RESEND_KEY !== 're_placeholder') {
    await Promise.allSettled([
      sendEmail(key, 'Your StayVista Butler Ops login credentials', userHtml),
      sendEmail(ADMIN_EMAIL, `Password request from ${userName}`, adminHtml),
    ])
  } else {
    // Log to console if no API key configured
    console.log(`[Forgot Password] ${userName} (${key}) requested password: ${userPassword}`)
    console.log(`[Forgot Password] Notification would be sent to ${ADMIN_EMAIL}`)
  }

  return NextResponse.json({ success: true })
}
