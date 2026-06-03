'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchDashboardStats, fetchProfiles, type Profile } from '@/lib/supabase';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ delights: any[]; tasks: any[]; upcomingHuddles: any[] }>({ delights: [], tasks: [], upcomingHuddles: [] });
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    async function load() {
      const [s, p] = await Promise.all([fetchDashboardStats(), fetchProfiles()]);
      setStats(s); setProfiles(p); setLoading(false);
    }
    load();
  }, []);

  const delightDone = stats.delights.filter(d => d.status === 'completed').length;
  const delightTotal = stats.delights.length;
  const taskDone = stats.tasks.filter(t => t.status === 'completed').length;
  const taskTotal = stats.tasks.length;

  return (
    <>
      <Topbar title="Operations dashboard"
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ New task</button>} />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total butlers</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : profiles.length}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>Active profiles</div>
          </div>
          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Tasks today</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : taskTotal}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>{taskDone} done · {taskTotal - taskDone} pending</div>
          </div>
          <div className="metric-card peach">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Guest delights</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : <>{delightDone}<span style={{ fontSize: 16, fontWeight: 400, color: 'var(--muted-fg)' }}>/{delightTotal}</span></>}</div>
            {!loading && delightTotal > 0 && (
              <div style={{ marginTop: 8 }}>
                <div className="progress-track"><div className="progress-fill fill-peach" style={{ width: `${Math.round(delightDone / delightTotal * 100)}%` }} /></div>
                <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>{delightDone} done · {delightTotal - delightDone} pending</div>
              </div>
            )}
          </div>
          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Avg quiz score</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>—</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>No quizzes yet</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Butler roster</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              profiles.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No butlers added yet. Add them via Supabase → profiles table.</div> :
              profiles.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                  <div className="sv-avatar">{p.name.slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{p.squad ?? '—'} · {p.role}</div>
                  </div>
                  <span className="badge badge-green">Active</span>
                </div>
              ))
            }
          </div>

          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Upcoming huddles</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              stats.upcomingHuddles.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No upcoming huddles scheduled.</div> :
              stats.upcomingHuddles.slice(0, 3).map((h: any) => {
                const d = new Date(h.huddle_date);
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 14, background: 'var(--muted)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div className="huddle-date">
                      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase' }}>{d.toLocaleString('default', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{h.team}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>{h.time} · {h.participants_expected} expected</div>
                      <div style={{ marginTop: 8 }}><span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span></div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Guest delight summary</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              stats.delights.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No delight entries yet. Log activity via Guest delight.</div> :
              ['pending','completed','overdue'].map(s => {
                const count = stats.delights.filter((d: any) => d.status === s).length;
                return (
                  <div key={s} className="stat-row">
                    <div style={{ width: 100, flexShrink: 0, fontSize: 13, textTransform: 'capitalize' }}>{s}</div>
                    <div className="progress-track" style={{ flex: 1 }}>
                      <div className={`progress-fill ${s === 'completed' ? 'fill-green' : s === 'pending' ? 'fill-peach' : 'fill-coral'}`}
                        style={{ width: delightTotal > 0 ? `${Math.round(count / delightTotal * 100)}%` : '0%' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, width: 24, textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })
            }
          </div>

          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Task summary</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              stats.tasks.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No tasks yet. Assign tasks via the Tasks module.</div> :
              ['completed','pending','delayed'].map(s => {
                const count = stats.tasks.filter((t: any) => t.status === s).length;
                return (
                  <div key={s} className="stat-row">
                    <div style={{ width: 100, flexShrink: 0, fontSize: 13, textTransform: 'capitalize' }}>{s}</div>
                    <div className="progress-track" style={{ flex: 1 }}>
                      <div className={`progress-fill ${s === 'completed' ? 'fill-green' : s === 'pending' ? 'fill-peach' : 'fill-coral'}`}
                        style={{ width: taskTotal > 0 ? `${Math.round(count / taskTotal * 100)}%` : '0%' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, width: 24, textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </>
  );
}
