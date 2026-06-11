'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchTrainings, fetchProfiles, getSupabase, type Training, type Profile } from '@/lib/supabase';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';

// ─── Schedule Training Modal ──────────────────────────────────
function ScheduleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '',
    training_date: '',
    type: 'Functional',
    total_seats: '10',
    status: 'planned',
    has_quiz: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const { error: err } = await getSupabase().from('trainings').insert({
        name: form.name,
        training_date: form.training_date || null,
        type: form.type,
        total_seats: parseInt(form.total_seats) || 10,
        status: form.status,
        has_quiz: form.has_quiz,
      });
      if (err) throw new Error(err.message);
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 900);
    } catch (err: any) { setError(err.message); setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Schedule training</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>Add a real training session</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 20 }} />
        {saved ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Training scheduled!</div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {error && <div style={{ background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Training name *</div>
                <input className="sv-input" style={{ width: '100%' }} placeholder="e.g. F&B Service Standards" value={form.name} onChange={f('name')} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Date</div>
                  <input className="sv-input" style={{ width: '100%' }} type="date" value={form.training_date} onChange={f('training_date')} />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Seats</div>
                  <input className="sv-input" style={{ width: '100%' }} type="number" min="1" value={form.total_seats} onChange={f('total_seats')} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Type</div>
                  <select className="sv-select" style={{ width: '100%' }} value={form.type} onChange={f('type')}>
                    <option value="Functional">Functional</option>
                    <option value="Mandatory">Mandatory</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Status</div>
                  <select className="sv-select" style={{ width: '100%' }} value={form.status} onChange={f('status')}>
                    <option value="planned">Planned</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: form.has_quiz ? 'rgba(156,204,252,0.08)' : 'var(--muted)', borderRadius: 10, border: `1.5px solid ${form.has_quiz ? '#9CCCFC' : 'transparent'}`, cursor: 'pointer' }}
                onClick={() => setForm(p => ({ ...p, has_quiz: !p.has_quiz }))}>
                <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${form.has_quiz ? '#9CCCFC' : '#ccc'}`, background: form.has_quiz ? '#9CCCFC' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#0C447C', flexShrink: 0 }}>
                  {form.has_quiz ? '✓' : ''}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Attach a quiz</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>Butler scores will be tracked against this training.</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" className="sv-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="sv-btn sv-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Schedule training'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Attendance Modal ─────────────────────────────────────────
function AttendanceModal({ training, profiles, onClose, onSaved }: { training: Training; profiles: Profile[]; onClose: () => void; onSaved: () => void }) {
  const [attended, setAttended] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSupabase().from('training_attendance').select('butler_id, attended').eq('training_id', training.id).then((res: any) => {
      if (res.data) setAttended(new Set(res.data.filter((r: any) => r.attended).map((r: any) => r.butler_id)));
    });
  }, [training.id]);

  const toggle = (id: string) => setAttended(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const butlers = profiles.filter(p => p.role === 'butler');

  async function handleSave() {
    setSaving(true);
    const sb = getSupabase();
    for (const p of butlers) {
      await sb.from('training_attendance').upsert(
        { training_id: training.id, butler_id: p.id, attended: attended.has(p.id) },
        { onConflict: 'training_id,butler_id' }
      );
    }
    if (attended.size > 0) {
      await sb.from('trainings').update({ status: 'completed' }).eq('id', training.id);
    }
    setSaved(true);
    setTimeout(() => { onSaved(); onClose(); }, 700);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Mark attendance</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>{training.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 18 }} />
        {saved ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Attendance saved!</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>{attended.size}/{butlers.length} attended</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--muted-fg)' }}>{attended.size} selected</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="sv-btn" style={{ fontSize: 11 }} onClick={() => setAttended(new Set(butlers.map(p => p.id)))}>All present</button>
                <button className="sv-btn" style={{ fontSize: 11 }} onClick={() => setAttended(new Set())}>Clear</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {butlers.map(p => (
                <div key={p.id} onClick={() => toggle(p.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${attended.has(p.id) ? '#97C459' : 'rgba(0,0,0,0.1)'}`, background: attended.has(p.id) ? 'rgba(151,196,89,0.08)' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div className="sv-avatar">{p.name.slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{p.squad ?? '—'}</div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${attended.has(p.id) ? '#97C459' : '#ddd'}`, background: attended.has(p.id) ? '#97C459' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', flexShrink: 0 }}>
                    {attended.has(p.id) ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="sv-btn" onClick={onClose}>Cancel</button>
              <button className="sv-btn sv-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save attendance'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function TrainingPage() {
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [attendanceTraining, setAttendanceTraining] = useState<Training | null>(null);

  const isSuper = user && isSupervisor(user.role as any);

  async function load() {
    const [t, p] = await Promise.all([fetchTrainings(), fetchProfiles()]);
    setTrainings(t);
    setProfiles(p);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const completed = trainings.filter(t => t.status === 'completed').length;

  return (
    <>
      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onSaved={load} />}
      {attendanceTraining && (
        <AttendanceModal
          training={attendanceTraining}
          profiles={profiles}
          onClose={() => setAttendanceTraining(null)}
          onSaved={load}
        />
      )}

      <Topbar
        title="Functional training"
        subtitle="Training sessions and completion tracking"
        actions={
          isSuper ? (
            <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowSchedule(true)}>
              + Schedule training
            </button>
          ) : undefined
        }
      />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Metrics — all live from Supabase */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total sessions', value: trainings.length, cls: 'blue' },
            { label: 'Completed', value: completed, cls: 'green' },
            { label: 'Upcoming', value: trainings.filter(t => t.status === 'upcoming').length, cls: 'peach' },
            { label: 'Planned', value: trainings.filter(t => t.status === 'planned').length, cls: 'coral' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        {/* Training schedule — 100% Supabase, zero hardcoded data */}
        <div className="sv-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Training schedule</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginBottom: 14 }}>Live from database · No sample data</div>

          {loading ? (
            <div style={{ color: 'var(--muted-fg)', fontSize: 13, padding: '16px 0' }}>Loading…</div>
          ) : trainings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📚</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No trainings yet</div>
              <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 16 }}>
                Once a training is scheduled and saved, it appears here.
              </div>
              {isSuper && (
                <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowSchedule(true)}>
                  + Schedule first training
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead>
                  <tr>
                    <th>Training</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Seats</th>
                    <th>Status</th>
                    <th>Quiz</th>
                    {isSuper && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {trainings.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.name}</td>
                      <td style={{ color: 'var(--muted-fg)' }}>
                        {t.training_date
                          ? new Date(t.training_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td>
                        <span className={t.type === 'Mandatory' ? 'badge badge-amber' : 'badge badge-coral'}>
                          {t.type}
                        </span>
                      </td>
                      <td style={{ color: 'var(--muted-fg)' }}>{t.total_seats}</td>
                      <td><span className={getStatusBadge(t.status)}>{getStatusLabel(t.status)}</span></td>
                      <td>
                        {t.has_quiz
                          ? <span className="badge badge-blue">Yes</span>
                          : <span style={{ color: 'var(--muted-fg)' }}>—</span>}
                      </td>
                      {isSuper && (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="sv-btn"
                              style={{ fontSize: 11, padding: '4px 10px' }}
                              onClick={() => setAttendanceTraining(t)}
                            >
                              Mark attendance
                            </button>
                            <button
                              className="sv-btn"
                              style={{ fontSize: 11, padding: '4px 10px', color: '#8B2020', borderColor: '#E9A0A7' }}
                              onClick={async () => {
                                if (confirm('Delete this training?')) {
                                  await getSupabase().from('trainings').delete().eq('id', t.id);
                                  load();
                                }
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Butler list — live from Supabase */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Butler roster</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginBottom: 14 }}>All active butlers in the system</div>
          {loading ? (
            <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div>
          ) : profiles.length === 0 ? (
            <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No butlers in the system yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {profiles.map(p => (
                <div key={p.id} style={{ background: 'var(--muted)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="sv-avatar">{p.name.slice(0,2).toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{p.squad ?? '—'} · {p.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
