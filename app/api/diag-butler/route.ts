import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '@/lib/config'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') || 'Nimish'
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // 1. Get butler profile
  const { data: profile } = await sb.from('profiles').select('*').ilike('name', `%${name}%`).single()

  // 2. Get their tasks
  const { data: tasks, error: taskErr } = await sb.from('tasks')
    .select('*')
    .or(`butler_id.eq.${profile?.id},notes.ilike.%Butler: ${name}%`)
    .order('created_at', { ascending: false })
    .limit(10)

  // 3. Get their delights
  const { data: delights, error: delightErr } = await sb.from('guest_delights')
    .select('*')
    .ilike('your_name', `%${name}%`)
    .order('created_at', { ascending: false })
    .limit(10)

  // 4. Get photos for those delights
  const delightIds = (delights || []).map((d: any) => d.id)
  const { data: photos, error: photoErr } = delightIds.length > 0
    ? await sb.from('delight_photos').select('*').in('delight_id', delightIds)
    : { data: [], error: null }

  // 5. Check storage bucket
  const { data: buckets } = await sb.storage.listBuckets()
  const bucket = buckets?.find((b: any) => b.name === 'delight-photos')
  let storageFiles: any[] = []
  if (bucket) {
    const { data: files } = await sb.storage.from('delight-photos').list('tasks', { limit: 20 })
    storageFiles = files || []
  }

  return NextResponse.json({
    butler: profile ? { id: profile.id, name: profile.name, squad: profile.squad, role: profile.role } : `NOT FOUND for name: ${name}`,
    tasks: {
      count: tasks?.length || 0,
      error: taskErr?.message || null,
      items: (tasks || []).map((t: any) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        has_photo: !!t.photo_path,
        photo_path: t.photo_path || null,
        has_voice: !!t.voice_url,
        butler_id: t.butler_id,
        created_at: t.created_at,
        notes_preview: (t.notes || '').slice(0, 80),
      }))
    },
    delights: {
      count: delights?.length || 0,
      error: delightErr?.message || null,
      items: (delights || []).map((d: any) => ({
        id: d.id,
        villa: d.villa_name,
        booking_id: d.booking_id,
        status: d.status,
        photo_count: (photos || []).filter((p: any) => p.delight_id === d.id).length,
      }))
    },
    photos: {
      count: photos?.length || 0,
      error: photoErr?.message || null,
      columns: photos?.[0] ? Object.keys(photos[0]) : 'no photos',
    },
    storage: {
      bucket_exists: !!bucket,
      task_files_in_bucket: storageFiles.length,
    }
  })
}
