'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchTasks, getServiceSupabase, type Task } from '@/lib/supabase';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';

const TASK_TYPES = ['Arrival selfie','Guest welcome','Table layout','Exit selfie'];
const taskEmoji: Record<string,string> = { 'Arrival selfie':'🤳','Guest welcome':'🙏','Table layout':'🍽','Exit selfie':'👋' };

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [completing, setCompleting] = useState<string | null>(null);

  const isSuper = user && isSupervisor(user.role as any);

  async function load() {
    const sb = getServiceSupabase();
    let q = sb.from('tasks').select('*, profiles(name), properties(name)').order('created_at', { ascending: false });
    // Butlers only see their own tasks
    if (user && !isSuper) {
      q = q.eq('butler_id', user.id);
    }
    const { data } = await q;
    setTasks((data || []) as any);
    setLoading(false);
  }

  useEffect(() => { if (user) load(); }, [user]);

  async function markComplete(taskId: string) {
    setCompleting(taskId);
    await getServiceSupabase()
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', taskId);
    await load();
    setCompleting(null);
  }

  const filtered = tasks.filter(t => filter === 'All' || t.status === filter);
  const done = tasks.filter(t => t.status === 'completed').length;
  const delayed = tasks.filter(t => t.status === 'delayed').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  return (
    <>
      <Topbar
        title={isSuper ? 'Utilisation tasks' : 'My tasks'}
        subtitle={isSuper ? 'Daily butler task tracking' : 'Tasks assigned to you'}
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total tasks', value: tasks.length, cls: 'blue' },
            { label: 'Completed', value: done, cls: 'green' },
            { label: 'Pending', value: pending, cls: 'peach' },
            { label: 'Delayed', value: delayed, cls: 'coral' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        {/* Task type breakdown */}
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

        {/* Task table */}
        <div className="sv-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {isSuper ? 'All tasks' : 'My tasks'}
              <span className="badge badge-green" style={{ marginLeft: 6 }}>Live</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['All','pending','completed','delayed'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className="sv-btn"
                  style={{ fontSize: 11, padding: '5px 10px', background: filter === f ? '#1B1D1F' : undefined, color: filter === f ? '#fff' : undefined }}>
                  {f === 'All' ? 'All' : getStatusLabel(f)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-fg)' }}>
              {filter === 'All' ? 'No tasks yet.' : `No ${filter} tasks.`}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    {isSuper && <th>Butler</th>}
                    <th>Property</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const tAny = t as any;
                    const isPending = t.status === 'pending';
                    return (
                      <tr key={t.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ fontSize: 18 }}>{taskEmoji[t.type] || '✓'}</span>
                            <span style={{ fontWeight: 500 }}>{t.type}</span>
                          </div>
                        </td>
                        {isSuper && (
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div className="sv-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>
                                {(tAny.profiles?.name || '??').slice(0,2).toUpperCase()}
                              </div>
                              <span style={{ color: 'var(--muted-fg)', fontSize: 13 }}>{tAny.profiles?.name ?? '—'}</span>
                            </div>
                          </td>
                        )}
                        <td style={{ color: 'var(--muted-fg)', fontSize: 13 }}>
                          {t.notes ? t.notes.split(' · ')[0].replace('Villa: ', '') : '—'}
                        </td>
                        <td style={{ color: 'var(--muted-fg)', fontSize: 13 }}>{t.due_time ?? '—'}</td>
                        <td><span className={getStatusBadge(t.status)}>{getStatusLabel(t.status)}</span></td>
                        <td>
                          {isPending ? (
                            <button
                              className="sv-btn sv-btn-primary"
                              style={{ fontSize: 11, padding: '5px 12px' }}
                              disabled={completing === t.id}
                              onClick={() => markComplete(t.id)}
                            >
                              {completing === t.id ? 'Saving…' : '✓ Mark done'}
                            </button>
                          ) : t.status === 'completed' ? (
                            <span style={{ fontSize: 12, color: '#2D5A0E', fontWeight: 600 }}>✅ Done</span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#8B2020' }}>⚠ Delayed</span>
                          )}
                        </td>
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
