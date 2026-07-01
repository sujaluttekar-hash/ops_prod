import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const sb = getServiceSupabase()
  
  // 1. Check if video_url column exists
  const { data: cols, error: colErr } = await sb
    .from('delight_photos').select('id,video_url').limit(1)

  // 2. Check storage bucket policies
  const { data: buckets } = await sb.storage.listBuckets()
  
  // 3. Try inserting a test row with video_url
  const { error: insErr } = await sb.from('delight_photos').insert({
    delight_id: '00000000-0000-0000-0000-000000000000',
    pointer_key: 'test_video',
    video_url: 'https://test.com/test.mp4',
    photo_status: 'pending',
  })
  // Clean up test row
  await sb.from('delight_photos').delete()
    .eq('pointer_key', 'test_video')
    .eq('delight_id', '00000000-0000-0000-0000-000000000000')

  return NextResponse.json({
    video_url_column: colErr ? `MISSING: ${colErr.message}` : 'EXISTS',
    buckets: buckets?.map((b: any) => b.name),
    test_insert: insErr ? `FAILED: ${insErr.message}` : 'OK',
    columns_sample: cols?.[0] ? Object.keys(cols[0]) : 'no rows',
  })
}
