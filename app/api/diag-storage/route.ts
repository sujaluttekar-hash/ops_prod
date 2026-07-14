import { NextResponse } from 'next/server'
import { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_HEADERS } from '@/lib/config'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    // 1. Count rows in each table
    const tables = ['profiles','tasks','guest_delights','delight_photos','attendance','notifications','incidents','huddles','butler_locations','trainings','huddle_quiz_attempts']
    const counts: Record<string, number> = {}

    await Promise.all(tables.map(async t => {
      const { count } = await sb.from(t).select('*', { count: 'exact', head: true })
      counts[t] = count || 0
    }))

    // 2. List storage buckets and their sizes
    const { data: buckets } = await sb.storage.listBuckets()
    const bucketDetails: Record<string, any> = {}

    if (buckets) {
      await Promise.all(buckets.map(async (bucket: any) => {
        // List all files in bucket
        const { data: files } = await sb.storage.from(bucket.name).list('', {
          limit: 10000,
          offset: 0,
        })
        
        let totalBytes = 0
        let fileCount = 0
        let subfolderCount = 0

        if (files) {
          for (const file of files) {
            if (file.metadata?.size) {
              totalBytes += file.metadata.size
              fileCount++
            } else {
              // It's a folder — list recursively (first level)
              subfolderCount++
              const { data: subfiles } = await sb.storage.from(bucket.name).list(file.name, {
                limit: 1000,
              })
              if (subfiles) {
                for (const sf of subfiles) {
                  if (sf.metadata?.size) {
                    totalBytes += sf.metadata.size
                    fileCount++
                  }
                }
              }
            }
          }
        }

        bucketDetails[bucket.name] = {
          files: fileCount,
          folders: subfolderCount,
          size_bytes: totalBytes,
          size_mb: (totalBytes / 1024 / 1024).toFixed(1),
          size_gb: (totalBytes / 1024 / 1024 / 1024).toFixed(3),
        }
      }))
    }

    const totalStorageBytes = Object.values(bucketDetails).reduce((sum: number, b: any) => sum + b.size_bytes, 0)
    const totalStorageMB = totalStorageBytes / 1024 / 1024
    const totalStorageGB = totalStorageMB / 1024
    const freeLimit = 1.0 // GB on free tier
    const pctUsed = ((totalStorageGB / freeLimit) * 100).toFixed(1)

    return NextResponse.json({
      generated_at: new Date().toISOString(),

      database: {
        table_counts: counts,
        total_rows: Object.values(counts).reduce((a, b) => a + b, 0),
        note: 'DB size limit is 500MB on free tier — row count is tiny, DB is safe',
      },

      storage: {
        buckets: bucketDetails,
        total_mb: totalStorageMB.toFixed(1),
        total_gb: totalStorageGB.toFixed(3),
        free_tier_limit_gb: freeLimit,
        pct_of_free_tier_used: pctUsed + '%',
        status: totalStorageGB >= freeLimit ? '🔴 OVER FREE LIMIT' : totalStorageGB >= 0.8 ? '🟡 WARNING — above 80%' : '🟢 OK',
        months_remaining_at_current_growth: totalStorageGB >= freeLimit
          ? 'Already over — upgrade needed'
          : ((freeLimit - totalStorageGB) / 1.2 * 30).toFixed(0) + ' days approx',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
