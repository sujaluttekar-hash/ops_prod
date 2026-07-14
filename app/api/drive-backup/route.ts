import { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_HEADERS, REDASH_REG_URL, REDASH_FEED_URL, ADMIN_ID, SUJAL_ID } from '@/lib/config'
import { NextResponse } from 'next/server'

// SURL → imported as SUPABASE_URL from config
// SUPABASE_SERVICE_KEY → imported as SUPABASE_SERVICE_KEY from config
// SH → use SUPABASE_SERVICE_HEADERS from config` }

// Drive folder IDs (already created)
const DRIVE_DELIGHT = '1ExnORyWbMXz9rGKA7vX7tECCVRizqMp_'
const DRIVE_TASK    = '1embtZcwn6a13QLGyAOqoVjvklhkP7n4U'

// Upload one image to Google Drive via multipart upload
async function uploadToDrive(name: string, imageBuffer: ArrayBuffer, mimeType: string, folderId: string): Promise<{ ok: boolean; id?: string }> {
  const metadata = JSON.stringify({ name, parents: [folderId] })
  const boundary = 'sv_butler_backup'
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    '',
    '', // image bytes added separately
  ].join('\r\n')

  const metaBytes = new TextEncoder().encode(body)
  const closing  = new TextEncoder().encode(`\r\n--${boundary}--`)
  const imgBytes  = new Uint8Array(imageBuffer)
  const combined  = new Uint8Array(metaBytes.length + imgBytes.length + closing.length)
  combined.set(metaBytes, 0)
  combined.set(imgBytes, metaBytes.length)
  combined.set(closing, metaBytes.length + imgBytes.length)

  // Use Google Drive REST API directly — service account token not available here
  // Instead, save metadata to Supabase so we can track what needs backup
  return { ok: false } // placeholder — see note below
}

// ── GET: return folder links + backup status ─────────────────
export async function GET() {
  // Fetch count of photos in DB
  const photosRes = await fetch(`${SUPABASE_URL}/rest/v1/delight_photos?select=id,public_url&limit=200`, { headers: SUPABASE_SERVICE_HEADERS })
  const photos = await photosRes.json()
  const withUrl = Array.isArray(photos) ? photos.filter((p: any) => p.public_url) : []

  const tasksRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks?select=id,photo_path&not.photo_path=is.null&limit=200`, { headers: SUPABASE_SERVICE_HEADERS })
  const tasks = await tasksRes.json()
  const withPhoto = Array.isArray(tasks) ? tasks.filter((t: any) => t.photo_path) : []

  return NextResponse.json({
    folders: {
      root:    { name: 'StayVista Butler Ops',  url: 'https://drive.google.com/drive/folders/1CWBEkGRYkvubq_x8E1WuJPi_VP-8vejS' },
      delight: { name: 'Delight Photos',        url: `https://drive.google.com/drive/folders/${DRIVE_DELIGHT}` },
      task:    { name: 'Task Photos',           url: `https://drive.google.com/drive/folders/${DRIVE_TASK}` },
    },
    stats: {
      delightPhotosInDB: withUrl.length,
      taskPhotosInDB:    withPhoto.length,
      note: 'Photos are stored in Supabase Storage. Use the Drive links to view backup folders. Auto-backup runs when photos are uploaded.',
    },
    allDelightPhotoUrls: withUrl.slice(0, 5).map((p: any) => p.public_url),
  })
}

// ── POST: called when a photo is uploaded — saves to Drive ──
export async function POST(req: Request) {
  const body = await req.json()
  const { photoUrl, fileName, folderType } = body

  if (!photoUrl || !fileName) {
    return NextResponse.json({ error: 'Missing photoUrl or fileName' }, { status: 400 })
  }

  try {
    // Fetch the image
    const imgRes = await fetch(photoUrl)
    if (!imgRes.ok) return NextResponse.json({ error: 'Could not fetch photo from Supabase' }, { status: 400 })
    
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
    const imgBuffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(imgBuffer).toString('base64')
    
    const folderId = folderType === 'task' ? DRIVE_TASK : DRIVE_DELIGHT

    // Upload to Drive via Google Drive REST API
    const metadata = { name: fileName, parents: [folderId] }
    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${body.driveToken}`,
        'Content-Type': `multipart/related; boundary=boundary123`,
      },
      body: `--boundary123\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--boundary123\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64}\r\n--boundary123--`,
    })

    if (uploadRes.ok) {
      const data = await uploadRes.json()
      return NextResponse.json({ ok: true, fileId: data.id, name: fileName })
    }
    
    return NextResponse.json({ ok: false, status: uploadRes.status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
