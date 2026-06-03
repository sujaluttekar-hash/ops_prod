'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchProfiles, getSupabase, type Profile } from '@/lib/supabase';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

const TASK_TYPES = ['Arrival selfie','Guest welcome','Table layout','Exit selfie'];
const TASK_EMOJI: Record<string,string> = { 'Arrival selfie':'🤳','Guest welcome':'🙏','Table layout':'🍽','Exit selfie':'👋' };

type AllocEntry = {
  butler: Profile;
  tasks: any[];
  delights: any[];
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  delightCount: number;
};

function AssignModal({ butlers, onClose, onSaved }: { butlers: Profile[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ butler_id: '', task_type: '', property: '', due_time: '', notes: '' });
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSupabase().from('properties').select('id, name').order('name').then(({ data }) => setProperties(data ?? []));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const { error: err } = await getSupabase().from('tasks').insert({
      type: form.task_type,
      butler_id: form.butler_id || null,
      due_time: form.due_time || null,
      notes: form.notes || null,
      status: 'pending',
      property_id: properties.find(p => p.name === form.property)?.id ?? null,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaved(true);
    setTimeout(() => { onSaved(); onClose(); }, 700);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Assign task to butler</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 20 }} />
        {saved ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}><div style={{ fontSize: 40, marginBottom: 8 }}>✅</div><div style={{ fontSize: 15, fontWeight: 700 }}>Task assigned!</div></div>
        ) : (
          <form onSubmit={handleSave}>
            {error && <div style={{ background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}
            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Butler *</div>
                <select className="sv-select" style={{ width: '100%' }} value={form.butler_id} onChange={e => setForm(f => ({ ...f, butler_id: e.target.value }))} required>
                  <option value="">Select butler</option>
                  {butlers.map(b => <option key={b.id} value={b.id}>{b.name} — {b.squad ?? '—'}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Task type *</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {TASK_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, task_type: t }))}
                      style={{ padding: '8px', borderRadius: 8, border: `1.5px solid ${form.task_type === t ? '#9CCCFC' : 'rgba(0,0,0,0.12)'}`, background: form.task_type === t ? 'rgba(156,204,252,0.1)' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      {TASK_EMOJI[t]} {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Property *</div>
                {properties.length > 0 ? (
                  <select className="sv-select" style={{ width: '100%' }} value={form.property} onChange={e => setForm(f => ({ ...f, property: e.target.value }))} required>
                    <option value="">Select property</option>
                    {properties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                ) : (
                  <input className="sv-input" style={{ width: '100%' }} placeholder="Villa name" value={form.property} onChange={e => setForm(f => ({ ...f, property: e.target.value }))} required />
                )}
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Due time</div>
                <input className="sv-input" style={{ width: '100%' }} type="time" value={form.due_time} onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Notes</div>
                <textarea className="sv-input" style={{ width: '100%', minHeight: 60, resize: 'vertical' }} placeholder="Any instructions…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="sv-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="sv-btn sv-btn-primary" disabled={saving || !form.butler_id || !form.task_type || !form.property}>{saving ? 'Assigning…' : 'Assign task'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AllocationPage() {
  const [data, setData] = useState<AllocEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAssign, setShowAssign] = useState(false);
  const [filterSquad, setFilterSquad] = useState('All');
  const [expandedButler, setExpandedButler] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const sb = getSupabase();
    const [profiles, tasks, delights] = await Promise.all([
      fetchProfiles(),
      sb.from('tasks').select('*, properties(name)').gte('created_at', date + 'T00:00:00').lte('created_at', date + 'T23:59:59'),
      sb.from('guest_delights').select('*').eq('booking_date', date),
    ]);

    const butlers = (profiles ?? []).filter(p => p.role === 'butler');
    const taskData = tasks.data ?? [];
    const delightData = delights.data ?? [];

    const entries: AllocEntry[] = butlers.map(butler => {
      const myTasks = taskData.filter(t => t.butler_id === butler.id);
      const myDelights = delightData.filter(d => d.your_name === butler.name);
      return {
        butler,
        tasks: myTasks,
        delights: myDelights,
        totalTasks: myTasks.length,
        completedTasks: myTasks.filter(t => t.status === 'completed').length,
        pendingTasks: myTasks.filter(t => t.status === 'pending').length,
        delightCount: myDelights.length,
      };
    });

    setData(entries);
    setLoading(false);
  }

  useEffect(() => { load(); }, [date]);

  const squads = [...new Set(data.map(d => d.butler.squad).filter(Boolean))];
  const filtered = data.filter(d => filterSquad === 'All' || d.butler.squad === filterSquad);
  const totalTasks = data.reduce((a, b) => a + b.totalTasks, 0);
  const totalDone = data.reduce((a, b) => a + b.completedTasks, 0);
  const activeButlers = data.filter(d => d.totalTasks > 0).length;

  return (
    <>
      {showAssign && <AssignModal butlers={data.map(d => d.butler)} onClose={() => setShowAssign(false)} onSaved={load} />}

      <Topbar title="Daily allocation"
        subtitle="What each butler is doing today"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" className="sv-select" value={date} onChange={e => setDate(e.target.value)} />
            <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowAssign(true)}>+ Assign task</button>
          </div>
        }
      />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Summary metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total butlers', value: data.length, cls: 'blue' },
            { label: 'Active today', value: activeButlers, cls: 'green' },
            { label: 'Tasks assigned', value: totalTasks, cls: 'peach' },
            { label: 'Tasks done', value: totalDone, cls: 'coral' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        {/* Filter + squad selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Filter by squad:</span>
          {['All', ...squads].map(s => (
            <button key={s as string} onClick={() => setFilterSquad(s as string)} className="sv-btn"
              style={{ fontSize: 11, padding: '5px 12px', background: filterSquad === s ? '#1B1D1F' : undefined, color: filterSquad === s ? '#fff' : undefined }}>
              {s}
            </button>
          ))}
          <button className="sv-btn" style={{ fontSize: 11, marginLeft: 'auto' }} onClick={load}>↻ Refresh</button>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading allocation data…</div>
        ) : filtered.length === 0 ? (
          <div className="sv-card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No butlers found</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 20 }}>Add butlers via User Management, then assign tasks here.</div>
            <button className="sv-btn sv-btn-primary" onClick={() => setShowAssign(true)}>+ Assign first task</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(entry => {
              const pct = entry.totalTasks > 0 ? Math.round(entry.completedTasks / entry.totalTasks * 100) : 0;
              const isExpanded = expandedButler === entry.butler.id;
              const ringColor = pct >= 80 ? '#97C459' : pct >= 50 ? '#9CCCFC' : pct > 0 ? '#FED5A9' : 'rgba(0,0,0,0.1)';

              return (
                <div key={entry.butler.id} className="sv-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Butler row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', cursor: 'pointer' }}
                    onClick={() => setExpandedButler(isExpanded ? null : entry.butler.id)}>

                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 200, flexShrink: 0 }}>
                      <div className="sv-avatar" style={{ width: 38, height: 38, fontSize: 13 }}>{entry.butler.name.slice(0,2).toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{entry.butler.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{entry.butler.squad ?? '—'}</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>
                          {entry.totalTasks === 0 ? 'No tasks assigned' : `${entry.completedTasks}/${entry.totalTasks} tasks`}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ringColor !== 'rgba(0,0,0,0.1)' ? ringColor : 'var(--muted-fg)' }}>{entry.totalTasks > 0 ? `${pct}%` : '—'}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: ringColor, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>

                    {/* Task type pills */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 280, justifyContent: 'flex-end' }}>
                      {entry.tasks.slice(0, 4).map((t, i) => (
                        <span key={i} title={`${t.type} — ${(t.properties as any)?.name ?? '—'}`}
                          style={{ fontSize: 18, opacity: t.status === 'completed' ? 1 : 0.35 }}>
                          {TASK_EMOJI[t.type] ?? '•'}
                        </span>
                      ))}
                      {entry.tasks.length > 4 && <span style={{ fontSize: 11, color: 'var(--muted-fg)', alignSelf: 'center' }}>+{entry.tasks.length - 4}</span>}
                      {entry.delightCount > 0 && <span style={{ fontSize: 11, background: 'rgba(233,160,167,0.2)', color: '#7A2D42', padding: '2px 6px', borderRadius: 4, fontWeight: 600, alignSelf: 'center' }}>♡ {entry.delightCount}</span>}
                    </div>

                    {/* Status badges */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                      {entry.pendingTasks > 0 && <span className="badge badge-amber">{entry.pendingTasks} pending</span>}
                      {entry.totalTasks === 0 && <span className="badge badge-gray">Unassigned</span>}
                      <span style={{ fontSize: 14, color: 'var(--muted-fg)', marginLeft: 4 }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded task list */}
                  {isExpanded && (
                    <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)', padding: '0 20px 16px' }}>
                      {entry.tasks.length === 0 && entry.delights.length === 0 ? (
                        <div style={{ padding: '16px 0', color: 'var(--muted-fg)', fontSize: 13 }}>
                          No tasks or delight entries for this date.
                          <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, marginLeft: 12 }} onClick={e => { e.stopPropagation(); setShowAssign(true); }}>Assign task</button>
                        </div>
                      ) : (
                        <>
                          {entry.tasks.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Tasks</div>
                              {entry.tasks.map(t => (
                                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                                  <span style={{ fontSize: 20, flexShrink: 0 }}>{TASK_EMOJI[t.type] ?? '•'}</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.type}</div>
                                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>
                                      {(t.properties as any)?.name ?? '—'}
                                      {t.due_time && ` · Due ${t.due_time}`}
                                      {t.notes && ` · ${t.notes}`}
                                    </div>
                                  </div>
                                  <span className={getStatusBadge(t.status)}>{getStatusLabel(t.status)}</span>
                                  {/* Quick complete button */}
                                  {t.status !== 'completed' && (
                                    <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }}
                                      onClick={async e => {
                                        e.stopPropagation();
                                        await getSupabase().from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', t.id);
                                        load();
                                      }}>
                                      ✓ Mark done
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {entry.delights.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Guest delights</div>
                              {entry.delights.map((d: any) => (
                                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                                  <span style={{ fontSize: 20 }}>♡</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{d.villa_name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{d.booking_type} · {d.booking_id ?? '—'}</div>
                                  </div>
                                  <span className={getStatusBadge(d.status)}>{getStatusLabel(d.status)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
