'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchHuddles, fetchProfiles, getSupabase, type Huddle, type Profile } from '@/lib/supabase';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

function ScheduleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ team: '', huddle_date: '', time: '', participants_expected: '', notes: '', status: 'scheduled' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const { error: err } = await getSupabase().from('huddles').insert({
      team: form.team,
      huddle_date: form.huddle_date,
      time: form.time || null,
      participants_expected: parseInt(form.participants_expected) || 0,
      notes: form.notes || null,
      status: form.status,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaved(true);
    setTimeout(() => { onSaved(); onClose(); }, 700);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Schedule huddle</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 20 }} />

        {saved ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Huddle scheduled!</div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {error && <div style={{ background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}
            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Team / huddle name *</div>
                <input className="sv-input" style={{ width: '100%' }} placeholder="e.g. Lonavala team huddle" value={form.team} onChange={f('team')} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Date *</div>
                  <input className="sv-input" style={{ width: '100%' }} type="date" value={form.huddle_date} onChange={f('huddle_date')} required />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Time</div>
                  <input className="sv-input" style={{ width: '100%' }} type="time" value={form.time} onChange={f('time')} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Participants expected</div>
                  <input className="sv-input" style={{ width: '100%' }} type="number" min="1" placeholder="e.g. 12" value={form.participants_expected} onChange={f('participants_expected')} />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Status</div>
                  <select className="sv-select" style={{ width: '100%' }} value={form.status} onChange={f('status')}>
                    <option value="scheduled">Scheduled</option>
                    <option value="tbc">TBC</option>
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Notes / agenda</div>
                <textarea className="sv-input" style={{ width: '100%', minHeight: 72, resize: 'vertical' }} placeholder="What will be covered in this huddle?" value={form.notes} onChange={f('notes')} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="sv-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="sv-btn sv-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Schedule huddle'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AttendanceModal({ huddle, profiles, onClose, onSaved }: { huddle: Huddle; profiles: Profile[]; onClose: () => void; onSaved: () => void }) {
  const [attended, setAttended] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    const sb = getSupabase();
    for (const p of profiles) {
      await sb.from('huddle_attendance').upsert({
        huddle_id: huddle.id,
        butler_id: p.id,
        attended: attended.has(p.id),
      }, { onConflict: 'huddle_id,butler_id' });
    }
    await sb.from('huddles').update({ status: 'completed' }).eq('id', huddle.id);
    setSaved(true);
    setTimeout(() => { onSaved(); onClose(); }, 700);
  }

  const toggle = (id: string) => setAttended(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Mark attendance</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>{huddle.team}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 20 }} />

        {saved ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Attendance saved!</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>{attended.size} of {profiles.length} attended</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--muted-fg)' }}>{attended.size} selected</div>
              <button className="sv-btn" style={{ fontSize: 11 }} onClick={() => setAttended(new Set(profiles.map(p => p.id)))}>Select all</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {profiles.filter(p => p.role === 'butler').map(p => (
                <div key={p.id}
                  onClick={() => toggle(p.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${attended.has(p.id) ? '#97C459' : 'rgba(0,0,0,0.1)'}`, background: attended.has(p.id) ? 'rgba(151,196,89,0.08)' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div className="sv-avatar">{p.name.slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{p.squad ?? '—'}</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${attended.has(p.id) ? '#97C459' : '#ccc'}`, background: attended.has(p.id) ? '#97C459' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', flexShrink: 0 }}>
                    {attended.has(p.id) ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="sv-btn" onClick={onClose}>Cancel</button>
              <button className="sv-btn sv-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save & complete huddle'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function HuddlePage() {
  const [huddles, setHuddles] = useState<Huddle[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [attendanceHuddle, setAttendanceHuddle] = useState<Huddle | null>(null);

  async function load() {
    const [h, p] = await Promise.all([fetchHuddles(), fetchProfiles()]);
    setHuddles(h); setProfiles(p); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const upcoming = huddles.filter(h => h.status === 'scheduled' || h.status === 'tbc');
  const completed = huddles.filter(h => h.status === 'completed');

  return (
    <>
      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onSaved={load} />}
      {attendanceHuddle && <AttendanceModal huddle={attendanceHuddle} profiles={profiles} onClose={() => setAttendanceHuddle(null)} onSaved={load} />}

      <Topbar title="Butler huddles" subtitle="Fortnightly team meetings"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowSchedule(true)}>+ Schedule huddle</button>} />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total huddles', value: huddles.length, cls: 'blue' },
            { label: 'Upcoming', value: upcoming.length, cls: 'green' },
            { label: 'Completed', value: completed.length, cls: 'peach' },
            { label: 'Butlers', value: profiles.filter(p => p.role === 'butler').length, cls: 'coral' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          {/* Upcoming huddles */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Upcoming huddles</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              upcoming.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>◎</div>
                  <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 12 }}>No upcoming huddles scheduled.</div>
                  <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowSchedule(true)}>+ Schedule first huddle</button>
                </div>
              ) : upcoming.map(h => {
                const d = new Date(h.huddle_date);
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 14, background: 'var(--muted)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                    <div className="huddle-date">
                      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase' }}>{d.toLocaleString('default', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{h.team}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>
                        {h.time ? h.time.slice(0, 5) : '—'} · {h.participants_expected} expected
                      </div>
                      {h.notes && <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3, fontStyle: 'italic' }}>{h.notes}</div>}
                      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span>
                        <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '3px 10px' }}
                          onClick={() => setAttendanceHuddle(h)}>
                          Mark attendance
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Butler list */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Butler roster ({profiles.filter(p => p.role === 'butler').length})</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              profiles.filter(p => p.role === 'butler').length === 0
                ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No butlers in system yet.</div>
                : profiles.filter(p => p.role === 'butler').map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                    <div className="sv-avatar">{p.name.slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{p.squad ?? '—'}</div>
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* History */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Huddle history</div>
          {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
            huddles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted-fg)', fontSize: 13 }}>
                No huddles yet. Schedule your first huddle above.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="sv-table">
                  <thead>
                    <tr><th>Huddle</th><th>Date</th><th>Time</th><th>Expected</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {huddles.map(h => (
                      <tr key={h.id}>
                        <td style={{ fontWeight: 500 }}>{h.team}</td>
                        <td style={{ color: 'var(--muted-fg)' }}>{new Date(h.huddle_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td style={{ color: 'var(--muted-fg)' }}>{h.time ? h.time.slice(0, 5) : '—'}</td>
                        <td>{h.participants_expected}</td>
                        <td><span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {h.status !== 'completed' && (
                              <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }}
                                onClick={() => setAttendanceHuddle(h)}>
                                Attendance
                              </button>
                            )}
                            <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px', color: '#8B2020', borderColor: '#E9A0A7' }}
                              onClick={async () => {
                                if (confirm('Delete this huddle?')) {
                                  await getSupabase().from('huddles').delete().eq('id', h.id);
                                  load();
                                }
                              }}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>
    </>
  );
}
