import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const sb = createClient(
    'https://ryuxwnbrdsjwzwdimynd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const results: any = {}

  // Run each fix via rpc or direct query
  const fixes = [
    `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_butler_id_fkey`,
    `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_property_id_fkey`,
    `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_type_check`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey`,
  ]

  for (const sql of fixes) {
    const { error } = await sb.rpc('exec_sql', { query: sql }).catch(() => ({ error: { message: 'rpc not available' } }))
    results[sql.slice(0, 40)] = error ? error.message : 'ok'
  }

  // Check tasks table
  const { data: tasks, error: tErr } = await sb.from('tasks').select('id,type,butler_id,status,notes').order('created_at', { ascending: false }).limit(10)
  
  return NextResponse.json({ 
    results,
    tasks: tasks || [],
    tasksError: tErr?.message,
    message: 'Check tasks array to see whats in DB'
  })
}
