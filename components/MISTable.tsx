'use client'
import { useState, useEffect, useMemo } from 'react'

const TARGETS = {
  utilisation:  25,   // sheet: 25
  sevenStar:    60,   // sheet: 60%
  ota:         50,
  guestWelcome: 80,   // sheet: 80%
  guestDelight: 100,  // sheet: 100%
  registration: 100,
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function Cell({ val, target, isNA }: { val: number | string | null; target?: number; isNA?: boolean }) {
  if (isNA || val === null || val === undefined) return (
    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#9CA3AF', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>NA</td>
  )
  const num = typeof val === 'string' ? parseFloat(val) : val
  let bg = '#fff', color = '#1B1D1F'
  if (target !== undefined && !isNaN(num)) {
    const ratio = num / target
    if (ratio >= 1) { bg = 'rgba(151,196,89,0.18)'; color = '#2D5A0E' }
    else if (ratio >= 0.7) { bg = 'rgba(254,213,169,0.25)'; color = '#7A4A08' }
    else { bg = 'rgba(233,160,167,0.2)'; color = '#8B2020' }
  }
  return (
    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600, color, background: bg, border: '1px solid #E5E7EB' }}>
      {typeof val === 'number' && String(val).includes('.') === false && target && target >= 10 ? val : `${val}${typeof val === 'number' && target && target <= 100 ? '%' : ''}`}
    </td>
  )
}

function UtilCell({ val, target }: { val: number | null; target: number }) {
  if (val === null) return <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#9CA3AF', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>—</td>
  let bg = '#fff', color = '#1B1D1F'
  if (val >= target) { bg = 'rgba(151,196,89,0.18)'; color = '#2D5A0E' }
  else if (val >= target * 0.7) { bg = 'rgba(254,213,169,0.25)'; color = '#7A4A08' }
  else { bg = 'rgba(233,160,167,0.2)'; color = '#8B2020' }
  return (
    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600, color, background: bg, border: '1px solid #E5E7EB' }}>{val}</td>
  )
}


function avg(vals: (number | null)[]): number | null {
  const valid = vals.filter(v => v !== null) as number[]
  return valid.length > 0 ? Math.round(valid.reduce((a,b) => a+b, 0) / valid.length) : null
}

