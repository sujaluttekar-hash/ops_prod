import { NextResponse } from 'next/server'

const SURL = 'https://ryuxwnbrdsjwzwdimynd.supabase.co'
const SVC  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA'
const SH   = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}` }

// Google Drive folder IDs
const DRIVE_ROOT       = '1CWBEkGRYkvubq_x8E1WuJPi_VP-8vejS' // StayVista Butler Ops
const DRIVE_DELIGHT    = '1ExnORyWbMXz9rGKA7vX7tECCVRizqMp_' // Delight Photos
const DRIVE_TASK       = '1embtZcwn6a13QLGyAOqoVjvklhkP7n4U' // Task Photos

const DRIVE_MCP = 'https://drivemcp.googleapis.com/mcp/v1'

async function createDriveFolder(name: string, parentId: string, accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
    })
    const data = await res.json()
    return data.id || null
  } catch { return null }
}

async function uploadToDrive(filename: string, imageData: ArrayBuffer, mimeType: string, parentId: string, accessToken: string): Promise<boolean> {
  try {
    const metadata = { name: filename, parents: [parentId] }
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', new Blob([imageData], { type: mimeType }))
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: form,
    })
    return res.ok
  } catch { return false }
}

export async function POST(req: Request) {
  const { type, accessToken } = await req.json()
  if (!accessToken) return NextResponse.json({ error: 'No access token — connect Google Drive' }, { status: 400 })

  const results = { uploaded: 0, skipped: 0, errors: 0 }

  if (type === 'delight') {
    // Fetch all delight photos from Supabase
    const photosRes = await fetch(`${SURL}/rest/v1/delight_photos?select=*,guest_delights(your_name,villa_name,booking_date)&order=created_at.desc`, { headers: SH })
    const photos = await photosRes.json()
    if (!Array.isArray(photos)) return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })

    for (const photo of photos.slice(0, 50)) { // max 50 per run
      if (!photo.public_url && !photo.storage_path) { results.skipped++; continue }
      const url = photo.public_url || `${SURL}/storage/v1/object/public/delight-photos/${photo.storage_path}`
      try {
        const imgRes = await fetch(url)
        if (!imgRes.ok) { results.skipped++; continue }
        const imgData = await imgRes.arrayBuffer()
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
        const butler = photo.guest_delights?.your_name?.replace(/\s+/g, '_') || 'Unknown'
        const date = (photo.guest_delights?.booking_date || new Date().toISOString().slice(0,10))
        const villa = photo.guest_delights?.villa_name?.replace(/\s+/g, '_') || 'Unknown_Villa'
        const filename = `${butler}_${villa}_${date}_${photo.pointer_key || 'photo'}.jpg`
        const ok = await uploadToDrive(filename, imgData, mimeType, DRIVE_DELIGHT, accessToken)
        ok ? results.uploaded++ : results.errors++
      } catch { results.errors++ }
    }
  }

  if (type === 'tasks') {
    // Fetch completed tasks with photos
    const tasksRes = await fetch(`${SURL}/rest/v1/tasks?select=id,type,photo_path,notes,butler_id,completed_at&eq.status=completed&not.is.photo_path=null&order=completed_at.desc`, { headers: SH })
    const tasks = await tasksRes.json()
    if (!Array.isArray(tasks)) return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })

    for (const task of tasks.slice(0, 50)) {
      if (!task.photo_path) { results.skipped++; continue }
      try {
        const imgRes = await fetch(task.photo_path)
        if (!imgRes.ok) { results.skipped++; continue }
        const imgData = await imgRes.arrayBuffer()
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
        const nameMatch = task.notes?.match(/Butler: ([^·\n]+)/)
        const butler = nameMatch ? nameMatch[1].trim().replace(/\s+/g, '_') : 'Unknown'
        const villaMatch = task.notes?.match(/Villa: ([^·\n]+)/)
        const villa = villaMatch ? villaMatch[1].trim().replace(/\s+/g, '_') : 'Unknown_Villa'
        const date = (task.completed_at || new Date().toISOString()).slice(0, 10)
        const filename = `${butler}_${villa}_${task.type?.replace(/\s+/g, '_')}_${date}.jpg`
        const ok = await uploadToDrive(filename, imgData, mimeType, DRIVE_TASK, accessToken)
        ok ? results.uploaded++ : results.errors++
      } catch { results.errors++ }
    }
  }

  return NextResponse.json({ ...results, message: `Backup complete — ${results.uploaded} uploaded, ${results.skipped} skipped, ${results.errors} errors` })
}

export async function GET() {
  return NextResponse.json({
    folders: {
      root: { name: 'StayVista Butler Ops', id: DRIVE_ROOT, url: `https://drive.google.com/drive/folders/${DRIVE_ROOT}` },
      delight: { name: 'Delight Photos', id: DRIVE_DELIGHT, url: `https://drive.google.com/drive/folders/${DRIVE_DELIGHT}` },
      task: { name: 'Task Photos', id: DRIVE_TASK, url: `https://drive.google.com/drive/folders/${DRIVE_TASK}` },
    }
  })
}
