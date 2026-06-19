import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const H    = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json' }

// Admin UUID — gets in-app notification
const ADMIN_ID = 'd035c01f-6987-4e76-8ab7-a562235ed2c8'
const SUJAL_ID = '8d5da751-3269-4d77-b837-45253a9435c5'

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

  // Check hardcoded users
  if (USERS[key]) {
    userName = USERS[key].name
    userPassword = USERS[key].password
  } else {
    // Check DB for dynamic users
    try {
      const res = await fetch(
        `${SURL}/rest/v1/profiles?email=eq.${encodeURIComponent(key)}&is_active=eq.true&select=name,password_hash`,
        { headers: H }
      )
      const users = await res.json()
      if (Array.isArray(users) && users.length > 0 && users[0].password_hash) {
        userName = users[0].name
        userPassword = users[0].password_hash
      }
    } catch {}
  }

  if (!userName || !userPassword) {
    // Don't reveal if email exists
    return NextResponse.json({ success: true, found: false })
  }

  // Notify admin + sujal via in-app notifications
  try {
    await fetch(`${SURL}/rest/v1/notifications`, {
      method: 'POST',
      headers: { ...H, 'Prefer': 'return=minimal' },
      body: JSON.stringify([
        {
          user_id: ADMIN_ID,
          title: `🔑 Password requested`,
          body: `${userName} (${key}) used Forgot Password. Their password: ${userPassword}`,
          type: 'task',
          read: false,
        },
        {
          user_id: SUJAL_ID,
          title: `🔑 Password requested`,
          body: `${userName} (${key}) used Forgot Password. Their password: ${userPassword}`,
          type: 'task',
          read: false,
        },
      ]),
    })
  } catch (e) {
    console.error('Notification send failed:', e)
  }

  // Return password directly to show on screen
  return NextResponse.json({ success: true, found: true, name: userName, password: userPassword })
}
