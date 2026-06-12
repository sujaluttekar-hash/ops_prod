import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const H = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json' }

export async function GET() {
  const results: any = {}

  // 1. Delete test tasks
  const delRes = await fetch(`${SURL}/rest/v1/tasks?type=in.("TEST - Please delete","TEST_TASK","TEST")`, {
    method: 'DELETE', headers: H
  })
  results.deletedTestTasks = delRes.status

  // 2. Check tables exist
  const tables = ['butler_locations', 'attendance']
  for (const t of tables) {
    const r = await fetch(`${SURL}/rest/v1/${t}?limit=1`, { headers: H })
    results[`table_${t}`] = r.ok ? 'EXISTS ✅' : `MISSING ❌ (${r.status})`
  }

  // 3. Task counts
  const tasksR = await fetch(`${SURL}/rest/v1/tasks?select=id,status`, { headers: H })
  const tasks = await tasksR.json()
  results.totalTasks = Array.isArray(tasks) ? tasks.length : 'error'
  results.pendingTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'pending').length : 0

  // 4. Butler locations
  const locR = await fetch(`${SURL}/rest/v1/butler_locations?select=butler_name,updated_at`, { headers: H })
  const locs = await locR.json()
  results.butlerLocations = Array.isArray(locs) ? locs.length : 'table missing'

  return NextResponse.json(results)
}
