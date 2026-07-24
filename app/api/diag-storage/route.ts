import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '@/lib/config'

export async function GET() {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    // 1. Row counts
    const tables = ['profiles','tasks','guest_delights','delight_photos','attendance','notifications','incidents','huddles','butler_locations','trainings']
    const counts: Record<string,number> = {}
    await Promise.all(tables.map(async t => {
      const { count } = await sb.from(t).select('*', { count: 'exact', head: true })
      counts[t] = count || 0
    }))

    // 2. Check delight_photos columns
    const { data: samplePhoto } = await sb.from('delight_photos').select('*').limit(1)
    const photoColumns = samplePhoto?.[0] ? Object.keys(samplePhoto[0]) : []

    // 3. Storage bucket info
    const { data: buckets } = await sb.storage.listBuckets()
    const bucketDetails: Record<string,any> = {}
    if (buckets) {
      await Promise.all(buckets.map(async (bucket: any) => {
        const { data: files } = await sb.storage.from(bucket.name).list('', { limit: 10000 })
        let totalBytes = 0, fileCount = 0
        if (files) {
          for (const file of files) {
            if (file.metadata?.size) { totalBytes += file.metadata.size; fileCount++ }
            else {
              const { data: sub } = await sb.storage.from(bucket.name).list(file.name, { limit: 1000 })
              if (sub) sub.forEach((sf:any) => { if (sf.metadata?.size) { totalBytes += sf.metadata.size; fileCount++ } })
            }
          }
        }
        bucketDetails[bucket.name] = {
          files: fileCount,
          size_mb: (totalBytes/1024/1024).toFixed(1),
          size_gb: (totalBytes/1024/1024/1024).toFixed(3),
        }
      }))
    }

    const totalGB = Object.values(bucketDetails).reduce((s:number,b:any) => s+parseFloat(b.size_gb), 0)

    // 4. Test upload — write a tiny file to verify bucket works
    const testContent = new Blob(['test'], { type: 'text/plain' })
    const { error: testUploadErr } = await sb.storage
      .from('delight-photos')
      .upload(`_test/diag_${Date.now()}.txt`, testContent, { upsert: true })

    return NextResponse.json({
      database: { table_counts: counts, total_rows: Object.values(counts).reduce((a,b)=>a+b,0) },
      delight_photos_columns: photoColumns,
      missing_columns: {
        photo_status: !photoColumns.includes('photo_status'),
        video_url: !photoColumns.includes('video_url'),
        subtypes: !photoColumns.includes('subtypes'),
      },
      storage: {
        buckets: bucketDetails,
        total_gb: totalGB.toFixed(3),
        free_limit_gb: 1,
        pct_used: (totalGB * 100).toFixed(1) + '%',
        status: totalGB >= 1 ? '🔴 OVER LIMIT — uploads will fail!' : totalGB >= 0.8 ? '🟡 WARNING >80%' : '🟢 OK',
      },
      upload_test: testUploadErr ? `❌ FAILED: ${testUploadErr.message}` : '✅ Storage writable',
      generated_at: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
