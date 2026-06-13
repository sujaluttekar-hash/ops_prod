'use client'
import { useState, useEffect, useMemo } from 'react'
import Topbar from '@/components/layout/Topbar'
import { getServiceSupabase, LOCAL_PROFILES } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useButlerLocation } from '@/lib/use-butler-location'
import { isSupervisor } from '@/lib/auth'

function BarChart({ data, color, label }: { data: { name: string; value: number }[]; color: string; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 80 }}>
        {data.map(d => (
          <div key={d.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sv-dark)' }}>{d.value}</div>
            <div style={{ width: '100%', height: Math.max(4, (d.value / max) * 58), background: color, borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease', opacity: d.value === 0 ? 0.2 : 1 }} />
            <div style={{ fontSize: 8.5, color: 'var(--muted-fg)', textAlign: 'center', maxWidth: 38, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name.split(' ')[0]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutChart({ done, total, color, label, sublabel }: { done: number; total: number; color: string; label: string; sublabel?: string }) {
  const pct = total > 0 ? Math.round(done / total * 100) : 0
  const r = 30, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
  return (
    <div style={{ textAlign: 'center', minWidth: 80 }}>
      <svg width="76" height="76" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="8" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div style={{ marginTop: -55, fontSize: 17, fontWeight: 800, color: 'var(--sv-dark)' }}>{pct}%</div>
      <div style={{ marginTop: 38, fontSize: 10, color: 'var(--muted-fg)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{sublabel || `${done}/${total}`}</div>
    </div>
  )
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function DashboardPage() {
  const { user } = useAuth()
  const { status: locStatus } = useButlerLocation(user?.role === 'butler' ? user as any : null)
  const isSuper = user ? isSupervisor(user.role as any) : false

  // Raw data
  const [allTasks, setAllTasks] = useState<any[]>([])
  const [allDelights, setAllDelights] = useState<any[]>([])
  const [allHuddles, setAllHuddles] = useState<any[]>([])
  const [allTrainings, setAllTrainings] = useState<any[]>([])
  const [butlers, setButlers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth()) // 0-11
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selButler, setSelButler] = useState('All')
  const [selVilla, setSelVilla] = useState('All')
  const [selType, setSelType] = useState<'tasks' | 'delights' | 'all'>('all')

  useEffect(() => { loadAll() }, [user?.id])

  async function loadAll() {
    setLoading(true)
    const sb = getServiceSupabase()
    try {
      const [tR, dR, hR, pR, trR] = await Promise.all([
        sb.from('tasks').select('id,type,status,butler_id,notes,completed_at,created_at').order('created_at', { ascending: false }),
        sb.from('guest_delights').select('id,your_name,villa_name,booking_type,booking_date,status,created_at').order('created_at', { ascending: false }),
        sb.from('huddles').select('id,team,huddle_date,status').order('huddle_date', { ascending: false }),
        sb.from('profiles').select('id,name,squad,role').eq('is_active', true),
        sb.from('trainings').select('id,type,date,status').order('date', { ascending: false }),
      ])
      setAllTasks(tR.data || [])
      setAllDelights(dR.data || [])
      setAllHuddles(hR.data || [])
      setAllTrainings(trR.data || [])
      setButlers((pR.data || []).filter((p: any) => p.role === 'butler'))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  // Helpers
  function butlerNameFromTask(t: any) {
    const m = t.notes?.match(/Butler: ([^·\n]+)/)
    if (m) return m[1].trim()
    const p = butlers.find((b: any) => b.id === t.butler_id) || LOCAL_PROFILES.find(p => p.id === t.butler_id)
    return p?.name || '—'
  }
  function villaFromTask(t: any) {
    const m = t.notes?.match(/Villa: ([^·\n]+)/)
    return m ? m[1].trim() : '—'
  }
  function inMonth(dateStr: string) {
    const d = new Date(dateStr)
    return d.getMonth() === selMonth && d.getFullYear() === selYear
  }

  // Filtered data
  const filtTasks = useMemo(() => allTasks.filter(t => {
    if (!inMonth(t.created_at)) return false
    if (selButler !== 'All' && butlerNameFromTask(t) !== selButler) return false
    if (selVilla !== 'All' && villaFromTask(t) !== selVilla) return false
    return true
  }), [allTasks, selMonth, selYear, selButler, selVilla])

  const filtDelights = useMemo(() => allDelights.filter(d => {
    const dateStr = d.booking_date || d.created_at
    if (!inMonth(dateStr)) return false
    if (selButler !== 'All' && d.your_name !== selButler) return false
    if (selVilla !== 'All' && d.villa_name !== selVilla) return false
    return true
  }), [allDelights, selMonth, selYear, selButler, selVilla])

  // KPIs
  const tasksDone = filtTasks.filter(t => t.status === 'completed').length
  const tasksPct = filtTasks.length > 0 ? Math.round(tasksDone / filtTasks.length * 100) : 0
  const delightsDone = filtDelights.filter(d => d.status === 'completed').length
  const delightsPct = filtDelights.length > 0 ? Math.round(delightsDone / filtDelights.length * 100) : 0

  // All villas for dropdown
  const allVillas = useMemo(() => {
    const s = new Set<string>()
    allTasks.forEach(t => { const v = villaFromTask(t); if (v && v !== '—') s.add(v) })
    allDelights.forEach(d => { if (d.villa_name) s.add(d.villa_name) })
    return Array.from(s).sort()
  }, [allTasks, allDelights])

  // Bar chart data
  const tasksByButler = useMemo(() => {
    const m: Record<string, number> = {}
    filtTasks.forEach(t => { const n = butlerNameFromTask(t); if (n !== '—') m[n] = (m[n]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}))
  }, [filtTasks])

  const delightsByButler = useMemo(() => {
    const m: Record<string, number> = {}
    filtDelights.forEach(d => { if (d.your_name) m[d.your_name] = (m[d.your_name]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}))
  }, [filtDelights])

  const delightsByVilla = useMemo(() => {
    const m: Record<string, number> = {}
    filtDelights.forEach(d => { if (d.villa_name) m[d.villa_name] = (m[d.villa_name]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}))
  }, [filtDelights])

  const tasksByVilla = useMemo(() => {
    const m: Record<string, number> = {}
    filtTasks.forEach(t => { const v = villaFromTask(t); if (v!=='—') m[v]=(m[v]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}))
  }, [filtTasks])

  // Activity feed — combined, filtered
  const activityFeed = useMemo(() => {
    const hist: any[] = []
    const showTasks = selType === 'all' || selType === 'tasks'
    const showDelights = selType === 'all' || selType === 'delights'
    if (showTasks) filtTasks.slice(0, 15).forEach(t => {
      hist.push({ icon: '✓', color: t.status==='completed'?'#2D5A0E':'#0C447C', bg: t.status==='completed'?'rgba(151,196,89,0.1)':'rgba(156,204,252,0.1)', butler: butlerNameFromTask(t), villa: villaFromTask(t), detail: t.type, status: t.status, time: t.completed_at||t.created_at })
    })
    if (showDelights) filtDelights.slice(0, 15).forEach(d => {
      hist.push({ icon: '🎁', color: '#7A4A08', bg: 'rgba(254,213,169,0.15)', butler: d.your_name||'—', villa: d.villa_name||'—', detail: d.booking_type, status: d.status, time: d.created_at })
    })
    return hist.sort((a,b)=>new Date(b.time||0).getTime()-new Date(a.time||0).getTime()).slice(0,25)
  }, [filtTasks, filtDelights, selType])

  function timeAgo(t: string) {
    const diff = Date.now() - new Date(t).getTime()
    const m = Math.floor(diff/60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m/60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h/24)}d ago`
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const years = [2024, 2025, 2026, 2027]

  const selectStyle: React.CSSProperties = { fontSize: 12, padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: 'var(--sv-dark)', cursor: 'pointer', outline: 'none' }

  return (
    <>
      <Topbar
        title={user?.role === 'butler' ? `Welcome, ${user?.name || 'Butler'} 👋` : 'Operations dashboard'}
        subtitle={today}
        actions={isSuper ? <a href="/allocation" style={{ textDecoration: 'none' }}><button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Assign task</button></a> : undefined}
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Location banners */}
        {user?.role === 'butler' && locStatus === 'denied' && (
          <div style={{ background: 'rgba(233,160,167,0.12)', border: '1px solid #E9A0A7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📍</span>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: '#8B2020' }}>Location access denied</div><div style={{ fontSize: 11, color: '#8B2020', marginTop: 2 }}>Enable location in browser settings so your supervisor can see you on the map.</div></div>
          </div>
        )}
        {user?.role === 'butler' && locStatus === 'active' && (
          <div style={{ background: 'rgba(151,196,89,0.1)', border: '1px solid #97C459', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📍</span><div style={{ fontSize: 12, color: '#2D5A0E', fontWeight: 500 }}>Location sharing active — your supervisor can see you on the map.</div>
          </div>
        )}

        {/* ── FILTERS ─────────────────────────────────────────── */}
        {isSuper && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center', padding: '12px 16px', background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginRight: 4 }}>Filter</span>

            {/* Month */}
            <select value={selMonth} onChange={e => setSelMonth(+e.target.value)} style={selectStyle}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>

            {/* Year */}
            <select value={selYear} onChange={e => setSelYear(+e.target.value)} style={selectStyle}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Butler */}
            <select value={selButler} onChange={e => setSelButler(e.target.value)} style={selectStyle}>
              <option value="All">All butlers</option>
              {butlers.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>

            {/* Villa */}
            <select value={selVilla} onChange={e => setSelVilla(e.target.value)} style={selectStyle}>
              <option value="All">All villas</option>
              {allVillas.map(v => <option key={v} value={v}>{v}</option>)}
            </select>

            {/* Type */}
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
              {(['all','tasks','delights'] as const).map(t => (
                <button key={t} onClick={() => setSelType(t)} style={{ ...selectStyle, background: selType===t ? '#1B1D1F' : '#fff', color: selType===t ? '#fff' : 'var(--sv-dark)', border: selType===t ? 'none' : '1px solid rgba(0,0,0,0.1)', padding: '5px 12px', fontWeight: selType===t ? 600 : 400 }}>
                  {t === 'all' ? 'All' : t === 'tasks' ? '✓ Tasks' : '🎁 Delights'}
                </button>
              ))}
            </div>

            {/* Active filters badge */}
            {(selButler !== 'All' || selVilla !== 'All') && (
              <button onClick={() => { setSelButler('All'); setSelVilla('All') }} style={{ fontSize: 11, color: '#8B2020', background: 'rgba(233,160,167,0.1)', border: '1px solid #E9A0A7', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                ✕ Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── KPI CARDS ────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total butlers', val: butlers.length, cls: 'blue' },
            { label: 'Tasks', val: `${tasksDone}/${filtTasks.length}`, cls: 'green' },
            { label: 'Task completion', val: `${tasksPct}%`, cls: 'green' },
            { label: 'Delights', val: `${delightsDone}/${filtDelights.length}`, cls: 'coral' },
            { label: 'Delight completion', val: `${delightsPct}%`, cls: 'coral' },
            { label: 'Huddles', val: allHuddles.length, cls: 'peach' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{m.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{loading ? '…' : m.val}</div>
            </div>
          ))}
        </div>

        {/* ── DONUT CHARTS ─────────────────────────────────────── */}
        {isSuper && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div className="sv-card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <DonutChart done={tasksDone} total={filtTasks.length} color="#97C459" label="Tasks done" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Task completion</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{tasksDone} completed · {filtTasks.length - tasksDone} pending</div>
                <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>{MONTHS[selMonth]} {selYear}{selButler !== 'All' ? ` · ${selButler}` : ''}</div>
              </div>
            </div>
            <div className="sv-card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <DonutChart done={delightsDone} total={filtDelights.length} color="#E9A0A7" label="Delights" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Guest delights</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{delightsDone} completed · {filtDelights.length - delightsDone} pending</div>
                <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>{selVilla !== 'All' ? `🏡 ${selVilla}` : 'All villas'}</div>
              </div>
            </div>
            <div className="sv-card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <DonutChart done={allHuddles.filter(h => h.status === 'completed').length} total={allHuddles.length} color="#9CCCFC" label="Huddles" sublabel={`${allHuddles.filter(h=>h.status==='completed').length} done`} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Huddle completion</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{allHuddles.filter(h=>h.status==='completed').length} completed · {allHuddles.filter(h=>h.status!=='completed').length} upcoming</div>
                <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>{allTrainings.length} training sessions</div>
              </div>
            </div>
          </div>
        )}

        {/* ── BAR CHARTS ────────────────────────────────────────── */}
        {isSuper && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div className="sv-card">
              <BarChart data={tasksByButler.length > 0 ? tasksByButler : [{name:'No data',value:0}]} color="#9CCCFC" label={`Tasks per butler · ${MONTHS[selMonth]}`} />
            </div>
            <div className="sv-card">
              <BarChart data={delightsByButler.length > 0 ? delightsByButler : [{name:'No data',value:0}]} color="#E9A0A7" label={`Delights per butler · ${MONTHS[selMonth]}`} />
            </div>
            {selVilla === 'All' && (
              <>
                <div className="sv-card">
                  <BarChart data={tasksByVilla.length > 0 ? tasksByVilla : [{name:'No data',value:0}]} color="#97C459" label="Tasks per villa" />
                </div>
                <div className="sv-card">
                  <BarChart data={delightsByVilla.length > 0 ? delightsByVilla : [{name:'No data',value:0}]} color="#FED5A9" label="Delights per villa" />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ACTIVITY FEED ─────────────────────────────────────── */}
        <div className="sv-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Activity feed</div>
              <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>
                {activityFeed.length} events · {MONTHS[selMonth]} {selYear}
                {selButler !== 'All' && ` · ${selButler}`}
                {selVilla !== 'All' && ` · 🏡 ${selVilla}`}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div>
            ) : activityFeed.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted-fg)' }}>No activity for {MONTHS[selMonth]} {selYear}{selButler !== 'All' ? ` · ${selButler}` : ''}.</div>
            ) : activityFeed.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < activityFeed.length-1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: h.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{h.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{h.butler}</span>
                    {h.villa && h.villa !== '—' && <><span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>at</span><span style={{ fontSize: 12, fontWeight: 500, color: '#0C447C' }}>🏡 {h.villa}</span></>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 1 }}>
                    {h.detail}
                    <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 4, background: h.bg, color: h.color, fontWeight: 600, fontSize: 9.5 }}>{h.status}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted-fg)', flexShrink: 0 }}>{timeAgo(h.time)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Butler quick actions */}
        {!isSuper && (
          <div className="sv-card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Quick actions</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="/delight" className="sv-btn sv-btn-secondary" style={{ fontSize: 12 }}>🎁 Log activity</a>
              <a href="/tasks" className="sv-btn sv-btn-secondary" style={{ fontSize: 12 }}>✓ View tasks</a>
              <a href="/training" className="sv-btn sv-btn-secondary" style={{ fontSize: 12 }}>📚 Training</a>
              <a href="/huddle" className="sv-btn sv-btn-secondary" style={{ fontSize: 12 }}>💬 Huddles</a>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
