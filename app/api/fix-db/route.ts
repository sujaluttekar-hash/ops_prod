import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const butlerId = searchParams.get('butler') || 'f3ad17de-169d-4832-93e9-6f3a1b30b1e2'
  const butlerName = searchParams.get('name') || 'Kohinoor Shinde'

  // Simulate EXACT butler query — all tasks, filter client-side
  const allRes = await fetch(
    `${SUPABASE_URL}/rest/v1/tasks?select=id,type,butler_id,status,notes&order=created_at.desc`,
    { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
  )
  const allTasks = await allRes.json()

  // Filter exactly as the app does
  const mine = Array.isArray(allTasks) ? allTasks.filter((t: any) =>
    t.butler_id === butlerId ||
    t.notes?.includes(`ButlerID: ${butlerId}`) ||
    t.notes?.includes(`Butler: ${butlerName}`)
  ) : []

  // Also check RLS - try with anon key
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzOTkxNTgsImV4cCI6MjA5NTk3NTE1OH0.fhv7K_QqLsPXQdJazgF6sf1upjt5WFeLRGfH5r8oAzQ'
  const anonRes = await fetch(
    `${SUPABASE_URL}/rest/v1/tasks?select=id,type,butler_id,status&order=created_at.desc&limit=5`,
    { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
  )
  const anonTasks = await anonRes.json()

  return NextResponse.json({
    butlerId,
    butlerName,
    totalTasksInDB: Array.isArray(allTasks) ? allTasks.length : 0,
    myTasksFound: mine.length,
    myTasks: mine.map((t: any) => ({ id: t.id, type: t.type, butler_id: t.butler_id, status: t.status })),
    anonQueryResult: anonTasks,
    anonCount: Array.isArray(anonTasks) ? anonTasks.length : 'error: ' + JSON.stringify(anonTasks)
  })
}
