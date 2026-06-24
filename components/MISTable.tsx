'use client'
import { useMemo } from 'react'

const TARGETS = {
  utilisation: 18,
  sevenStar: 65,
  ota: 50,
  guestWelcome: 100,
  guestDelight: 80,
  registration: 100,
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function Cell({ val, target, isNA }: { val: number | string; target?: number; isNA?: boolean }) {
  if (isNA) return (
    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#9CA3AF', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>NA</td>
  )
  const num = typeof val === 'number' ? val : parseFloat(String(val))
  const pct = typeof val === 'string' && val.includes('%')
  const display = pct ? val : typeof val === 'number' ? val : val

  let bg = '#fff', color = '#1B1D1F'
  if (target !== undefined && !isNaN(num)) {
    const ratio = pct ? num / target : num / target
    if (ratio >= 1) { bg = 'rgba(151,196,89,0.15)'; color = '#2D5A0E' }
    else if (ratio >= 0.7) { bg = 'rgba(254,213,169,0.2)'; color = '#7A4A08' }
    else { bg = 'rgba(233,160,167,0.15)'; color = '#8B2020' }
  }

  return (
    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600, color, background: bg, border: '1px solid #E5E7EB' }}>
      {display}
    </td>
  )
}

export default function MISTable({ butlers, allTasks, allDelights, allAttendance, allPhotos, misData, misLoading, month, year }: {
  butlers: any[]; allTasks: any[]; allDelights: any[]; allAttendance: any[]; allPhotos: any[];
  misData: any[]; misLoading: boolean; month: number; year: number;
}) {
  const start = `${year}-${String(month+1).padStart(2,'0')}-01`
  const end   = new Date(year, month+1, 0).toISOString().slice(0,10)

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

      // Daily utilisation: allocation days in month
      const allocTasks = allTasks.filter((t: any) => {
        if (!['Check-In','Check-Out','Booking','Non Booking'].includes(t.type)) return false
        const dateFromNotes = t.notes?.match(/Date: (\d{4}-\d{2}-\d{2})/)?.[1]
        const d = dateFromNotes || (t.created_at||'').slice(0,10)
        if (d < start || d > end) return false
        return t.butler_id === b.id || t.notes?.includes(`Butler: ${bName}`)
      })
      const utilisation = allocTasks.length

      // Guest Welcome %: tasks of type 'Guest Welcome' completed / total assigned
      const welcomeTasks = allTasks.filter((t: any) => {
        if (t.type !== 'Guest Welcome' && t.type !== 'guest_welcome') return false
        const dateFromNotes = t.notes?.match(/Date: (\d{4}-\d{2}-\d{2})/)?.[1]
        const d = dateFromNotes || (t.created_at||'').slice(0,10)
        if (d < start || d > end) return false
        return t.butler_id === b.id || t.notes?.includes(`Butler: ${bName}`)
      })
      const welcomeDone = welcomeTasks.filter((t: any) => t.status === 'completed').length
      const welcomePct = welcomeTasks.length > 0 ? Math.round(welcomeDone / welcomeTasks.length * 100) : null

      // Guest Delight %: delights with ≥1 photo approved / total delights
      const bDelights = allDelights.filter((d: any) => {
        const dateStr = d.booking_date || (d.created_at||'').slice(0,10)
        if (dateStr < start || dateStr > end) return false
        return d.your_name?.toLowerCase() === bName.toLowerCase()
      })
      const delightsWithPhotos = bDelights.filter((d: any) => (photosByDelight[d.id]||[]).length > 0)
      const delightPct = bDelights.length > 0 ? Math.round(delightsWithPhotos.length / bDelights.length * 100) : null

      // Guest Registration %: from Redash data — match by booking_id
      const bBookingIds = new Set(bDelights.map((d: any) => d.booking_id).filter(Boolean))
      const regRows = misData.filter((r: any) => bBookingIds.has(r.booking_id))
      const regComplete = regRows.filter((r: any) => r['Guest Registration'] === '1').length
      const regPct = regRows.length > 0 ? Math.round(regComplete / regRows.length * 100) : null

      // 7 star: from feedback Redash (ratings 5/5 = 7-star equivalent for our purposes)
      // We approximate: bookings with rating >= 4 / total rated bookings
      // (OTA review and 7-star need Redash feedback data — mark NA for now if no data)

      return {
        name: bName, squad: b.squad || '—',
        utilisation, utilisationNA: false,
        sevenStar: null, sevenStarNA: true,  // needs OTA data
        ota: null, otaNA: true,               // needs OTA data
        guestWelcome: welcomePct, guestWelcomeNA: welcomePct === null,
        guestDelight: delightPct, guestDelightNA: delightPct === null,
        registration: regPct, registrationNA: regPct === null,
      }
    })
  }, [butlers, allTasks, allDelights, allPhotos, misData, start, end, photosByDelight])

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#fff',
    background: '#1B1D1F', textAlign: 'center', border: '1px solid #374151',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sv-dark)' }}>MIS Performance Table</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>
            {MONTHS[month]} {year} · vs targets · {misLoading ? '🔄 Loading Redash…' : ''}
          </div>
        </div>
        <a href="/performance" style={{ textDecoration: 'none' }}>
          <button className="sv-btn" style={{ fontSize: 12 }}>Full report →</button>
        </a>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left', minWidth: 130 }}>Butler</th>
              <th style={{ ...thStyle, minWidth: 80 }}>Squad</th>
              <th style={{ ...thStyle }}>Daily Utilisation<br/><span style={{ fontWeight: 400, fontSize: 10, opacity: 0.7 }}>Target: {TARGETS.utilisation}</span></th>
              <th style={{ ...thStyle }}>7 Star Reviews<br/><span style={{ fontWeight: 400, fontSize: 10, opacity: 0.7 }}>Target: {TARGETS.sevenStar}%</span></th>
              <th style={{ ...thStyle }}>OTA Review<br/><span style={{ fontWeight: 400, fontSize: 10, opacity: 0.7 }}>Target: {TARGETS.ota}%</span></th>
              <th style={{ ...thStyle }}>Guest Welcome<br/><span style={{ fontWeight: 400, fontSize: 10, opacity: 0.7 }}>Target: {TARGETS.guestWelcome}%</span></th>
              <th style={{ ...thStyle }}>Guest Delight<br/><span style={{ fontWeight: 400, fontSize: 10, opacity: 0.7 }}>Target: {TARGETS.guestDelight}%</span></th>
              <th style={{ ...thStyle }}>Guest Registration<br/><span style={{ fontWeight: 400, fontSize: 10, opacity: 0.7 }}>Target: {TARGETS.registration}%</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--sv-dark)', border: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{r.name}</td>
                <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted-fg)', textAlign: 'center', border: '1px solid #E5E7EB' }}>{r.squad}</td>
                <Cell val={r.utilisation} target={TARGETS.utilisation} />
                <Cell val="NA" isNA={true} />
                <Cell val="NA" isNA={true} />
                <Cell val={r.guestWelcomeNA ? 'NA' : `${r.guestWelcome}%`} target={TARGETS.guestWelcome} isNA={r.guestWelcomeNA} />
                <Cell val={r.guestDelightNA ? 'NA' : `${r.guestDelight}%`} target={TARGETS.guestDelight} isNA={r.guestDelightNA} />
                <Cell val={r.registrationNA ? 'NA' : `${r.registration}%`} target={TARGETS.registration} isNA={r.registrationNA} />
              </tr>
            ))}
            {/* Targets row */}
            <tr style={{ background: '#F7F7F5' }}>
              <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, color: '#1B1D1F', border: '1px solid #E5E7EB' }}>Target</td>
              <td style={{ border: '1px solid #E5E7EB' }} />
              {[TARGETS.utilisation, `${TARGETS.sevenStar}%`, `${TARGETS.ota}%`, `${TARGETS.guestWelcome}%`, `${TARGETS.guestDelight}%`, `${TARGETS.registration}%`].map((t, i) => (
                <td key={i} style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#1B1D1F', background: '#F7F7F5', border: '1px solid #E5E7EB' }}>{t}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted-fg)' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(151,196,89,0.4)', marginRight: 4 }} />At or above target</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(254,213,169,0.5)', marginRight: 4 }} />70–99% of target</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(233,160,167,0.4)', marginRight: 4 }} />Below 70%</span>
        <span style={{ marginLeft: 'auto' }}>7 Star & OTA require Redash feedback integration</span>
      </div>
    </div>
  )
}
