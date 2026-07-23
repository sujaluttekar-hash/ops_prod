'use client'
import { useState, useEffect, useMemo } from 'react'

// ── Targets from New-MIS sheet ──────────────────────────────────────────
// C43: =24*(B32-A32+1)/DAY(EOMONTH(A32,0))  → dynamic daily utilisation target
// But fixed targets for other metrics match the sheet
const FIXED_TARGETS = {
  sevenStar:    0.60,   // 60%
  ota:          0.50,   // 50%
  guestWelcome: 0.80,   // 80%
  guestDelight: 1.00,   // 100%
  registration: 1.00,   // 100%
}

// OTA source logic from Butler Daily Protocols col S formula:
// =IF(OR(Q="Airbnb",Q="GOMMT",Q="Booking.com",Q="Limechat WC"), "Yes", "")
const OTA_SOURCES = ['airbnb', 'gommt', 'makemytrip', 'booking.com', 'limechat', 'expedia', 'tripadvisor', 'agoda']

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Cell component with colour logic matching the sheet ──────────────────
function Cell({ val, target, isCount }: { val: number|null; target?: number; isCount?: boolean }) {
  if (val === null || val === undefined) return (
    <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: 12, color: '#9CA3AF', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>NA</td>
  )
  const pct = !isCount
  const display = isCount ? val : `${Math.round(val * 100)}%`
  let bg = '#fff', color = '#1B1D1F'
  if (target !== undefined) {
    const ratio = isCount ? val / target : val / target
    if (ratio >= 1)   { bg = 'rgba(151,196,89,0.18)';   color = '#2D5A0E' }
    else if (ratio >= 0.7) { bg = 'rgba(254,213,169,0.25)'; color = '#7A4A08' }
    else               { bg = 'rgba(233,160,167,0.2)';  color = '#8B2020' }
  }
  return (
    <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: 13, fontWeight: 600, color, background: bg, border: '1px solid #E5E7EB' }}>
      {display}
    </td>
  )
}

function UtilCell({ val, target }: { val: number|null; target: number }) {
  if (val === null) return <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: 12, color: '#9CA3AF', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>—</td>
  const bg = val >= target ? 'rgba(151,196,89,0.18)' : val >= target * 0.7 ? 'rgba(254,213,169,0.25)' : 'rgba(233,160,167,0.2)'
  const color = val >= target ? '#2D5A0E' : val >= target * 0.7 ? '#7A4A08' : '#8B2020'
  return <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: 13, fontWeight: 600, color, background: bg, border: '1px solid #E5E7EB' }}>{val}</td>
}

function avg(vals: (number|null)[]): number|null {
  const v = vals.filter(x => x !== null) as number[]
  return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null
}

