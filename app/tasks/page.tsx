'use client';
import { useState, useEffect, useRef } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchTasks, getServiceSupabase, uploadTaskPhoto, type Task } from '@/lib/supabase';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';

const TASK_TYPES = ['Arrival selfie','Guest welcome','Table layout','Exit selfie','Custom task'];
const taskEmoji: Record<string,string> = { 'Arrival selfie':'🤳','Guest welcome':'🙏','Table layout':'🍽','Exit selfie':'👋','Custom task':'✏️' };

// ── Complete Task Modal ────────────────────────────────────────
function CompleteTaskModal({ task, onClose, onDone }: { task: any; onClose: () => void; onDone: (taskId: string) => void }) {
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto({ file, preview: ev.target?.result as string });
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      let photo_url: string | null = null;
      if (photo) {
        photo_url = await uploadTaskPhoto(photo.file, task.id);
      }
      const { error } = await getServiceSupabase().from('tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: [isCustom && customTaskName ? `Task: ${customTaskName}` : '', notes || task.notes || ''].filter(Boolean).join(' · ') || null,
        photo_path: photo_url || task.photo_path || null,
      }).eq('id', task.id);

      if (error) {
        alert('Failed to save: ' + error.message);
        setSaving(false);
        return;
      }

      setDone(true);
      onDone(task.id); // update parent state immediately
      setTimeout(() => { onClose(); }, 1200);
    } catch (e: any) {
      alert('Error: ' + e.message);
      setSaving(false);
    }
  }

  const [customTaskName, setCustomTaskName] = useState('');
  const villaName = task.notes?.replace('Villa: ', '').split(' · ')[0] || task.property_id || '—';
  const isCustom = task.type === 'Custom task';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Task completed!</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Complete task</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>
                  {taskEmoji[task.type] || '✓'} {task.type} · {villaName}
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
            </div>
            <div className="sv-strip" style={{ marginBottom: 18 }} />
            {/* Custom task name input */}
            {isCustom && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Task name *</div>
                <input
                  value={customTaskName} onChange={e => setCustomTaskName(e.target.value)}
                  placeholder="Describe what you did…"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            )}

            {/* Photo upload */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Photo proof (optional)</div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
              <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              {photo ? (
                <div style={{ position: 'relative' }}>
                  <img src={photo.preview} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10 }} />
                  <button onClick={() => setPhoto(null)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => cameraRef.current?.click()}
                    style={{ flex: 1, padding: '12px 0', background: '#1B1D1F', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    📷 Take photo
                  </button>
                  <button type="button" onClick={() => galleryRef.current?.click()}
                    style={{ flex: 1, padding: '12px 0', background: 'var(--muted)', color: 'var(--sv-dark)', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    🖼 Gallery
                  </button>
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Notes (optional)</div>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any notes about this task..."
                style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, resize: 'vertical', minHeight: 72, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="sv-btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button type="button" className="sv-btn sv-btn-primary" onClick={handleSubmit} disabled={saving || (isCustom && !customTaskName.trim())} style={{ flex: 2 }}>
                {saving ? 'Submitting…' : '✓ Submit & complete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [completeTask, setCompleteTask] = useState<any | null>(null);

  const isSuper = user ? isSupervisor(user.role as any) : false;

  async function load(currentUser = user) {
    if (!currentUser) return;
    const sb = getServiceSupabase();
    const supervisor = isSupervisor(currentUser.role as any);

    if (!supervisor) {
      // Butler: fetch ALL tasks, filter client-side by butler_id or notes
      const { data: allTasks } = await sb
        .from('tasks').select('*, profiles(name)')
        .order('created_at', { ascending: false });
      if (allTasks) {
        const mine = allTasks.filter((t: any) =>
          t.butler_id === currentUser.id ||
          t.notes?.includes(`ButlerID: ${currentUser.id}`) ||
          t.notes?.includes(`Butler: ${currentUser.name}`)
        );
        setTasks(mine as any);
      }
    } else {
      // Admin/supervisor: all tasks
      const { data } = await sb
        .from('tasks').select('*, profiles(name)')
        .order('created_at', { ascending: false });
      setTasks((data || []) as any);
    }
    setLoading(false);
  }

  useEffect(() => {
    // Read user directly from localStorage to avoid stale closure
    const stored = localStorage.getItem('sv_local_session');
    if (stored) {
      try {
        const localUser = JSON.parse(stored);
        load(localUser);
      } catch {}
    }
  }, []);

  useEffect(() => { if (user) load(user); }, [user]);

  // Poll every 15s
  useEffect(() => {
    const t = setInterval(() => { if (user) load(user); }, 15000);
    return () => clearInterval(t);
  }, [user]);

  const filtered = tasks.filter(t => filter === 'All' || t.status === filter);
  const done = tasks.filter(t => t.status === 'completed').length;
  const delayed = tasks.filter(t => t.status === 'delayed').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  return (
    <>
      {completeTask && <CompleteTaskModal task={completeTask} onClose={() => setCompleteTask(null)} onDone={(taskId) => {
        // Immediately update local state so UI reflects completion
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' as any } : t));
        setCompleteTask(null);
        // Also re-fetch from Supabase after a short delay
        setTimeout(load, 1000);
      }} />}
      <Topbar title={isSuper ? 'Utilisation tasks' : 'My tasks'} subtitle={isSuper ? 'Daily butler task tracking' : 'Tasks assigned to you'}
        actions={<button className="sv-btn" style={{ fontSize: 12 }} onClick={load}>↻ Refresh</button>} />
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

        {/* Type breakdown */}
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
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                    <th>Villa</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const tAny = t as any;
                    const isPending = t.status === 'pending';
                    const villaName = t.notes?.replace('Villa: ', '').split(' · ')[0] || '—';
                    return (
                      <tr key={t.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ fontSize: 16 }}>{taskEmoji[t.type] || '✓'}</span>
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
                        <td style={{ color: 'var(--muted-fg)', fontSize: 13 }}>{villaName}</td>
                        <td style={{ color: 'var(--muted-fg)', fontSize: 13 }}>{t.due_time ?? '—'}</td>
                        <td><span className={getStatusBadge(t.status)}>{getStatusLabel(t.status)}</span></td>
                        <td>
                          {isPending ? (
                            <button
                              className="sv-btn sv-btn-primary"
                              style={{ fontSize: 11, padding: '5px 12px' }}
                              onClick={() => setCompleteTask(t)}>
                              Complete task
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
