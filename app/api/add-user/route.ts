import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const H    = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json' }

export async function POST(req: Request) {
  const { name, email, password, role, squad } = await req.json()
  if (!name || !email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Generate UUID
  const uuid = crypto.randomUUID()

  // 1. Insert into profiles table
  const profileRes = await fetch(`${SURL}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...H, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ id: uuid, name, email, role, squad: squad || null, is_active: true, created_at: new Date().toISOString() })
  })

  if (!profileRes.ok) {
    const err = await profileRes.text()
    return NextResponse.json({ error: `Profile insert failed: ${err}` }, { status: 500 })
  }

  // 2. Update login/page.tsx to add new user to USERS object
  try {
    const loginPath = join(process.cwd(), 'app', 'login', 'page.tsx')
    let loginFile = readFileSync(loginPath, 'utf-8')

    // Find the USERS object and add the new entry
    const newEntry = `  '${email}':         { id: '${uuid}', password: '${password}', role: '${role}', name: '${name}', squad: ${squad ? `'${squad}'` : 'null'} },\n`

    // Insert before the closing }; of USERS
    loginFile = loginFile.replace(
      /(\s*}\s*as const\s*\n?\s*const validCredentials)/,
      `${newEntry}$1`
    )

    // Fallback: insert before the closing } of USERS
    if (!loginFile.includes(newEntry)) {
      loginFile = loginFile.replace(
        /^(const USERS[^=]+=\s*\{[\s\S]*?)(\n\})/m,
        `$1\n${newEntry}}`
      )
    }

    writeFileSync(loginPath, loginFile, 'utf-8')
  } catch (e: any) {
    // File write failed (Vercel read-only FS in prod) — return instructions
    return NextResponse.json({
      success: true,
      uuid,
      warning: 'Profile saved to DB. Login file cannot be auto-updated on Vercel (read-only filesystem). Add manually.',
      loginLine: `  '${email}': { id: '${uuid}', password: '${password}', role: '${role}', name: '${name}', squad: ${squad ? `'${squad}'` : 'null'} },`
    })
  }

  return NextResponse.json({ success: true, uuid, message: `User ${name} added successfully` })
}