// ── Squad summary section ─────────────────────────────────────────────────
function SquadSummary({ rows, utilTarget }: { rows: any[]; utilTarget: number }) {
  const squads = [...new Set(rows.map(r => r.squad).filter((s:any) => s && s !== '—'))].sort()
  if (!squads.length) return null
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Squad summary</div>
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #E5E7EB' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Squad','Butlers','Utilisation','7 Star','OTA','Welcome','Delight','Registration'].map(h=>(
              <th key={h} style={{ padding:'8px 10px', fontSize:10, fontWeight:700, color:'#fff', background:'#374151', textAlign:'center', border:'1px solid #4B5563', whiteSpace:'nowrap' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {squads.map((squad:any, i:number) => {
              const sr = rows.filter(r=>r.squad===squad)
              const util = avg(sr.map(r=>r.utilisation))
              const cols = [
                {v:util, t:utilTarget, count:true},
                {v:avg(sr.map(r=>r.sevenStar)), t:FIXED_TARGETS.sevenStar},
                {v:avg(sr.map(r=>r.ota)), t:FIXED_TARGETS.ota},
                {v:avg(sr.map(r=>r.guestWelcome)), t:FIXED_TARGETS.guestWelcome},
                {v:avg(sr.map(r=>r.guestDelight)), t:FIXED_TARGETS.guestDelight},
                {v:avg(sr.map(r=>r.registration)), t:FIXED_TARGETS.registration},
              ]
              return (
                <tr key={squad} style={{ background: i%2===0?'#fff':'#F9FAFB' }}>
                  <td style={{ padding:'7px 10px', fontSize:12, fontWeight:700, border:'1px solid #E5E7EB' }}>{squad}</td>
                  <td style={{ padding:'7px 10px', fontSize:12, textAlign:'center', border:'1px solid #E5E7EB' }}>{sr.length}</td>
                  {cols.map(({v,t,count},j)=>{
                    if (v===null) return <td key={j} style={{ padding:'7px 10px', textAlign:'center', fontSize:11, color:'#9CA3AF', background:'#F9FAFB', border:'1px solid #E5E7EB' }}>NA</td>
                    const ratio = count ? v/t : v/t
                    const bg = ratio>=1?'rgba(151,196,89,0.15)':ratio>=0.7?'rgba(254,213,169,0.2)':'rgba(233,160,167,0.15)'
                    const col = ratio>=1?'#2D5A0E':ratio>=0.7?'#7A4A08':'#8B2020'
                    return <td key={j} style={{ padding:'7px 10px', fontSize:12, fontWeight:600, textAlign:'center', border:'1px solid #E5E7EB', background:bg, color:col }}>
                      {count ? Math.round(v) : `${Math.round(v*100)}%`}
                    </td>
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

// ── Task type breakdown section (matches sheet bottom table) ──────────────
function TaskBreakdown({ rows }: { rows: any[] }) {
  const total = { checkIn:0, checkOut:0, booking:0, nonBooking:0, total:0 }
  rows.forEach(r => {
    total.checkIn    += r.checkIn || 0
    total.checkOut   += r.checkOut || 0
    total.booking    += r.booking || 0
    total.nonBooking += r.nonBooking || 0
    total.total      += (r.checkIn||0)+(r.checkOut||0)+(r.booking||0)+(r.nonBooking||0)
  })
  const th = { padding:'8px 10px', fontSize:10, fontWeight:700, color:'#fff', background:'#1B1D1F', textAlign:'center' as const, border:'1px solid #374151', whiteSpace:'nowrap' as const }
  const td = (v:number, bold=false) => ({ padding:'7px 10px', textAlign:'center' as const, fontSize:12, fontWeight: bold?700:400, border:'1px solid #E5E7EB' })
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Task type breakdown</div>
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #E5E7EB' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Butler','Check-In','Check-Out','Booking','Non Booking','Total'].map(h=><th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={r.name} style={{ background:i%2===0?'#fff':'#F9FAFB' }}>
                <td style={{ padding:'7px 10px', fontSize:12, fontWeight:600, border:'1px solid #E5E7EB', whiteSpace:'nowrap' }}>{r.name}</td>
                <td style={td(r.checkIn)}>{r.checkIn||0}</td>
                <td style={td(r.checkOut)}>{r.checkOut||0}</td>
                <td style={td(r.booking)}>{r.booking||0}</td>
                <td style={td(r.nonBooking)}>{r.nonBooking||0}</td>
                <td style={td((r.checkIn||0)+(r.checkOut||0)+(r.booking||0)+(r.nonBooking||0),true)}>{(r.checkIn||0)+(r.checkOut||0)+(r.booking||0)+(r.nonBooking||0)}</td>
              </tr>
            ))}
            <tr style={{ background:'#F7F7F5' }}>
              <td style={{ padding:'7px 10px', fontSize:12, fontWeight:800, border:'1px solid #E5E7EB' }}>Total</td>
              {[total.checkIn, total.checkOut, total.booking, total.nonBooking, total.total].map((v,i)=>(
                <td key={i} style={{ padding:'7px 10px', textAlign:'center', fontSize:12, fontWeight:800, border:'1px solid #E5E7EB' }}>{v}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main MIS Table ────────────────────────────────────────────────────────
export default function MISTable({ butlers, allTasks, allDelights, allAttendance, allPhotos, month, year }: {
  butlers: any[]; allTasks: any[]; allDelights: any[]; allAttendance: any[]; allPhotos: any[];
  month: number; year: number;
}) {
  const [redashData, setRedashData] = useState<Record<string,any>>({})
  const [loading, setLoading] = useState(false)

  // Date range: 1st of month → today (matches sheet: A32→B32)
  const today = new Date()
  const defaultStart = `${year}-${String(month+1).padStart(2,'0')}-01`
  const defaultEnd   = (today.getMonth()===month && today.getFullYear()===year)
    ? today.toISOString().slice(0,10)
    : new Date(year,month+1,0).toISOString().slice(0,10)

  const [dateFrom, setDateFrom] = useState(defaultStart)
  const [dateTo,   setDateTo]   = useState(defaultEnd)

  // Dynamic utilisation target: 24 × (days in range) / (days in month)
  // Matches sheet formula C43: =24*(B32-A32+1)/DAY(EOMONTH(A32,0))
  const utilTarget = useMemo(() => {
    const start = new Date(dateFrom)
    const end   = new Date(dateTo)
    const daysInRange = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1
    const daysInMonth = new Date(year, month+1, 0).getDate()
    return Math.round(24 * daysInRange / daysInMonth)
  }, [dateFrom, dateTo, month, year])

  useEffect(() => {
    setDateFrom(`${year}-${String(month+1).padStart(2,'0')}-01`)
    setDateTo((new Date().getMonth()===month && new Date().getFullYear()===year)
      ? new Date().toISOString().slice(0,10)
      : new Date(year,month+1,0).toISOString().slice(0,10))
  }, [month, year])

  // Fetch Redash data for 7star/OTA/registration
  useEffect(() => {
    if (!butlers.length) return
    setLoading(true)
    setRedashData({})
    fetch(`/api/mis-data?month=${month}&year=${year}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then(r => r.json())
      .then(d => { setRedashData(d.results || {}); setLoading(false) })
      .catch(() => setLoading(false))
  }, [butlers, month, year, dateFrom, dateTo])

  // Photo index
  const photosByDelight = useMemo(() => {
    const m: Record<string,any[]> = {}
    allPhotos.forEach((p:any) => { if(!m[p.delight_id]) m[p.delight_id]=[]; m[p.delight_id].push(p) })
    return m
  }, [allPhotos])

  const start = dateFrom
  const end   = dateTo

  const rows = useMemo(() => butlers.filter((b:any) => b.squad && b.squad !== 'All' && b.squad !== null).map((b:any) => {
    const bName = b.name
    const rd = redashData[bName] || {}

    // ── Utilisation: unique booking task days for butler in range ──────────
    // Matches: COUNTUNIQUEIFS(Date, ButlerName, dateRange) + COUNTIFS(NonBooking, butler, dateRange)
    const bTasks = allTasks.filter((t:any) => {
      const dateFromNotes = (t.notes||'').match(/Date: (\d{4}-\d{2}-\d{2})/)?.[1]
      const d = dateFromNotes || (t.created_at||'').slice(0,10)
      if (d < start || d > end) return false
      return t.butler_id === b.id || (t.notes||'').includes(`Butler: ${bName}`)
    })
    const checkIn    = bTasks.filter((t:any) => t.type === 'Check-In').length
    const checkOut   = bTasks.filter((t:any) => t.type === 'Check-Out').length
    const booking    = bTasks.filter((t:any) => t.type === 'Booking' || t.type === 'Booking (full day)').length
    const nonBooking = bTasks.filter((t:any) => t.type === 'Non Booking' || t.type === 'Non Booking Task').length
    const utilisation = checkIn + checkOut + booking + nonBooking || null

    // ── Guest Welcome %: completed welcome tasks / total booking tasks ──────
    // Matches: COUNTIFS(GuestWelcome≠"", butler, dateRange, type=Booking) / total
    const bDelights = allDelights.filter((d:any) => {
      const dateStr = d.booking_date || (d.created_at||'').slice(0,10)
      if (dateStr < start || dateStr > end) return false
      return (d.your_name||'').toLowerCase().trim() === bName.toLowerCase().trim()
    })
    const bookingDelights = bDelights.filter((d:any) => d.booking_type !== 'Non Booking Task')
    
    // Welcome = delight has an arrival_selfie or guest_welcome photo approved
    const withWelcome = bookingDelights.filter((d:any) => {
      const photos = photosByDelight[d.id] || []
      return photos.some((p:any) => p.pointer_key === 'guest_welcome' && p.public_url)
    })
    const guestWelcome = bookingDelights.length > 0 ? withWelcome.length / bookingDelights.length : null

    // ── Guest Delight %: delights with ANY delight photo / total booking delights ──
    // Matches: COUNTIFS(AnyDelight≠"", butler, dateRange, type=Booking) / total  
    const withDelight = bookingDelights.filter((d:any) => {
      const photos = photosByDelight[d.id] || []
      return photos.some((p:any) => p.pointer_key === 'guest_delight' && p.public_url)
    })
    const guestDelight = bookingDelights.length > 0 ? withDelight.length / bookingDelights.length : null

    // ── 7 Star, OTA, Registration from Redash ──────────────────────────────
    const sevenStar   = rd.seven_star_pct   !== undefined && rd.seven_star_pct   !== null ? rd.seven_star_pct   / 100 : null
    const ota         = rd.ota_pct          !== undefined && rd.ota_pct          !== null ? rd.ota_pct          / 100 : null
    const registration = rd.registration_pct !== undefined && rd.registration_pct !== null ? rd.registration_pct / 100 : null

    // ── Need Improvement flags (matches H34 formula in sheet) ───────────────
    const flags: string[] = []
    const dataPoints = []
    if (utilisation !== null) { dataPoints.push(1); if (utilisation < utilTarget) flags.push('Utilisation') }
    if (sevenStar   !== null) { dataPoints.push(1); if (sevenStar   < FIXED_TARGETS.sevenStar)    flags.push('7 Star') }
    if (ota         !== null) { dataPoints.push(1); if (ota         < FIXED_TARGETS.ota)          flags.push('OTA') }
    if (guestWelcome!== null) { dataPoints.push(1); if (guestWelcome< FIXED_TARGETS.guestWelcome)  flags.push('Welcome') }
    if (guestDelight!== null) { dataPoints.push(1); if (guestDelight< FIXED_TARGETS.guestDelight)  flags.push('Delight') }
    if (registration!== null) { dataPoints.push(1); if (registration< FIXED_TARGETS.registration)  flags.push('Registration') }

    return {
      name: bName, squad: b.squad || '—',
      utilisation, sevenStar, ota, guestWelcome, guestDelight, registration,
      flags, hasData: dataPoints.length > 0,
      checkIn, checkOut, booking, nonBooking,
    }
  }), [butlers, allTasks, allDelights, allPhotos, redashData, start, end, photosByDelight, utilTarget])

  const th = (w?: number) => ({
    padding: '10px 10px', fontSize: 10, fontWeight: 700, color: '#fff',
    background: '#1B1D1F', textAlign: 'center' as const, border: '1px solid #374151',
    whiteSpace: 'nowrap' as const, lineHeight: 1.4, minWidth: w || 'auto',
  })

  return (
    <div style={{ marginTop: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sv-dark)' }}>MIS Performance</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 1 }}>
            {dateFrom} → {dateTo} · {butlers.length} butlers · Utilisation target: {utilTarget}
            {loading && <span style={{ marginLeft: 8, color: '#9CCCFC' }}>⟳ Loading…</span>}
          </div>
        </div>
        <a href="/performance" style={{ textDecoration: 'none' }}>
          <button className="sv-btn" style={{ fontSize: 12 }}>Full report →</button>
        </a>
      </div>

      {/* Date range pickers */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--muted-fg)', fontWeight: 600 }}>From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ fontSize: 11, padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.1)', background: '#fff' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--muted-fg)', fontWeight: 600 }}>To</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ fontSize: 11, padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.1)', background: '#fff' }} />
        </div>
        <button onClick={() => { setDateFrom(defaultStart); setDateTo(defaultEnd) }}
          style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', color: 'var(--muted-fg)' }}>
          Reset
        </button>
      </div>

      {/* Main table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr>
              <th style={{ ...th(130), textAlign: 'left' }}>Butler</th>
              <th style={th(80)}>Squad</th>
              <th style={th()}>Daily<br/>Utilisation<br/><span style={{ fontWeight:400, opacity:0.6, fontSize:9 }}>Target: {utilTarget}</span></th>
              <th style={th()}>7 Star<br/>Reviews<br/><span style={{ fontWeight:400, opacity:0.6, fontSize:9 }}>Target: 60%</span></th>
              <th style={th()}>OTA<br/>Review<br/><span style={{ fontWeight:400, opacity:0.6, fontSize:9 }}>Target: 50%</span></th>
              <th style={th()}>Guest<br/>Welcome<br/><span style={{ fontWeight:400, opacity:0.6, fontSize:9 }}>Target: 80%</span></th>
              <th style={th()}>Guest<br/>Delight<br/><span style={{ fontWeight:400, opacity:0.6, fontSize:9 }}>Target: 100%</span></th>
              <th style={th()}>Guest<br/>Registration<br/><span style={{ fontWeight:400, opacity:0.6, fontSize:9 }}>Target: 100%</span></th>
              <th style={{ ...th(180), background: '#2D3748' }}>⚠️ Need Improvement</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} style={{ background: i%2===0?'#fff':'#FAFAFA' }}>
                <td style={{ padding:'9px 12px', fontSize:13, fontWeight:600, color:'var(--sv-dark)', border:'1px solid #E5E7EB', whiteSpace:'nowrap' }}>{r.name}</td>
                <td style={{ padding:'9px 10px', fontSize:11, color:'var(--muted-fg)', textAlign:'center', border:'1px solid #E5E7EB' }}>{r.squad}</td>
                <UtilCell val={r.utilisation} target={utilTarget} />
                <Cell val={r.sevenStar} target={FIXED_TARGETS.sevenStar} />
                <Cell val={r.ota} target={FIXED_TARGETS.ota} />
                <Cell val={r.guestWelcome} target={FIXED_TARGETS.guestWelcome} />
                <Cell val={r.guestDelight} target={FIXED_TARGETS.guestDelight} />
                <Cell val={r.registration} target={FIXED_TARGETS.registration} />
                <td style={{ padding:'7px 8px', border:'1px solid #E5E7EB' }}>
                  {!r.hasData ? (
                    <span style={{ fontSize:10, color:'#9CA3AF' }}>No data yet</span>
                  ) : r.flags.length === 0 ? (
                    <span style={{ fontSize:10, fontWeight:700, color:'#2D5A0E', background:'rgba(151,196,89,0.12)', padding:'2px 8px', borderRadius:20 }}>✅ On track</span>
                  ) : (
                    <div style={{ fontSize:9.5, color:'#8B2020', fontWeight:600, lineHeight:1.5 }}>
                      ⚠️ {r.flags.join(', ')}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {/* Target row */}
            <tr style={{ background:'#F7F7F5' }}>
              <td colSpan={2} style={{ padding:'9px 12px', fontSize:12, fontWeight:800, border:'1px solid #E5E7EB' }}>🎯 Target</td>
              <td style={{ padding:'9px 10px', textAlign:'center', fontSize:12, fontWeight:800, border:'1px solid #E5E7EB' }}>{utilTarget}</td>
              {['60%','50%','80%','100%','100%',''].map((t,i)=>(
                <td key={i} style={{ padding:'9px 10px', textAlign:'center', fontSize:12, fontWeight:800, background:'#F7F7F5', border:'1px solid #E5E7EB' }}>{t}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ marginTop:8, display:'flex', gap:14, flexWrap:'wrap', fontSize:11, color:'var(--muted-fg)' }}>
        <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'rgba(151,196,89,0.4)', marginRight:4 }}/>At/above target</span>
        <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'rgba(254,213,169,0.5)', marginRight:4 }}/>70–99% of target</span>
        <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'rgba(233,160,167,0.4)', marginRight:4 }}/>Below 70%</span>
        <span style={{ marginLeft:'auto' }}>7 Star · OTA · Registration from Redash</span>
      </div>

      {/* Squad summary */}
      <SquadSummary rows={rows} utilTarget={utilTarget} />

      {/* Task type breakdown */}
      <TaskBreakdown rows={rows} />
    </div>
  )
}
