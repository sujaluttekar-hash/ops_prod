import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const H = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}` }

export async function GET() {
  // Fetch recent tasks with their exact created_at and type
  const r = await fetch(`${SURL}/rest/v1/tasks?select=id,type,butler_id,notes,created_at,status&order=created_at.desc&limit=20`, { headers: H })
  const tasks = await r.json()
  
  // Show exactly what the monthly query would see for June 2026
  const r2 = await fetch(`${SURL}/rest/v1/tasks?select=id,type,butler_id,notes,created_at&created_at=gte.2026-06-01T00:00:00&created_at=lte.2026-06-30T23:59:59&order=created_at.desc`, { headers: H })
  const juneTasks = await r2.json()

  return NextResponse.json({
    recent20: tasks.map((t: any) => ({ type: t.type, created_at: t.created_at, date_slice: t.created_at?.slice(0,10), notes_snippet: t.notes?.slice(0,60) })),
    june_tasks_count: Array.isArray(juneTasks) ? juneTasks.length : 'error',
    june_roster_tasks: Array.isArray(juneTasks) ? juneTasks.filter((t: any) => ['Check-In','Check-Out','Booking','Non Booking'].includes(t.type)).map((t: any) => ({ type: t.type, created_at: t.created_at, date: t.created_at?.slice(0,10) })) : [],
  })
}
