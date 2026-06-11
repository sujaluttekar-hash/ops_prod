import { NextResponse } from 'next/server'

const URL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const h = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json' }

export async function GET() {
  // Get actual columns from notifications table via OPTIONS
  const optRes = await fetch(`${URL}/rest/v1/notifications`, { method: 'GET', headers: { ...h, 'Accept': 'application/json' } })
  const notifRows = await optRes.json()
  const cols = notifRows.length > 0 ? Object.keys(notifRows[0]) : 'empty table'

  // Try minimal insert - just required fields, discover what works
  const attempts: any[] = []
  
  // Attempt 1: full schema
  const r1 = await fetch(`${URL}/rest/v1/notifications`, { method: 'POST', headers: { ...h, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ user_id: 'f3ad17de-169d-4832-93e9-6f3a1b30b1e2', title: 'Test', message: 'Test msg', type: 'info', read: false }) })
  attempts.push({ attempt: 'full schema', status: r1.status, body: await r1.text() })

  // Attempt 2: without type
  const r2 = await fetch(`${URL}/rest/v1/notifications`, { method: 'POST', headers: { ...h, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ user_id: 'f3ad17de-169d-4832-93e9-6f3a1b30b1e2', title: 'Test', message: 'Test msg', read: false }) })
  attempts.push({ attempt: 'no type', status: r2.status, body: await r2.text() })

  // Attempt 3: body column instead of message
  const r3 = await fetch(`${URL}/rest/v1/notifications`, { method: 'POST', headers: { ...h, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ user_id: 'f3ad17de-169d-4832-93e9-6f3a1b30b1e2', title: 'Test', body: 'Test msg', type: 'info', read: false }) })
  attempts.push({ attempt: 'body instead of message', status: r3.status, body: await r3.text() })

  // Attempt 4: content column
  const r4 = await fetch(`${URL}/rest/v1/notifications`, { method: 'POST', headers: { ...h, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ user_id: 'f3ad17de-169d-4832-93e9-6f3a1b30b1e2', title: 'Test', content: 'Test msg', is_read: false }) })
  attempts.push({ attempt: 'content + is_read', status: r4.status, body: await r4.text() })

  return NextResponse.json({ existingRows: notifRows.slice(0,2), columns: cols, attempts })
}
