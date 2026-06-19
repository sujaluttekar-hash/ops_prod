import { NextResponse } from 'next/server'

const URL = 'https://redash.vistarooms.com/api/queries/847/results.csv?api_key=wB001NJMVA6OphBjPx39ktwoiihkiKwsksYF4eQC'

export async function GET() {
  try {
    const res = await fetch(URL, { next: { revalidate: 300 } }) // cache 5 min
    if (!res.ok) return NextResponse.json({ error: `Redash error: ${res.status}` }, { status: 500 })
    const csv = await res.text()
    // Parse CSV → JSON
    const lines = csv.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''))
    const rows = lines.slice(1).map(line => {
      const vals = line.match(/(".*?"|[^,]+)(?=,|$)/g) || line.split(',')
      const obj: Record<string,string> = {}
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/"/g,'').trim() })
      return obj
    })
    return NextResponse.json({ headers, rows, count: rows.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
