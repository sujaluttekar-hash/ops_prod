import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const butlerId = searchParams.get('butler') || 'f3ad17de-169d-4832-93e9-6f3a1b30b1e2'
  const butlerName = searchParams.get('name') || 'Kohinoor Shinde'

  // Test notification insert with butler profile UUID
  const notifTest = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      user_id: butlerId,
      title: 'Test notification',
      message: 'Testing if FK constraint is blocking notifications',
      type: 'info',
      read: false,
    })
  })
  const notifStatus = notifTest.status
  const notifBody = await notifTest.text()

  // Test task insert
  const taskTest = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      type: 'TEST_TASK',
      butler_id: butlerId,
      status: 'pending',
      notes: `Butler: ${butlerName} · ButlerID: ${butlerId} · TEST`,
    })
  })
  const taskStatus = taskTest.status
  const taskBody = await taskTest.text()

  // Fetch butler tasks
  const tasksRes = await fetch(
    `${SUPABASE_URL}/rest/v1/tasks?select=id,type,butler_id,status,notes&order=created_at.desc`,
    { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
  )
  const allTasks = await tasksRes.json()
  const mine = Array.isArray(allTasks) ? allTasks.filter((t: any) =>
    t.butler_id === butlerId ||
    t.notes?.includes(`ButlerID: ${butlerId}`) ||
    t.notes?.includes(`Butler: ${butlerName}`)
  ) : []

  return NextResponse.json({
    notificationInsert: { status: notifStatus, body: notifBody },
    taskInsert: { status: taskStatus, body: taskBody },
    butlerTasksFound: mine.length,
    myTasks: mine.slice(0, 5),
    note: notifStatus === 201 ? 'Notification FK is FIXED ✅' : 'Notification FK still BLOCKING ❌ — run SQL in Supabase dashboard',
    taskNote: taskStatus === 201 ? 'Task insert works ✅' : 'Task insert FAILING ❌',
    sqlToRun: 'ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey; ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_butler_id_fkey; ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_type_check;'
  })
}
