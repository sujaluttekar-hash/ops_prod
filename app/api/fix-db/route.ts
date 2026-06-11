import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'

async function runSQL(query: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  const text = await res.text()
  return { status: res.status, body: text }
}

export async function GET() {
  const results: Record<string, any> = {}

  const sqls = [
    'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_butler_id_fkey',
    'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_property_id_fkey', 
    'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_type_check',
    'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE',
    'ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey',
  ]

  for (const sql of sqls) {
    const r = await runSQL(sql)
    results[sql.slice(0, 50)] = `${r.status}: ${r.body.slice(0, 100)}`
  }

  // Read tasks to see what's there
  const tasksRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks?select=id,type,butler_id,status,notes&order=created_at.desc&limit=10`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  })
  const tasks = await tasksRes.json()

  return NextResponse.json({ sqls: results, tasks, tasksCount: Array.isArray(tasks) ? tasks.length : 0 })
}
