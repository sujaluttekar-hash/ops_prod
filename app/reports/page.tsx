'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchDashboardStats, fetchProfiles, fetchTrainings, fetchGuestDelights, fetchHuddles, getSupabase, getServiceSupabase, type Profile, type Training } from '@/lib/supabase';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({ delights: [], tasks: [], upcomingHuddles: [] });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [delights, setDelights] = useState<any[]>([]);
  const [huddles, setHuddles] = useState<any[]>([]);
  const [butlerStats, setButlerStats] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetchDashboardStats(),
      fetchProfiles(),
      fetchTrainings(),
      fetchGuestDelights(),
      fetchHuddles(),
      getServiceSupabase().from('quiz_attempts').select('butler_id, score, total, passed'),
      getServiceSupabase().from('huddle_attendance').select('butler_id, attended'),
    ]).then(([s, p, t, d, h, qa, ha]) => {
      setStats(s);
      setProfiles(p);
      setTrainings(t);
      setDelights(d);
      setHuddles(h);

      // Build per-butler stats
      const quizAttempts = qa.data || [];
      const huddleAtt = ha.data || [];

      const perButler = p.map(butler => {
        const myDelights = d.filter((x: any) => x.your_name === butler.name);
        const delightsDone = myDelights.filter((x: any) => x.status === 'completed').length;
        const myQuizzes = quizAttempts.filter((q: any) => q.butler_id === butler.id);
        const avgQuiz = myQuizzes.length > 0 ? Math.round(myQuizzes.reduce((acc: number, q: any) => acc + (q.total > 0 ? q.score/q.total*100 : (q.score||0)), 0) / myQuizzes.length) : null;
        const myHuddles = huddleAtt.filter((x: any) => x.butler_id === butler.id);
        const huddlesAttended = myHuddles.filter((x: any) => x.attended).length;
        return {
          ...butler,
          delightsDone,
          totalDelights: myDelights.length,
          avgQuizScore: avgQuiz,
          huddlesAttended,
          totalHuddles: myHuddles.length,
        };
      });
      setButlerStats(perButler);
      setLoading(false);
    });
  }, []);

  const delightDone = stats.delights.filter((d: any) => d.status === 'completed').length;
  const taskDone = stats.tasks.filter((t: any) => t.status === 'completed').length;
  const completionPct = stats.delights.length > 0 ? Math.round(delightDone / stats.delights.length * 100) : 0;

  return (
    <>
      <Topbar title="MIS & Reports" subtitle="Live performance dashboard"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>⬇ Export</button>} />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Top metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total butlers', value: profiles.length, cls: 'blue' },
            { label: 'Tasks done', value: taskDone, cls: 'green' },
            { label: 'Delights done', value: `${delightDone}/${stats.delights.length}`, cls: 'peach' },
            { label: 'Delight completion', value: `${completionPct}%`, cls: 'coral' },
            { label: 'Trainings', value: trainings.length, cls: 'blue' },
            { label: 'Upcoming huddles', value: stats.upcomingHuddles.length, cls: 'green' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        {/* Butler performance table — the MIS view */}
        <div className="sv-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Butler MIS — performance overview</div>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginBottom: 14 }}>Delights · Quiz scores · Huddle attendance</div>
          {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
            butlerStats.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No butlers in system yet.</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead>
                  <tr>
                    <th>Butler</th>
                    <th>Squad</th>
                    <th>Delights done</th>
                    <th>Delight %</th>
                    <th>Avg quiz score</th>
                    <th>Huddle attendance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {butlerStats.map(b => {
                    const delPct = b.totalDelights > 0 ? Math.round(b.delightsDone / b.totalDelights * 100) : null;
                    const hudPct = b.totalHuddles > 0 ? Math.round(b.huddlesAttended / b.totalHuddles * 100) : null;
                    return (
                      <tr key={b.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="sv-avatar">{b.name.slice(0,2).toUpperCase()}</div>
                            <span style={{ fontWeight: 500 }}>{b.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--muted-fg)' }}>{b.squad ?? '—'}</td>
                        <td style={{ fontWeight: 600 }}>
                          {b.delightsDone}/{b.totalDelights}
                        </td>
                        <td>
                          {delPct !== null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="progress-track" style={{ width: 60 }}>
                                <div className={`progress-fill ${delPct >= 80 ? 'fill-green' : delPct >= 60 ? 'fill-blue' : 'fill-coral'}`} style={{ width: `${delPct}%` }} />
                              </div>
                              <span style={{ fontSize: 12 }}>{delPct}%</span>
                            </div>
                          ) : <span style={{ color: 'var(--muted-fg)' }}>—</span>}
                        </td>
                        <td>
                          {b.avgQuizScore !== null ? (
                            <span style={{ fontWeight: 600, color: b.avgQuizScore >= 80 ? '#2D5A0E' : b.avgQuizScore >= 60 ? '#0C447C' : '#8B2020' }}>
                              {b.avgQuizScore}%
                            </span>
                          ) : <span style={{ color: 'var(--muted-fg)', fontSize: 12 }}>No attempts</span>}
                        </td>
                        <td>
                          {hudPct !== null ? `${b.huddlesAttended}/${b.totalHuddles} (${hudPct}%)` : <span style={{ color: 'var(--muted-fg)' }}>—</span>}
                        </td>
                        <td><span className="badge badge-green">Active</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Training overview */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Training overview</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              trainings.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No trainings yet.</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table className="sv-table">
                  <thead><tr><th>Training</th><th>Date</th><th>Type</th><th>Status</th></tr></thead>
                  <tbody>
                    {trainings.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 500 }}>{t.name}</td>
                        <td style={{ color: 'var(--muted-fg)' }}>{t.training_date ? new Date(t.training_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td><span className={t.type === 'Mandatory' ? 'badge badge-amber' : 'badge badge-coral'}>{t.type}</span></td>
                        <td><span className={getStatusBadge(t.status)}>{getStatusLabel(t.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Export panel */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Export reports</div>
            {[
              { name: 'Butler performance report', desc: 'Full scorecard — all KPIs', format: 'PDF' },
              { name: 'Attendance analytics', desc: 'Huddles + training attendance', format: 'Excel' },
              { name: 'Task completion trends', desc: 'By property + butler', format: 'CSV' },
              { name: 'Guest delight summary', desc: 'Category-wise breakdown', format: 'PDF' },
              { name: 'Quiz leaderboard', desc: 'All attempts + pass rates', format: 'CSV' },
            ].map(r => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{r.desc}</div>
                </div>
                <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '5px 10px' }}>⬇ {r.format}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
