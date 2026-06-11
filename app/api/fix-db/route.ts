import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const H = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json' }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const uid = searchParams.get('uid') || 'f3ad17de-169d-4832-93e9-6f3a1b30b1e2' // Kohinoor
  const name = searchParams.get('name') || 'Kohinoor Shinde'

  // 1. Insert a TEST task for this butler
  const taskRes = await fetch(`${SURL}/rest/v1/tasks`, {
    method: 'POST', headers: { ...H, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      type: 'TEST - Please delete',
      butler_id: uid,
      status: 'pending',
      notes: `Butler: ${name} · ButlerID: ${uid} · Villa: Test Villa`,
    })
  })
  const taskData = await taskRes.json()

  // 2. Insert a notification
  const notifRes = await fetch(`${SURL}/rest/v1/notifications`, {
    method: 'POST', headers: { ...H, 'Prefer': 'return=representation' },
    body: JSON.stringify({ user_id: uid, title: 'Test task assigned', body: `TEST notification for ${name}`, type: 'task', read: false })
  })
  const notifData = await notifRes.json()

  // 3. Fetch butler's tasks
  const tasksRes = await fetch(`${SURL}/rest/v1/tasks?select=id,type,butler_id,status&order=created_at.desc`, { headers: H })
  const allTasks = await tasksRes.json()
  const mine = Array.isArray(allTasks) ? allTasks.filter((t: any) => t.butler_id === uid) : []

  // 4. Fetch butler's notifications
  const notifsRes = await fetch(`${SURL}/rest/v1/notifications?select=id,title,body,type,read&eq.user_id=${uid}&order=created_at.desc&limit=5`, { headers: H })
  const notifs = await notifsRes.json()

  return NextResponse.json({
    taskInserted: taskRes.status === 201 ? '✅ Task saved' : `❌ Failed: ${JSON.stringify(taskData)}`,
    notifInserted: notifRes.status === 201 ? '✅ Notification saved' : `❌ Failed: ${JSON.stringify(notifData)}`,
    butlerTaskCount: mine.length,
    sampleTasks: mine.slice(0,3),
    notifications: notifs,
    action: 'Now open the butler app and hit Refresh on My Tasks page'
  })
}