function SquadSummary({ rows }: { rows: any[] }) {
  const squads = [...new Set(rows.map(r => r.squad).filter(s => s && s !== '—'))]
  if (squads.length === 0) return null

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sv-dark)', marginBottom: 10 }}>Squad Summary</div>
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #E5E7EB' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Squad','Butlers','Utilisation','7 Star','OTA','Welcome','Delight','Registration'].map(h => (
                <th key={h} style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#fff', background: '#374151', textAlign: 'center', border: '1px solid #4B5563', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {squads.map((squad, i) => {
              const squadRows = rows.filter(r => r.squad === squad)
              const util  = avg(squadRows.map(r => r.utilisation))
              const seven = avg(squadRows.map(r => r.sevenStar))
              const ota   = avg(squadRows.map(r => r.ota))
              const wel   = avg(squadRows.map(r => r.guestWelcome))
              const del   = avg(squadRows.map(r => r.guestDelight))
              const reg   = avg(squadRows.map(r => r.registration))
              return (
                <tr key={squad} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                  <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, border: '1px solid #E5E7EB' }}>{squad}</td>
                  <td style={{ padding: '8px 12px', fontSize: 12, textAlign: 'center', border: '1px solid #E5E7EB' }}>{squadRows.length}</td>
                  {[{v:util,t:25},{v:seven,t:60},{v:ota,t:50},{v:wel,t:80},{v:del,t:100},{v:reg,t:100}].map(({v,t},j) => {
                    const bg = v === null ? '#F9FAFB' : v >= t ? 'rgba(151,196,89,0.15)' : v >= t*0.7 ? 'rgba(254,213,169,0.2)' : 'rgba(233,160,167,0.15)'
                    const col = v === null ? '#9CA3AF' : v >= t ? '#2D5A0E' : v >= t*0.7 ? '#7A4A08' : '#8B2020'
                    return <td key={j} style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, textAlign: 'center', border: '1px solid #E5E7EB', background: bg, color: col }}>{v !== null ? (j === 0 ? v : `${v}%`) : '—'}</td>
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function MISTable({ butlers, allTasks, allDelights, allAttendance, allPhotos, month, year }: {
  butlers: any[]; allTasks: any[]; allDelights: any[]; allAttendance: any[]; allPhotos: any[];
  month: number; year: number;
}) {
  const [redashData, setRedashData] = useState<Record<string,any>>({})
  const [loading, setLoading] = useState(false)
  const defaultStart = `${year}-${String(month+1).padStart(2,'0')}-01`
  // Default end = today (not end of month)
  const todayStr = new Date().toISOString().slice(0,10)
  const defaultEnd = todayStr
  const [dateFrom, setDateFrom] = useState(defaultStart)
  const [dateTo,   setDateTo]   = useState(defaultEnd)

  // Sync when month/year changes — end stays today unless month is in past
  useEffect(() => {
    const newStart = `${year}-${String(month+1).padStart(2,'0')}-01`
    const monthEnd = new Date(year, month+1, 0).toISOString().slice(0,10)
    const newEnd = monthEnd < todayStr ? monthEnd : todayStr
    setDateFrom(newStart)
    setDateTo(newEnd)
  }, [month, year])

  const start = dateFrom
  const end   = dateTo

  // Fetch Redash MIS data
  useEffect(() => {
    if (!butlers.length) return
    setLoading(true)
    setRedashData({})  // clear stale data immediately
    fetch(`/api/mis-data?month=${month}&year=${year}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then(r => r.json())
      .then(d => { setRedashData(d.results || {}); setLoading(false) })
      .catch(() => setLoading(false))
  }, [butlers, month, year, dateFrom, dateTo])

  const photosByDelight = useMemo(() => {
    const m: Record<string, any[]> = {}
    allPhotos.forEach((p: any) => {
      if (!m[p.delight_id]) m[p.delight_id] = []
      m[p.delight_id].push(p)
    })
    return m
  }, [allPhotos])

  const rows = useMemo(() => {
    return butlers.map((b: any) => {
      const bName = b.name
      const rd = redashData[bName] || {}

      // Daily Utilisation: unique booking IDs from app allocation tasks + non-booking tasks
      // Formula: COUNTUNIQUEIFS(Booking IDs, Butler, date range) + COUNTIFS(Non Booking, Butler, date range)
      const allocTasks = allTasks.filter((t: any) => {
        if (!['Check-In','Check-Out','Booking','Non Booking'].includes(t.type)) return false
        const dateFromNotes = t.notes?.match(/Date: (\d{4}-\d{2}-\d{2})/)?.[1]
        const d = dateFromNotes || (t.created_at||'').slice(0,10)
        if (d < start || d > end) return false
        return t.butler_id === b.id || (t.notes||'').includes(`Butler: ${bName}`)
      })
      // Utilisation = total allocation task count for this butler in date range
      // Each task (Check-In, Check-Out, Booking, Non Booking) = 1 working day
      // Allocation tasks notes format: "Butler: Name · ButlerID: id · Date: YYYY-MM-DD"
      const utilisationFinal = allocTasks.length > 0 ? allocTasks.length : null

      // Guest Welcome %: welcome tasks completed / total assigned
      const welcomeTasks = allTasks.filter((t: any) => {
        if (t.type !== 'Guest welcome' && t.type !== 'Guest Welcome') return false
        const dateFromNotes = t.notes?.match(/Date: (\d{4}-\d{2}-\d{2})/)?.[1]
        const d = dateFromNotes || (t.created_at||'').slice(0,10)
        if (d < start || d > end) return false
        return t.butler_id === b.id || (t.notes||'').includes(`Butler: ${bName}`)
      })
      const welcomeDone = welcomeTasks.filter((t: any) => t.status === 'completed').length
      const welcomePct = welcomeTasks.length > 0 ? Math.round(welcomeDone / welcomeTasks.length * 100) : null

      // Guest Delight %: delights with ≥1 photo / total delights
      const bDelights = allDelights.filter((d: any) => {
        const dateStr = d.booking_date || (d.created_at||'').slice(0,10)
        if (dateStr < start || dateStr > end) return false
        return (d.your_name||'').toLowerCase() === bName.toLowerCase()
      })
      const delightsWithPhotos = bDelights.filter((d: any) => (photosByDelight[d.id]||[]).length > 0)
      const delightPct = bDelights.length > 0 ? Math.round(delightsWithPhotos.length / bDelights.length * 100) : null

      // Auto-generate Need Improvement flags — only for metrics that have actual data
      const flags: string[] = []
      const dataPoints: number[] = []
      if (utilisationFinal !== null) { dataPoints.push(1); if (utilisationFinal < 25) flags.push('Utilisation') }
      if ((rd.seven_star_pct ?? null) !== null) { dataPoints.push(1); if (rd.seven_star_pct < 60) flags.push('7 Star') }
      if ((rd.ota_pct ?? null) !== null) { dataPoints.push(1); if (rd.ota_pct < 50) flags.push('OTA') }
      if (welcomePct !== null) { dataPoints.push(1); if (welcomePct < 80) flags.push('Welcome') }
      if (delightPct !== null) { dataPoints.push(1); if (delightPct < 100) flags.push('Delight') }
      if ((rd.registration_pct ?? null) !== null) { dataPoints.push(1); if (rd.registration_pct < 100) flags.push('Registration') }
      // hasData = at least 1 metric has a real value
      const hasData = dataPoints.length > 0

      return {
        name: bName, squad: b.squad || '—',
        utilisation: utilisationFinal,
        sevenStar: rd.seven_star_pct ?? null,
        ota: rd.ota_pct ?? null,
        guestWelcome: welcomePct,
        guestDelight: delightPct,
        registration: rd.registration_pct ?? null,
        flags,
        hasData: dataPoints.length > 0,
      }
    })
  }, [butlers, allTasks, allDelights, allPhotos, redashData, start, end, photosByDelight])

  const thStyle: React.CSSProperties = {
    padding: '11px 12px', fontSize: 11, fontWeight: 700, color: '#fff',
    background: '#1B1D1F', textAlign: 'center', border: '1px solid #374151',
    whiteSpace: 'nowrap', lineHeight: 1.4,
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sv-dark)' }}>MIS Performance Table</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 1 }}>
              {dateFrom} → {dateTo} · {butlers.length} butlers
              {loading && <span style={{ marginLeft: 8, color: '#9CCCFC' }}>⟳ Loading…</span>}
            </div>
          </div>
          <a href="/performance" style={{ textDecoration: 'none' }}>
            <button className="sv-btn" style={{ fontSize: 12 }}>Full report →</button>
          </a>
        </div>
        {/* Date range pickers */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--muted-fg)', fontWeight: 600 }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ fontSize: 11, padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--muted-fg)', fontWeight: 600 }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ fontSize: 11, padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer' }} />
          </div>
          <button onClick={() => { setDateFrom(defaultStart); setDateTo(todayStr); }}
            style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', color: 'var(--muted-fg)' }}>
            Reset to month
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', minWidth: 130 }}>Butler</th>
              <th style={{ ...thStyle, minWidth: 80 }}>Squad</th>
              <th style={{ ...thStyle }}>Daily<br/>Utilisation<br/><span style={{ fontWeight: 400, opacity: 0.65, fontSize: 9.5 }}>Target: {TARGETS.utilisation}</span></th>
              <th style={{ ...thStyle }}>7 Star<br/>Reviews<br/><span style={{ fontWeight: 400, opacity: 0.65, fontSize: 9.5 }}>Target: {TARGETS.sevenStar}%</span></th>
              <th style={{ ...thStyle }}>OTA<br/>Review<br/><span style={{ fontWeight: 400, opacity: 0.65, fontSize: 9.5 }}>Target: {TARGETS.ota}%</span></th>
              <th style={{ ...thStyle }}>Guest<br/>Welcome<br/><span style={{ fontWeight: 400, opacity: 0.65, fontSize: 9.5 }}>Target: {TARGETS.guestWelcome}%</span></th>
              <th style={{ ...thStyle }}>Guest<br/>Delight<br/><span style={{ fontWeight: 400, opacity: 0.65, fontSize: 9.5 }}>Target: {TARGETS.guestDelight}%</span></th>
              <th style={{ ...thStyle }}>Guest<br/>Registration<br/><span style={{ fontWeight: 400, opacity: 0.65, fontSize: 9.5 }}>Target: {TARGETS.registration}%</span></th>
              <th style={{ ...thStyle, background: '#2D3748', minWidth: 180 }}>⚠️ Need Improvement</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--sv-dark)', border: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{r.name}</td>
                <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted-fg)', textAlign: 'center', border: '1px solid #E5E7EB' }}>{r.squad}</td>
                <UtilCell val={r.utilisation} target={TARGETS.utilisation} />
                <Cell val={r.sevenStar} target={TARGETS.sevenStar} />
                <Cell val={r.ota} target={TARGETS.ota} />
                <Cell val={r.guestWelcome} target={TARGETS.guestWelcome} />
                <Cell val={r.guestDelight} target={TARGETS.guestDelight} />
                <Cell val={r.registration} target={TARGETS.registration} />
                <td style={{ padding: '8px 10px', border: '1px solid #E5E7EB' }}>
                  {!(r as any).hasData ? (
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>No data yet</span>
                  ) : (r as any).flags?.length === 0 ? (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#2D5A0E', background: 'rgba(151,196,89,0.12)', padding: '2px 8px', borderRadius: 20 }}>✅ On track</span>
                  ) : (
                    <div style={{ fontSize: 9.5, color: '#8B2020', fontWeight: 600, lineHeight: 1.5 }}>
                      ⚠️ {(r as any).flags.join(', ')}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {/* Target row */}
            <tr style={{ background: '#F7F7F5' }}>
              <td colSpan={2} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, color: '#1B1D1F', border: '1px solid #E5E7EB' }}>🎯 Target</td>
              {[TARGETS.utilisation, `${TARGETS.sevenStar}%`, `${TARGETS.ota}%`, `${TARGETS.guestWelcome}%`, `${TARGETS.guestDelight}%`, `${TARGETS.registration}%`, ''].map((t, i) => (
                <td key={i} style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#1B1D1F', background: '#F7F7F5', border: '1px solid #E5E7EB' }}>{t}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 8, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--muted-fg)' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(151,196,89,0.4)', marginRight: 4 }} />At/above target</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(254,213,169,0.5)', marginRight: 4 }} />70–99% of target</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(233,160,167,0.4)', marginRight: 4 }} />Below 70%</span>
        <span style={{ marginLeft: 'auto' }}>7 Star & OTA from Redash · Welcome & Delight from app</span>
      </div>

      {/* Squad-level summary — matches bottom section of mastersheet */}
      <SquadSummary rows={rows} />
    </div>
  )
}
