'use client';
import Topbar from '@/components/layout/Topbar';
import { butlers, tasks, huddles, guestDelights } from '@/lib/data';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

export default function DashboardPage() {
  const completedToday = tasks.filter(t => t.status === 'completed').length;
  const pendingToday = tasks.filter(t => t.status !== 'completed').length;

  return (
    <>
      <Topbar
        title="Operations dashboard"
        subtitle="Tuesday, June 2, 2026"
        actions={
          <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ New task</button>
        }
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total butlers</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--sv-dark)', lineHeight: 1 }}>24</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>Across 5 properties</div>
          </div>
          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Tasks today</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--sv-dark)', lineHeight: 1 }}>{completedToday + pendingToday}</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>{completedToday} done · {pendingToday} pending</div>
          </div>
          <div className="metric-card peach">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Guest delights</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--sv-dark)', lineHeight: 1 }}>
              {guestDelights.filter(d => d.status === 'completed').length}
              <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--muted-fg)' }}>/{guestDelights.length}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <div className="progress-track">
                <div className="progress-fill fill-peach" style={{ width: `${Math.round(guestDelights.filter(d => d.status === 'completed').length / guestDelights.length * 100)}%` }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>
                {guestDelights.filter(d => d.status === 'completed').length} done · {guestDelights.filter(d => d.status !== 'completed').length} pending
              </div>
            </div>
          </div>
          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Avg quiz score</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--sv-dark)', lineHeight: 1 }}>84%</div>
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
            {butlers.map(b => (
              <div key={b.id} className="stat-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 130, flexShrink: 0 }}>
                  <div className="sv-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>{b.initials}</div>
                  <span style={{ fontSize: 12, color: 'var(--sv-dark)' }}>{b.name.split(' ')[0]}{b.name.split(' ')[1] ? ` ${b.name.split(' ')[1][0]}.` : ''}</span>
                </div>
                <div className="progress-track" style={{ flex: 1 }}>
                  <div
                    className={`progress-fill ${b.score >= 80 ? 'fill-blue' : b.score >= 65 ? 'fill-peach' : 'fill-coral'}`}
                    style={{ width: `${b.score}%` }}
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, width: 34, textAlign: 'right' }}>{b.score}%</span>
              </div>
            ))}
          </div>

          {/* Today's activity */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Today's activity</div>
            {tasks.slice(0, 6).map(task => (
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
            ))}
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
                  <div
                    className={`progress-fill ${p.status === 'occupied' ? 'fill-blue' : p.status === 'partial' ? 'fill-peach' : ''}`}
                    style={{ width: `${p.val}%` }}
                  />
                </div>
                <span className={getStatusBadge(p.status)} style={{ marginLeft: 6 }}>{getStatusLabel(p.status)}</span>
              </div>
            ))}
          </div>

          {/* Upcoming */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Upcoming — next 7 days</div>
            {huddles.filter(h => h.status === 'scheduled' || h.status === 'tbc').map(h => (
              <div key={h.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'var(--muted)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div className="huddle-date">
                  <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{h.date}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase' }}>{h.month}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{h.team}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>{h.time} · {h.participants} participants expected</div>
                  <div style={{ marginTop: 8 }}>
                    <span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'var(--muted)', borderRadius: 10, padding: 12 }}>
              <div className="huddle-date" style={{ background: '#1B1D1F', color: '#FED5A9' }}>
                <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>10</div>
                <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase' }}>Jun</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>F&B training session</div>
                <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>02:00 PM · Quiz to follow</div>
                <div style={{ marginTop: 8 }}><span className="badge badge-blue">Upcoming</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
