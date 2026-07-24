/**
 * /api/cleanup-old-data
 * Deletes all entries before July 3, 2026 to free up storage.
 * GET  → shows counts of what WILL be deleted (preview, no deletion)
 * POST → actually deletes
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '@/lib/config'

const CUTOFF = '2026-07-03T00:00:00+00:00'
const CUTOFF_DATE = '2026-07-03'

export async function GET() {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const preview: Record<string, any> = {}

  // Count rows that will be deleted
  const checks = [
    { table: 'guest_delights', col: 'created_at', val: CUTOFF },
    { table: 'tasks',          col: 'created_at', val: CUTOFF },
    { table: 'notifications',  col: 'created_at', val: CUTOFF },
    { table: 'attendance',     col: 'date',        val: CUTOFF_DATE },
    { table: 'incidents',      col: 'created_at', val: CUTOFF },
  ]

  for (const { table, col, val } of checks) {
    const { count } = await sb.from(table).select('*', { count: 'exact', head: true }).lt(col, val)
    preview[table] = count || 0
  }

  // Also count delight_photos that will be orphaned
  const { data: oldDelights } = await sb.from('guest_delights')
    .select('id').lt('created_at', CUTOFF)
  const oldDelightIds = (oldDelights || []).map((d: any) => d.id)
  const orphanPhotos = oldDelightIds.length > 0
    ? (await sb.from('delight_photos').select('id,storage_path', { count: 'exact' }).in('delight_id', oldDelightIds)).count || 0
    : 0

  const totalRows = Object.values(preview).reduce((a: number, b: any) => a + b, 0)

  return NextResponse.json({
    cutoff: '2026-07-03',
    preview,
    orphan_photos_in_db: orphanPhotos,
    total_rows_to_delete: totalRows,
    storage_files: orphanPhotos,
    warning: 'Storage files in the delight-photos bucket will NOT be auto-deleted (Supabase storage requires manual deletion or separate cleanup). DB rows will be cleaned.',
    instruction: 'POST to this endpoint to execute the deletion. GET is preview only.',
  })
}

export async function POST() {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const results: Record<string, any> = {}

  try {
    // 1. Get old delight IDs first (to clean their photos)
    const { data: oldDelights } = await sb.from('guest_delights')
      .select('id').lt('created_at', CUTOFF)
    const oldDelightIds = (oldDelights || []).map((d: any) => d.id)

    // 2. Delete delight_photos for old delights (orphan rows in DB)
    if (oldDelightIds.length > 0) {
      const { count: photoCount, error: photoErr } = await sb.from('delight_photos')
        .delete({ count: 'exact' }).in('delight_id', oldDelightIds)
      results.delight_photos = photoErr ? `ERROR: ${photoErr.message}` : `${photoCount} rows deleted`

      // 3. Also try to delete storage files for old delights
      // List files in storage and delete ones matching old delight IDs
      let storageDeleted = 0
      for (const delightId of oldDelightIds.slice(0, 50)) { // batch to avoid timeout
        const { data: files } = await sb.storage.from('delight-photos').list(delightId, { limit: 50 })
        if (files && files.length > 0) {
          const paths = files.map((f: any) => `${delightId}/${f.name}`)
          await sb.storage.from('delight-photos').remove(paths)
          storageDeleted += files.length
        }
      }
      results.storage_files_deleted = storageDeleted
    }

    // 4. Delete old guest_delights
    const { count: delightCount, error: delightErr } = await sb.from('guest_delights')
      .delete({ count: 'exact' }).lt('created_at', CUTOFF)
    results.guest_delights = delightErr ? `ERROR: ${delightErr.message}` : `${delightCount} rows deleted`

    // 5. Delete old tasks
    const { count: taskCount, error: taskErr } = await sb.from('tasks')
      .delete({ count: 'exact' }).lt('created_at', CUTOFF)
    results.tasks = taskErr ? `ERROR: ${taskErr.message}` : `${taskCount} rows deleted`

    // 6. Delete old notifications
    const { count: notifCount, error: notifErr } = await sb.from('notifications')
      .delete({ count: 'exact' }).lt('created_at', CUTOFF)
    results.notifications = notifErr ? `ERROR: ${notifErr.message}` : `${notifCount} rows deleted`

    // 7. Delete old attendance
    const { count: attCount, error: attErr } = await sb.from('attendance')
      .delete({ count: 'exact' }).lt('date', CUTOFF_DATE)
    results.attendance = attErr ? `ERROR: ${attErr.message}` : `${attCount} rows deleted`

    // 8. Delete old incidents
    const { count: incCount, error: incErr } = await sb.from('incidents')
      .delete({ count: 'exact' }).lt('created_at', CUTOFF)
    results.incidents = incErr ? `ERROR: ${incErr.message}` : `${incCount} rows deleted`

    return NextResponse.json({
      success: true,
      cutoff: '2026-07-03',
      deleted: results,
      message: 'Done. Check /api/diag-storage in 1-2 minutes to see new storage usage.',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
