'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchProfiles, getSupabase, getServiceSupabase, type Profile } from '@/lib/supabase';
import { getCurrentUser, isAdmin, getRoleLabel, type AppUser } from '@/lib/auth';

// ── Butler History Report ─────────────────────────────────────────────────────
function ButlerHistoryReport({ profiles }: { profiles: Profile[] }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)

  const butlers = profiles.filter(p => p.role === 'butler' && p.is_active)

  async function loadReport() {
    setLoading(true)
    const sb = getServiceSupabase()
    const [delights, tasks, quizAttempts, huddleAtt, trainingAtt] = await Promise.all([
      sb.from('guest_delights').select('id, your_name, status, booking_date, villa_name, booking_type, booking_id, delight_photos(id, public_url, pointer_key)'),
      sb.from('tasks').select('id, butler_id, status, type, created_at'),
      sb.from('quiz_attempts').select('butler_id, score, total, passed, attempted_at'),
      sb.from('huddle_attendance').select('butler_id, attended'),
      sb.from('training_attendance').select('butler_id, attended'),
    ])

    const rows = butlers.map(b => {
      const myDelights = (delights.data || []).filter((d: any) => d.your_name === b.name)
      const myTasks = (tasks.data || []).filter((t: any) => t.butler_id === b.id)
      const myQuizzes = (quizAttempts.data || []).filter((q: any) => q.butler_id === b.id)
      const myHuddles = (huddleAtt.data || []).filter((h: any) => h.butler_id === b.id)
      const myTrainings = (trainingAtt.data || []).filter((t: any) => t.butler_id === b.id)

      const totalPhotos = myDelights.reduce((acc: number, d: any) => acc + (d.delight_photos?.length || 0), 0)
      const avgQuiz = myQuizzes.length > 0
        ? Math.round(myQuizzes.reduce((acc: number, q: any) => acc + (q.total > 0 ? q.score / q.total * 100 : 0), 0) / myQuizzes.length)
        : null

      return {
        ...b,
        totalDelights: myDelights.length,
        completedDelights: myDelights.filter((d: any) => d.status === 'completed').length,
        totalPhotos,
        totalTasks: myTasks.length,
        completedTasks: myTasks.filter((t: any) => t.status === 'completed').length,
        quizAttempts: myQuizzes.length,
        avgQuizScore: avgQuiz,
        quizPassed: myQuizzes.filter((q: any) => q.passed).length,
        huddlesAttended: myHuddles.filter((h: any) => h.attended).length,
        totalHuddles: myHuddles.length,
        trainingsAttended: myTrainings.filter((t: any) => t.attended).length,
        delightHistory: myDelights,
      }
    })

    setData(rows)
    setLoading(false)
    setLoaded(true)
  }

  function downloadCSV() {
    const headers = ['Name', 'Squad', 'Total Delights', 'Completed Delights', 'Photos Uploaded', 'Total Tasks', 'Completed Tasks', 'Quiz Attempts', 'Avg Quiz Score', 'Quizzes Passed', 'Huddles Attended', 'Trainings Attended']
    const rows = data.map(b => [
      b.name, b.squad ?? '', b.totalDelights, b.completedDelights, b.totalPhotos,
      b.totalTasks, b.completedTasks, b.quizAttempts,
      b.avgQuizScore !== null ? b.avgQuizScore + '%' : 'N/A',
      b.quizPassed, b.huddlesAttended, b.trainingsAttended
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `butler_history_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="sv-card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Butler history report</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>Full activity breakdown — delights, photos, tasks, quizzes, attendance</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {loaded && <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={downloadCSV}>⬇ Download CSV</button>}
          <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={loadReport} disabled={loading}>
            {loading ? 'Loading…' : loaded ? '↻ Refresh' : 'Generate report'}
          </button>
        </div>
      </div>
      <div className="sv-strip" />

      {!loaded && !loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted-fg)', fontSize: 13 }}>
          Click "Generate report" to load full butler history from Supabase.
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted-fg)' }}>Loading data…</div>}

      {loaded && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="sv-table">
              <thead>
                <tr>
                  <th>Butler</th><th>Squad</th>
                  <th>Delights</th><th>Photos uploaded</th>
                  <th>Tasks done</th><th>Avg quiz</th>
                  <th>Huddles</th><th>Trainings</th><th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="sv-avatar">{(b.name || '??').slice(0,2).toUpperCase()}</div>
                        <span style={{ fontWeight: 500 }}>{b.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted-fg)' }}>{b.squad ?? '—'}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{b.completedDelights}</span>
                      <span style={{ color: 'var(--muted-fg)', fontSize: 11 }}>/{b.totalDelights}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: b.totalPhotos > 0 ? '#2D5A0E' : 'var(--muted-fg)' }}>
                        📷 {b.totalPhotos}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{b.completedTasks}</span>
                      <span style={{ color: 'var(--muted-fg)', fontSize: 11 }}>/{b.totalTasks}</span>
                    </td>
                    <td>
                      {b.avgQuizScore !== null
                        ? <span style={{ fontWeight: 600, color: b.avgQuizScore >= 70 ? '#2D5A0E' : '#8B2020' }}>{b.avgQuizScore}%</span>
                        : <span style={{ color: 'var(--muted-fg)', fontSize: 11 }}>No attempts</span>}
                    </td>
                    <td style={{ color: 'var(--muted-fg)' }}>{b.huddlesAttended}/{b.totalHuddles}</td>
                    <td style={{ color: 'var(--muted-fg)' }}>{b.trainingsAttended}</td>
                    <td>
                      <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }}
                        onClick={() => setSelected(selected?.id === b.id ? null : b)}>
                        {selected?.id === b.id ? 'Hide' : 'View history'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded delight history for selected butler */}
          {selected && (
            <div style={{ marginTop: 16, background: 'var(--muted)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                {selected.name} — delight history ({selected.delightHistory.length} entries)
              </div>
              {selected.delightHistory.length === 0 ? (
                <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No delight entries yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="sv-table" style={{ background: '#fff' }}>
                    <thead><tr><th>Date</th><th>Villa</th><th>Booking ID</th><th>Type</th><th>Photos</th><th>Status</th></tr></thead>
                    <tbody>
                      {selected.delightHistory.map((d: any) => (
                        <tr key={d.id}>
                          <td style={{ color: 'var(--muted-fg)' }}>
                            {d.booking_date ? new Date(d.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td style={{ fontWeight: 500 }}>{d.villa_name}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.booking_id ?? '—'}</td>
                          <td><span className="badge badge-blue">{d.booking_type}</span></td>
                          <td>
                            <span style={{ fontWeight: 600, color: (d.delight_photos?.length || 0) > 0 ? '#2D5A0E' : 'var(--muted-fg)' }}>
                              📷 {d.delight_photos?.length || 0}/7
                            </span>
                            {(d.delight_photos || []).map((p: any) => p.public_url && (
                              <a key={p.id} href={p.public_url} target="_blank" rel="noreferrer"
                                style={{ marginLeft: 6, fontSize: 10, color: '#0C447C', textDecoration: 'underline' }}>
                                {p.pointer_key}
                              </a>
                            ))}
                          </td>
                          <td>
                            <span className={d.status === 'completed' ? 'badge badge-green' : d.status === 'overdue' ? 'badge badge-red' : 'badge badge-amber'}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function ManagementPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'butler', squad: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [p, u] = await Promise.all([fetchProfiles(), getCurrentUser()]);
    setProfiles(p); setCurrentUser(u); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const { error: err } = await getServiceSupabase().from('profiles').insert({
      id: crypto.randomUUID(),
      name: form.name,
      email: form.email,
      role: form.role,
      squad: form.squad || null,
      is_active: true,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaved(true);
    setTimeout(() => { setSaved(false); setShowModal(false); setForm({ name: '', email: '', role: 'butler', squad: '' }); load(); }, 800);
  }

  async function toggleActive(id: string, current: boolean) {
    await getServiceSupabase().from('profiles').update({ is_active: !current }).eq('id', id);
    load();
  }

  if (currentUser && !isAdmin(currentUser.role)) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>Access restricted — Admin only.</div>;
  }

  const roleGroups = [
    { role: 'super_admin', label: 'Admins', color: 'badge-coral' },
    { role: 'ops_manager', label: 'Supervisors', color: 'badge-amber' },
    { role: 'butler', label: 'Butlers', color: 'badge-blue' },
    { role: 'trainer', label: 'Trainers', color: 'badge-green' },
  ];

  return (
    <>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Add team member</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
            </div>
            <div className="sv-strip" style={{ marginBottom: 20 }} />
            {saved ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Member added!</div>
              </div>
            ) : (
              <form onSubmit={handleAdd}>
                {error && <div style={{ background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}
                <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                  {[
                    ['name', 'Full name *', 'text', 'e.g. Ravi Kumar', true],
                    ['email', 'Email *', 'email', 'e.g. ravi@stayvista.com', true],
                    ['squad', 'Squad', 'text', 'e.g. Lonavala', false],
                  ].map(([key, label, type, ph, req]: any) => (
                    <div key={key}>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>{label}</div>
                      <input className="sv-input" style={{ width: '100%' }} type={type} placeholder={ph} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={req} />
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Role *</div>
                    <select className="sv-select" style={{ width: '100%' }} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required>
                      <option value="butler">Butler</option>
                      <option value="ops_manager">Supervisor</option>
                      <option value="trainer">Trainer</option>
                      <option value="super_admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div style={{ background: 'rgba(254,213,169,0.15)', border: '0.5px solid rgba(254,213,169,0.4)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#7A4A08', marginBottom: 16 }}>
                  ⚠ This adds a profile record. To give them login access, also create their account in <strong>Supabase → Auth → Add user</strong> with the same email.
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="sv-btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="sv-btn sv-btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add member'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Topbar title="User management" subtitle="Manage team members and roles"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowModal(true)}>+ Add member</button>} />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 24 }}>
          {roleGroups.map(g => (
            <div key={g.role} className="metric-card blue">
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{g.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : profiles.filter(p => p.role === g.role).length}</div>
            </div>
          ))}
        </div>

        {roleGroups.map(g => {
          const group = profiles.filter(p => p.role === g.role);
          if (group.length === 0) return null;
          return (
            <div key={g.role} className="sv-card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                {g.label}
                <span className={`badge ${g.color}`}>{group.length}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="sv-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Squad</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {group.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="sv-avatar">{(p.name || '??').slice(0,2).toUpperCase()}</div>
                            <span style={{ fontWeight: 500 }}>{p.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--muted-fg)', fontSize: 12 }}>{p.email}</td>
                        <td style={{ color: 'var(--muted-fg)' }}>{p.squad ?? '—'}</td>
                        <td><span className={p.is_active ? 'badge badge-green' : 'badge badge-gray'}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>
                          <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => toggleActive(p.id, p.is_active)}>
                            {p.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {!loading && profiles.length === 0 && (
          <div className="sv-card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No team members yet</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 16 }}>Add butlers, supervisors and trainers to get started.</div>
            <button className="sv-btn sv-btn-primary" onClick={() => setShowModal(true)}>+ Add first member</button>
          </div>
        )}

        {/* ── Butler History Report ── */}
        <ButlerHistoryReport profiles={profiles} />
      </div>
    </>
  );
}
