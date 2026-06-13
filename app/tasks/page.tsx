'use client';
import { useState, useEffect, useRef } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchTasks, getServiceSupabase, uploadTaskPhoto, LOCAL_PROFILES, type Task } from '@/lib/supabase';
import { getCurrentPosition } from '@/lib/get-location';
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
      // Get GPS location at time of task completion
      const pos = await getCurrentPosition();

      let photo_url: string | null = null;
      if (photo) {
        photo_url = await uploadTaskPhoto(photo.file, task.id);
      }

      const { error } = await getServiceSupabase().from('tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: [isCustom && customTaskName ? `Task: ${customTaskName}` : '', notes || task.notes || ''].filter(Boolean).join(' · ') || null,
        photo_path: photo_url || task.photo_path || null,
        geo_lat: pos?.lat || null,
        geo_lng: pos?.lng || null,
      }).eq('id', task.id);

      if (error) {
        alert('Failed to save: ' + error.message);
        setSaving(false);
        return;
      }

      // Update butler's live location on the map
      if (pos) {
        try {
          const stored = localStorage.getItem('sv_local_session');
          if (stored) {
            const u = JSON.parse(stored);
            await fetch('/api/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ butler_id: u.id, butler_name: u.name, squad: u.squad || null, lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy }),
            });
          }
        } catch {}
      }

      setDone(true);
      onDone(task.id);
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
  const [viewPhoto, setViewPhoto] = useState<any | null>(null);

  const isSuper = user ? isSupervisor(user.role as any) : false;

  async function loadForUser(u: { id: string; name: string; role: string }) {
    const supervisor = isSupervisor(u.role as any);
    try {
      // Use server-side API route — guaranteed to work regardless of client-side Supabase state
      const url = supervisor
        ? '/api/tasks?all=1'
        : `/api/tasks?uid=${encodeURIComponent(u.id)}&name=${encodeURIComponent(u.name)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data as any);
    } catch (e) {
      console.error('Tasks fetch error:', e);
    }
    setLoading(false);
  }

  function load() {
    // Always read fresh from localStorage — never use stale closure
    try {
      const stored = localStorage.getItem('sv_local_session');
      if (stored) { loadForUser(JSON.parse(stored)); }
    } catch {}
  }

  // Run on mount immediately
  useEffect(() => { load(); }, []);

  // Also run when auth context user changes
  useEffect(() => { if (user) loadForUser(user as any); }, [user?.id]);

  // Poll every 15s
  useEffect(() => {
    const t = setInterval(() => load(), 15000);
    return () => clearInterval(t);
  }, []);

  const filtered = tasks.filter(t => filter === 'All' || t.status === filter);
  const done = tasks.filter(t => t.status === 'completed').length;
  const delayed = tasks.filter(t => t.status === 'delayed').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  return (
    <>
      {/* Photo lightbox */}
      {/* Task photo verification modal */}
      {viewPhoto && (
        <div onClick={() => setViewPhoto(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Task proof — {viewPhoto.type}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 3, display: 'flex', gap: 10 }}>
                  {(() => {
                    const nameMatch = viewPhoto.notes?.match(/Butler: ([^·]+)/);
                    const butler = nameMatch ? nameMatch[1].trim() : '—';
                    const villaMatch = viewPhoto.notes?.match(/Villa: ([^·]+)/);
                    const villa = villaMatch ? villaMatch[1].trim() : '—';
                    return <><span>👤 {butler}</span><span>🏡 {villa}</span>{viewPhoto.due_time && <span>⏰ {viewPhoto.due_time}</span>}</>;
                  })()}
                </div>
              </div>
              <button onClick={() => setViewPhoto(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)', padding: '0 4px' }}>✕</button>
            </div>
            {/* Photo */}
            {viewPhoto.photo_path ? (
              <div style={{ background: '#f5f5f3', position: 'relative' }}>
                <img src={viewPhoto.photo_path} alt="Task proof"
                  style={{ width: '100%', maxHeight: '55vh', objectFit: 'contain', display: 'block' }} />
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(151,196,89,0.9)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                  ✅ Completed
                </div>
              </div>
            ) : (
              <div style={{ background: '#f5f5f3', padding: '40px 0', textAlign: 'center', color: 'var(--muted-fg)', fontSize: 13 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                No photo uploaded for this task.
              </div>
            )}
            {/* Footer */}
            <div style={{ padding: '14px 20px', display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>
                Completed: {viewPhoto.completed_at ? new Date(viewPhoto.completed_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {viewPhoto.photo_path && (
                  <a href={viewPhoto.photo_path} download target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    <button className="sv-btn" style={{ fontSize: 12 }}>⬇ Download</button>
                  </a>
                )}
                <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setViewPhoto(null)}>✓ Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {completeTask && <CompleteTaskModal task={completeTask} onClose={() => setCompleteTask(null)} onDone={(taskId) => {
        // Immediately update local state so UI reflects completion
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' as any } : t));
        setCompleteTask(null);
        // Also re-fetch from Supabase after a short delay
        setTimeout(load, 1000);
      }} />}
      <Topbar title={isSuper ? 'Utilisation tasks' : 'My tasks'} subtitle={isSuper ? 'Daily butler task tracking' : `Tasks assigned to you · v${new Date().getMinutes()}`}
        actions={<button className="sv-btn" style={{ fontSize: 12 }} onClick={() => load()}>↻ Refresh</button>} />
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
                    // Extract villa — handle multiple note formats
                    const villaMatch = t.notes?.match(/Villa: ([^·]+)/);
                    const hasButlerPrefix = t.notes?.startsWith('Butler:');
                    const villaName = villaMatch
                      ? villaMatch[1].trim()
                      : (!hasButlerPrefix && t.notes && t.notes.trim() ? t.notes.split(' · ')[0].trim() : '—');
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
                              {(() => {
                                // Extract butler name from notes OR by butler_id UUID lookup
                                const nameMatch = t.notes?.match(/Butler: ([^\u00b7\n]+)/);
                                const profileMatch = t.butler_id ? LOCAL_PROFILES.find((p: any) => p.id === t.butler_id) : null;
                                const butlerName = (nameMatch ? nameMatch[1].trim() : null) || profileMatch?.name || tAny.profiles?.name || null;
                                return (
                                  <>
                                    <div className="sv-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>
                                      {butlerName ? butlerName.slice(0,2).toUpperCase() : '?'}
                                    </div>
                                    <span style={{ color: 'var(--muted-fg)', fontSize: 13 }}>{butlerName || '—'}</span>
                                  </>
                                );
                              })()}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, color: '#2D5A0E', fontWeight: 600 }}>✅ Done</span>
                              <button
                                onClick={() => setViewPhoto(t)}
                                style={{ fontSize: 10, padding: '3px 8px', background: (t as any).photo_path ? 'rgba(151,196,89,0.15)' : 'rgba(0,0,0,0.05)', border: `1px solid ${(t as any).photo_path ? '#97C459' : 'rgba(0,0,0,0.1)'}`, borderRadius: 5, cursor: 'pointer', color: (t as any).photo_path ? '#2D5A0E' : 'var(--muted-fg)', fontWeight: 600 }}>
                                {(t as any).photo_path ? '📷 View photo' : '📋 Details'}
                              </button>
                            </div>
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
