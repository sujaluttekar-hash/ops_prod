import { NextResponse } from 'next/server'

const URL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const h = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const UID = 'f3ad17de-169d-4832-93e9-6f3a1b30b1e2'

export async function GET() {
  const types = ['task', 'info', 'general', 'alert', 'system', 'delight', 'huddle', 'training']
  const results: any = {}
  for (const t of types) {
    const r = await fetch(`${URL}/rest/v1/notifications`, {
      method: 'POST', headers: { ...h, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ user_id: UID, title: 'Test', body: 'Test', type: t, read: false })
    })
    results[t] = r.status === 201 ? 'WORKS ✅' : `FAILS (${(await r.json()).message || r.status})`
  }
  return NextResponse.json(results)
}
