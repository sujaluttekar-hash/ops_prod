'use client'
import { useState, useEffect } from 'react'
import Topbar from '@/components/layout/Topbar'
import { getServiceSupabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useButlerLocation } from '@/lib/use-butler-location'
import { isSupervisor } from '@/lib/auth'

// ── Simple bar chart ──────────────────────────────────────────
function BarChart({ data, color, label }: { data: { name: string; value: number }[]; color: string; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
        {data.map(d => (
          <div key={d.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sv-dark)' }}>{d.value}</div>
            <div style={{ width: '100%', height: Math.max(4, (d.value / max) * 60), background: color, borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease', opacity: d.value === 0 ? 0.25 : 1 }} />
            <div style={{ fontSize: 9, color: 'var(--muted-fg)', textAlign: 'center', lineHeight: 1.2, maxWidth: 40, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name.split(' ')[0]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Donut chart ───────────────────────────────────────────────
function DonutChart({ done, total, color, label }: { done: number; total: number; color: string; label: string }) {
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="7" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      </svg>
      <div style={{ marginTop: -52, fontSize: 16, fontWeight: 800, color: 'var(--sv-dark)' }}>{pct}%</div>
      <div style={{ marginTop: 36, fontSize: 10, color: 'var(--muted-fg)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{done}/{total}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { status: locStatus } = useButlerLocation(user?.role === 'butler' ? user as any : null)
  const isSuper = user ? isSupervisor(user.role as any) : false

  // Summary stats
  const [stats, setStats] = useState({ butlers: 0, tasks: 0, tasksDone: 0, delights: 0, huddles: 0, trainings: 0 })
  // Chart data
  const [tasksByButler, setTasksByButler] = useState<{ name: string; value: number }[]>([])
  const [delightsByButler, setDelightsByButler] = useState<{ name: string; value: number }[]>([])
  const [trainingData, setTrainingData] = useState<{ name: string; value: number }[]>([])
  // Activity history
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [user?.id])

  async function load() {
    setLoading(true)
    const sb = getServiceSupabase()
    try {
      const [tasksRes, delightsRes, huddlesRes, profilesRes, trainingsRes] = await Promise.all([
        sb.from('tasks').select('id,type,status,butler_id,notes,completed_at,created_at').order('created_at', { ascending: false }),
        sb.from('guest_delights').select('id,your_name,villa_name,booking_type,booking_date,status,created_at').order('created_at', { ascending: false }),
        sb.from('huddles').select('id,team,huddle_date,status').order('huddle_date', { ascending: false }),
        sb.from('profiles').select('id,name,squad,role').eq('is_active', true),
        sb.from('trainings').select('id,type,date,status').order('date', { ascending: false }),
      ])

      const tasks = tasksRes.data || []
      const delights = delightsRes.data || []
      const huddles = huddlesRes.data || []
      const profiles = profilesRes.data || []
      const trainings = trainingsRes.data || []
      const butlers = profiles.filter((p: any) => p.role === 'butler')

      setStats({
        butlers: butlers.length,
        tasks: tasks.length,
        tasksDone: tasks.filter((t: any) => t.status === 'completed').length,
        delights: delights.length,
        huddles: huddles.length,
        trainings: trainings.length,
      })

      // Tasks per butler (top 8)
      const taskMap: Record<string, number> = {}
      tasks.forEach((t: any) => {
        const nameMatch = t.notes?.match(/Butler: ([^·\n]+)/)
        const name = nameMatch ? nameMatch[1].trim() : (butlers.find((b: any) => b.id === t.butler_id)?.name || '?')
        if (name && name !== '?') taskMap[name] = (taskMap[name] || 0) + 1
      })
      setTasksByButler(Object.entries(taskMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name,value]) => ({ name, value })))

      // Delights per butler (top 8)
      const delMap: Record<string, number> = {}
      delights.forEach((d: any) => { if (d.your_name) delMap[d.your_name] = (delMap[d.your_name] || 0) + 1 })
      setDelightsByButler(Object.entries(delMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name,value]) => ({ name, value })))

      // Training attendance (last 6)
      setTrainingData(trainings.slice(0,6).map((t: any) => ({ name: t.type || 'Training', value: 1 })))

      // Combined activity history (last 20 events)
      const hist: any[] = []
      tasks.slice(0, 10).forEach((t: any) => {
        const nameMatch = t.notes?.match(/Butler: ([^·\n]+)/)
        const butler = nameMatch ? nameMatch[1].trim() : (butlers.find((b: any) => b.id === t.butler_id)?.name || '—')
        const villaMatch = t.notes?.match(/Villa: ([^·\n]+)/)
        const villa = villaMatch ? villaMatch[1].trim() : '—'
        hist.push({ type: 'task', icon: '✓', color: t.status === 'completed' ? '#2D5A0E' : '#0C447C', bg: t.status === 'completed' ? 'rgba(151,196,89,0.1)' : 'rgba(156,204,252,0.1)', butler, villa, detail: t.type, status: t.status, time: t.completed_at || t.created_at })
      })
      delights.slice(0, 10).forEach((d: any) => {
        hist.push({ type: 'delight', icon: '🎁', color: '#7A4A08', bg: 'rgba(254,213,169,0.15)', butler: d.your_name || '—', villa: d.villa_name || '—', detail: d.booking_type, status: d.status, time: d.created_at })
      })
      // Sort by time desc
      hist.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
      setHistory(hist.slice(0, 20))

    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const taskPct = stats.tasks > 0 ? Math.round(stats.tasksDone / stats.tasks * 100) : 0

  return (
    <>
      <Topbar
        title={user?.role === 'butler' ? `Welcome, ${user?.name || 'Butler'} 👋` : 'Operations dashboard'}
        subtitle={today}
        actions={isSuper ? <a href="/allocation" style={{ textDecoration: 'none' }}><button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Assign task</button></a> : undefined}
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Location banner — butler only */}
        {user?.role === 'butler' && locStatus === 'denied' && (
          <div style={{ background: 'rgba(233,160,167,0.12)', border: '1px solid #E9A0A7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📍</span>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: '#8B2020' }}>Location access denied</div><div style={{ fontSize: 11, color: '#8B2020', marginTop: 2 }}>Enable location in browser settings so your supervisor can see your position on the map.</div></div>
          </div>
        )}
        {user?.role === 'butler' && locStatus === 'active' && (
          <div style={{ background: 'rgba(151,196,89,0.1)', border: '1px solid #97C459', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📍</span><div style={{ fontSize: 12, color: '#2D5A0E', fontWeight: 500 }}>Location sharing active — your supervisor can see you on the map.</div>
          </div>
        )}

        {/* Summary KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total butlers', val: stats.butlers, cls: 'blue' },
            { label: 'Tasks', val: `${stats.tasksDone}/${stats.tasks}`, cls: 'green' },
            { label: 'Guest delights', val: stats.delights, cls: 'coral' },
            { label: 'Huddles', val: stats.huddles, cls: 'peach' },
            { label: 'Trainings', val: stats.trainings, cls: 'blue' },
            { label: 'Task completion', val: `${taskPct}%`, cls: 'green' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{loading ? '…' : m.val}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        {isSuper && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 24 }}>
            {/* Task completion donut */}
            <div className="sv-card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <DonutChart done={stats.tasksDone} total={stats.tasks} color="#97C459" label="Tasks done" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Task completion</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{stats.tasksDone} completed</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{stats.tasks - stats.tasksDone} pending</div>
              </div>
            </div>
            {/* Delight donut */}
            <div className="sv-card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <DonutChart done={stats.delights} total={stats.delights + 5} color="#E9A0A7" label="Delights" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Guest delights</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{stats.delights} logged</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>across all villas</div>
              </div>
            </div>
            {/* Training donut */}
            <div className="sv-card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <DonutChart done={stats.trainings} total={Math.max(stats.trainings, stats.butlers)} color="#9CCCFC" label="Trainings" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Training sessions</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{stats.trainings} sessions</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{stats.huddles} huddles</div>
              </div>
            </div>
          </div>
        )}

        {/* Bar charts */}
        {isSuper && tasksByButler.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            <div className="sv-card">
              <BarChart data={tasksByButler} color="#9CCCFC" label="Tasks assigned per butler" />
            </div>
            <div className="sv-card">
              <BarChart data={delightsByButler.length > 0 ? delightsByButler : [{ name: 'No data', value: 0 }]} color="#E9A0A7" label="Delights per butler" />
            </div>
          </div>
        )}

        {/* Activity history */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Activity feed</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginBottom: 16 }}>Recent tasks & delights — butler · villa · activity</div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted-fg)' }}>No activity yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {history.map((h, i) => {
                const timeAgo = (() => {
                  if (!h.time) return '—'
                  const diff = Date.now() - new Date(h.time).getTime()
                  const mins = Math.floor(diff / 60000)
                  if (mins < 1) return 'just now'
                  if (mins < 60) return `${mins}m ago`
                  const hrs = Math.floor(mins / 60)
                  if (hrs < 24) return `${hrs}h ago`
                  return `${Math.floor(hrs / 24)}d ago`
                })()
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < history.length - 1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: h.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{h.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sv-dark)' }}>{h.butler}</span>
                        {h.villa && h.villa !== '—' && (
                          <><span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>at</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#0C447C' }}>🏡 {h.villa}</span></>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>
                        {h.detail}
                        <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: h.bg, color: h.color, fontWeight: 600, fontSize: 10 }}>{h.status}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', flexShrink: 0 }}>{timeAgo}</div>
                  </div>
                )
              })}
            </div>
          )}
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
