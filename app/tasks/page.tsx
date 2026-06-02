'use client';
import { useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import { tasks } from '@/lib/data';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

const taskTypes = [
  { type: 'Arrival selfie', emoji: '🤳', color: 'rgba(156,204,252,0.12)', border: 'rgba(156,204,252,0.3)' },
  { type: 'Guest welcome', emoji: '🙏', color: 'rgba(254,213,169,0.15)', border: 'rgba(254,213,169,0.4)' },
  { type: 'Table layout', emoji: '🍽', color: 'rgba(233,160,167,0.1)', border: 'rgba(233,160,167,0.3)' },
  { type: 'Exit selfie', emoji: '👋', color: 'rgba(151,196,89,0.1)', border: 'rgba(151,196,89,0.3)' },
];

export default function TasksPage() {
  const [filter, setFilter] = useState('All');
  const completed = tasks.filter(t => t.status === 'completed').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const delayed = tasks.filter(t => t.status === 'delayed').length;

  const filtered = tasks.filter(t => filter === 'All' || t.status === filter);

  return (
    <>
      <Topbar
        title="Utilisation tasks"
        subtitle="Daily butler task tracking with photo proof"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Assign task</button>}
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Assigned today</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{tasks.length}</div>
          </div>
          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Completed</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{completed}</div>
          </div>
          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Delayed</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{delayed}</div>
          </div>
          <div className="metric-card peach">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Avg score</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>91%</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          {/* Task type breakdown */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Task types — today</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {taskTypes.map(t => {
                const count = tasks.filter(tk => tk.type === t.type).length;
                const done = tasks.filter(tk => tk.type === t.type && tk.status === 'completed').length;
                return (
                  <div key={t.type} style={{
                    background: t.color, border: `0.5px solid ${t.border}`,
                    borderRadius: 10, padding: 14, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 26, marginBottom: 4 }}>{t.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)' }}>{t.type}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{done}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted-fg)' }}>/{count}</span></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upload zone */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Submit task completion</div>
            <div style={{ marginBottom: 12 }}>
              <select className="sv-select" style={{ width: '100%', marginBottom: 8 }}>
                <option>Select task type</option>
                <option>Arrival selfie</option>
                <option>Guest welcome</option>
                <option>Table layout</option>
                <option>Exit selfie</option>
              </select>
              <select className="sv-select" style={{ width: '100%' }}>
                <option>Select property</option>
                <option>Villa Serenity</option>
                <option>Casa Azure</option>
                <option>The Hillside</option>
              </select>
            </div>
            <div className="upload-zone">
              <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
              <div style={{ fontWeight: 500 }}>Tap to capture proof photo</div>
              <div style={{ fontSize: 11, marginTop: 4, color: 'var(--muted-fg)' }}>Geo-tagged · Timestamped · Required</div>
            </div>
            <button className="sv-btn sv-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12, fontSize: 13 }}>
              Submit task
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="sv-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>All tasks</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['All', 'completed', 'pending', 'delayed'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="sv-btn"
                  style={{
                    fontSize: 11, padding: '5px 10px',
                    background: filter === f ? '#1B1D1F' : undefined,
                    color: filter === f ? '#fff' : undefined,
                    borderColor: filter === f ? '#1B1D1F' : undefined,
                  }}
                >
                  {f === 'All' ? 'All' : getStatusLabel(f)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sv-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Property</th>
                  <th>Butler</th>
                  <th>Due</th>
                  <th>Completed</th>
                  <th>Status</th>
                  <th>Approval</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.type}</td>
                    <td style={{ color: 'var(--muted-fg)' }}>{t.property}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="sv-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>{t.initials}</div>
                        <span style={{ fontSize: 12 }}>{t.butler}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted-fg)' }}>{t.dueTime}</td>
                    <td style={{ color: 'var(--muted-fg)' }}>{t.time || '—'}</td>
                    <td><span className={getStatusBadge(t.status)}>{getStatusLabel(t.status)}</span></td>
                    <td>
                      {t.status === 'completed' ? (
                        <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }}>✓ View</button>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
