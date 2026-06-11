'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchTasks, type Task } from '@/lib/supabase';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

const TASK_TYPES = ['Arrival selfie','Guest welcome','Table layout','Exit selfie'];
const taskEmoji: Record<string,string> = { 'Arrival selfie':'🤳','Guest welcome':'🙏','Table layout':'🍽','Exit selfie':'👋' };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => { fetchTasks().then(d => { setTasks(d); setLoading(false); }); }, []);

  const filtered = tasks.filter(t => filter === 'All' || t.status === filter);
  const done = tasks.filter(t => t.status === 'completed').length;
  const delayed = tasks.filter(t => t.status === 'delayed').length;

  return (
    <>
      <Topbar title="Utilisation tasks" subtitle="Daily butler task tracking"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Assign task</button>} />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Assigned today', value: tasks.length, cls: 'blue' },
            { label: 'Completed', value: done, cls: 'green' },
            { label: 'Delayed', value: delayed, cls: 'coral' },
            { label: 'Completion', value: tasks.length > 0 ? `${Math.round(done/tasks.length*100)}%` : '—', cls: 'peach' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
          {TASK_TYPES.map(type => {
            const count = tasks.filter(t => t.type === type).length;
            const doneCount = tasks.filter(t => t.type === type && t.status === 'completed').length;
            return (
              <div key={type} className="sv-card" style={{ textAlign: 'center', padding: 14 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{taskEmoji[type]}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)' }}>{type}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{doneCount}<span style={{ fontSize: 13, color: 'var(--muted-fg)' }}>/{count}</span></div>
              </div>
            );
          })}
        </div>

        <div className="sv-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>All tasks <span className="badge badge-green" style={{ marginLeft: 6 }}>Live</span></div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['All','completed','pending','delayed'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className="sv-btn"
                  style={{ fontSize: 11, padding: '5px 10px', background: filter === f ? '#1B1D1F' : undefined, color: filter === f ? '#fff' : undefined }}>
                  {f === 'All' ? 'All' : getStatusLabel(f)}
                </button>
              ))}
            </div>
          </div>
          {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading from Supabase…</div> :
            tasks.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-fg)' }}>No tasks yet. Assign tasks to butlers to see them here.</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead><tr><th>Task</th><th>Butler</th><th>Property</th><th>Due</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map(t => {
                    const tAny = t as any;
                    return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.type}</td>
                      <td style={{ color: 'var(--muted-fg)' }}>{tAny.profiles?.name ?? '—'}</td>
                      <td style={{ color: 'var(--muted-fg)' }}>{tAny.properties?.name ?? '—'}</td>
                      <td style={{ color: 'var(--muted-fg)' }}>{t.due_time ?? '—'}</td>
                      <td><span className={getStatusBadge(t.status)}>{getStatusLabel(t.status)}</span></td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
