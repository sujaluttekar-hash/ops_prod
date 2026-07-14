/**
 * /api/sync-users
 * One-time sync: pushes all users from lib/config.ts APP_USERS
 * into the Supabase profiles table.
 * Run once by visiting this URL. Safe to run multiple times (upsert).
 */
import { NextResponse } from 'next/server'
import { APP_USERS } from '@/lib/config'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const sb = getServiceSupabase()
  const results: any[] = []

  for (const [email, user] of Object.entries(APP_USERS)) {
    const { data, error } = await sb
      .from('profiles')
      .upsert({
        id:            user.id,
        name:          user.name,
        email:         email,
        role:          user.role,
        squad:         user.squad,
        is_active:     true,
        password_hash: user.password,
      }, { onConflict: 'id' })
      .select('id, name, email, role, squad')

    results.push({
      email,
      name: user.name,
      status: error ? `❌ ${error.message}` : '✅ synced',
      data: data?.[0] || null,
    })
  }

  const synced  = results.filter(r => r.status.startsWith('✅')).length
  const failed  = results.filter(r => r.status.startsWith('❌')).length

  return NextResponse.json({
    summary: `${synced} synced, ${failed} failed`,
    results,
  })
}
