import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const sb = getServiceSupabase()

  const { data: photos, error: pErr } = await sb.from('delight_photos').select('*').limit(3)
  const { data: basic, error: bErr } = await sb.from('guest_delights')
    .select('id, villa_name, status, delight_photos(id, pointer_key, public_url, storage_path)')
    .limit(3).order('created_at', { ascending: false })

  return NextResponse.json({
    photos_table: {
      count: photos?.length ?? 0,
      error: pErr?.message ?? null,
      columns: photos?.[0] ? Object.keys(photos[0]) : [],
      sample: photos?.[0] ?? null,
    },
    join_result: {
      error: bErr?.message ?? null,
      entries: basic?.map((d: any) => ({
        villa: d.villa_name,
        status: d.status,
        photos: d.delight_photos?.length ?? 0,
        photo_keys: d.delight_photos?.map((p: any) => p.pointer_key) ?? [],
      })) ?? [],
    },
  })
}
