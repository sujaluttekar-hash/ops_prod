import { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_HEADERS, ADMIN_ID, SUJAL_ID, APP_USERS } from '@/lib/config'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const key = email.toLowerCase().trim()
  let userName = ''
  let userPassword = ''

  // Check hardcoded users
  if (APP_USERS[key]) {
    userName = APP_USERS[key].name
    userPassword = APP_USERS[key].password
  } else {
    // Check DB for dynamic users
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(key)}&is_active=eq.true&select=name,password_hash`,
        { headers: SUPABASE_SERVICE_HEADERS }
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
    await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: 'POST',
      headers: { ...SUPABASE_SERVICE_HEADERS, 'Prefer': 'return=minimal' },
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
