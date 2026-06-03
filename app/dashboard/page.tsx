'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchDashboardStats, fetchProfiles, type Profile, type GuestDelight, type Task } from '@/lib/supabase';
import { butlers as mockButlers, tasks as mockTasks, guestDelights as mockDelights } from '@/lib/data';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    delights: { id: string; status: string }[];
    tasks: { id: string; status: string }[];
    upcomingHuddles: { id: string; team: string; huddle_date: string; time: string | null; participants_expected: number; status: string }[];
  }>({ delights: [], tasks: [], upcomingHuddles: [] });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [s, p] = await Promise.all([fetchDashboardStats(), fetchProfiles()]);
        // If no data in Supabase yet, fall back to mock
        if (s.tasks.length === 0 && s.delights.length === 0) {
          setUsingMock(true);
        } else {
          setStats(s);
          setProfiles(p);
        }
      } catch {
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Use live data or mock fallback
  const delights = usingMock ? mockDelights : stats.delights;
  const taskList = usingMock ? mockTasks : stats.tasks;

  const delightTotal = delights.length;
  const delightDone = delights.filter((d: any) => d.status === 'completed').length;
  const delightPending = delightTotal - delightDone;
  const delightPct = delightTotal > 0 ? Math.round((delightDone / delightTotal) * 100) : 0;

  const taskTotal = taskList.length;
  const taskDone = taskList.filter((t: any) => t.status === 'completed').length;
  const taskPending = taskTotal - taskDone;

  const butlerList = usingMock ? mockButlers : profiles.map(p => ({
    id: p.id,
    name: p.name,
    initials: p.name.slice(0, 2).toUpperCase(),
    property: p.squad ?? '—',
    score: 80,
    tasks: 80,
    quizScore: 80,
    attendance: 80,
  }));

  const upcomingHuddles = usingMock
    ? [
        { id: '1', team: 'Lonavala team huddle', huddle_date: '2026-06-08', time: '10:00 AM', participants_expected: 12, status: 'scheduled' },
        { id: '2', team: 'Alibaug team huddle', huddle_date: '2026-06-22', time: '11:00 AM', participants_expected: 9, status: 'tbc' },
      ]
    : stats.upcomingHuddles;

  return (
    <>
      <Topbar
        title="Operations dashboard"
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ New task</button>}
      />
      <div style={{ padding: 24 }} className="page-enter">
        {usingMock && (
          <div style={{
            background: 'rgba(254,213,169,0.2)', border: '0.5px solid rgba(254,213,169,0.5)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            fontSize: 12, color: '#7A4A08', display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span>⚠</span> Showing sample data — Supabase tables are empty. Add data via the modules or run seed SQL.
          </div>
        )}

        <div className="sv-strip" />

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total butlers</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : butlerList.length || 24}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>Across 5 properties</div>
          </div>

          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Tasks today</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : taskTotal}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>{taskDone} done · {taskPending} pending</div>
          </div>

          <div className="metric-card peach">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Guest delights</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              {loading ? '…' : <>{delightDone}<span style={{ fontSize: 16, fontWeight: 400, color: 'var(--muted-fg)' }}>/{delightTotal}</span></>}
            </div>
            {!loading && (
              <div style={{ marginTop: 8 }}>
                <div className="progress-track">
                  <div className="progress-fill fill-peach" style={{ width: `${delightPct}%` }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>
                  {delightDone} done · {delightPending} pending
                </div>
              </div>
            )}
          </div>

          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Avg quiz score</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>84%</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>Across all quizzes</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          {/* Butler productivity */}
          <div className="sv-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Butler productivity</div>
              <span className="badge badge-blue">This week</span>
            </div>
            {loading ? (
              <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div>
            ) : (
              butlerList.slice(0, 6).map((b: any) => (
                <div key={b.id} className="stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 130, flexShrink: 0 }}>
                    <div className="sv-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>{b.initials}</div>
                    <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.name.split(' ')[0]} {b.name.split(' ')[1]?.[0]}.
                    </span>
                  </div>
                  <div className="progress-track" style={{ flex: 1 }}>
                    <div
                      className={`progress-fill ${b.score >= 80 ? 'fill-blue' : b.score >= 65 ? 'fill-peach' : 'fill-coral'}`}
                      style={{ width: `${b.score}%` }}
                    />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, width: 34, textAlign: 'right' }}>{b.score}%</span>
                </div>
              ))
            )}
          </div>

          {/* Today's activity */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Today's activity</div>
            {loading ? (
              <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div>
            ) : (
              (usingMock ? mockTasks : []).slice(0, 6).map((task: any) => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: task.status === 'completed' ? '#97C459' : 'transparent',
                    border: `1.5px solid ${task.status === 'completed' ? '#97C459' : '#ccc'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff', flexShrink: 0,
                  }}>
                    {task.status === 'completed' ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{task.type} — {task.property}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>
                      {task.butler} · {task.status === 'completed' ? task.time : `Due ${task.dueTime}`}
                    </div>
                  </div>
                  <span className={getStatusBadge(task.status)}>{getStatusLabel(task.status)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Property status */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Property occupancy</div>
            {[
              { name: 'Villa Serenity', loc: 'Lonavala', status: 'occupied', val: 100 },
              { name: 'Casa Azure', loc: 'Alibaug', status: 'occupied', val: 100 },
              { name: 'The Hillside', loc: 'Karjat', status: 'partial', val: 60 },
              { name: 'Villa Bloom', loc: 'Nashik', status: 'vacant', val: 0 },
              { name: 'Casa Paradiso', loc: 'Pune', status: 'occupied', val: 100 },
            ].map(p => (
              <div key={p.name} className="stat-row">
                <div style={{ width: 130, flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted-fg)' }}>{p.loc}</div>
                </div>
                <div className="progress-track" style={{ flex: 1 }}>
                  <div className={`progress-fill ${p.status === 'occupied' ? 'fill-blue' : p.status === 'partial' ? 'fill-peach' : ''}`} style={{ width: `${p.val}%` }} />
                </div>
                <span className={getStatusBadge(p.status)} style={{ marginLeft: 6 }}>{getStatusLabel(p.status)}</span>
              </div>
            ))}
          </div>

          {/* Upcoming huddles */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Upcoming — next 7 days</div>
            {loading ? (
              <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div>
            ) : upcomingHuddles.length === 0 ? (
              <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No upcoming huddles</div>
            ) : (
              upcomingHuddles.slice(0, 3).map(h => {
                const d = new Date(h.huddle_date);
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'var(--muted)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div className="huddle-date">
                      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase' }}>{d.toLocaleString('default', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{h.team}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>{h.time} · {h.participants_expected} expected</div>
                      <div style={{ marginTop: 8 }}>
                        <span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
