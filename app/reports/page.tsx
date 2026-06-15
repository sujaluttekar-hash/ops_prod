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

  // ── CSV export utility ─────────────────────────────────────
  function dl(filename: string, content: string) {
    const bom = '﻿';
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
  function cell(v: any) {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCSV(headers: string[], rows: any[][]) {
    return [headers.join(','), ...rows.map(r => r.map(cell).join(','))].join('\n');
  }

  function exportButlerPerformance() {
    if (!butlerStats.length) { alert('No data yet. Make sure butlers have been assigned tasks and delights.'); return; }
    const csv = toCSV(
      ['Name','Squad','Role','Delights Done','Total Delights','Delight %','Avg Quiz Score','Huddles Attended','Total Huddles','Huddle %'],
      butlerStats.map(b => [
        b.name, b.squad ?? '', b.role ?? 'butler',
        b.delightsDone, b.totalDelights,
        b.totalDelights > 0 ? Math.round(b.delightsDone / b.totalDelights * 100) + '%' : '0%',
        b.avgQuizScore !== null ? b.avgQuizScore + '%' : 'N/A',
        b.huddlesAttended, b.totalHuddles,
        b.totalHuddles > 0 ? Math.round(b.huddlesAttended / b.totalHuddles * 100) + '%' : '0%',
      ])
    );
    dl(`butler_performance_${new Date().toISOString().split('T')[0]}.csv`, csv);
  }

  function exportAttendance() {
    if (!trainings.length && !huddles.length) { alert('No training or huddle data found yet.'); return; }
    const csv = toCSV(
      ['Type','Name/Team','Date','Status','Expected','Attended'],
      [
        ...trainings.map((t: any) => ['Training', t.name || t.type || '—', t.date || '—', t.status || '—', t.total_seats || '—', '—']),
        ...huddles.map((h: any) => ['Huddle', h.team || '—', h.huddle_date || '—', h.status || '—', h.participants_expected || '—', h.participants_attended || '—']),
      ]
    );
    dl(`attendance_analytics_${new Date().toISOString().split('T')[0]}.csv`, csv);
  }

  function exportTaskTrends() {
    if (!stats.tasks.length) { alert('No task data yet.'); return; }
    const csv = toCSV(
      ['Task ID','Type','Status','Butler ID','Villa (from notes)','Due Time','Completed At'],
      stats.tasks.map((t: any) => {
        const villaMatch = t.notes?.match(/Villa: ([^·]+)/);
        return [t.id, t.type, t.status, t.butler_id || '—', villaMatch?.[1]?.trim() || '—', t.due_time || '—', t.completed_at || '—'];
      })
    );
    dl(`task_trends_${new Date().toISOString().split('T')[0]}.csv`, csv);
  }

  function exportDelightSummary() {
    if (!delights.length) { alert('No delight data yet.'); return; }
    const csv = toCSV(
      ['Butler Name','Villa','Booking Type','Booking Date','Booking ID','Status','Photos'],
      delights.map((d: any) => [
        d.your_name, d.villa_name || '—', d.booking_type || '—',
        d.booking_date || '—', d.booking_id || '—', d.status || '—',
        d.delight_photos?.length ?? 0,
      ])
    );
    dl(`guest_delight_summary_${new Date().toISOString().split('T')[0]}.csv`, csv);
  }

  function exportQuizLeaderboard() {
    if (!butlerStats.length) { alert('Data still loading.'); return; }
    const sorted = [...butlerStats].sort((a, b) => (b.avgQuizScore ?? -1) - (a.avgQuizScore ?? -1));
    const csv = toCSV(
      ['Rank','Butler','Squad','Avg Score','Huddles Attended'],
      sorted.map((b, i) => [i + 1, b.name, b.squad ?? '', b.avgQuizScore !== null ? b.avgQuizScore + '%' : 'N/A', b.huddlesAttended])
    );
    dl(`quiz_leaderboard_${new Date().toISOString().split('T')[0]}.csv`, csv);
  }

  const delightDone = stats.delights.filter((d: any) => d.status === 'completed').length;
  const taskDone = stats.tasks.filter((t: any) => t.status === 'completed').length;
  const completionPct = stats.delights.length > 0 ? Math.round(delightDone / stats.delights.length * 100) : 0;

  return (
    <>
      <Topbar title="MIS & Reports" subtitle="Live performance dashboard"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={exportButlerPerformance}>⬇ Export all</button>} />
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
              { name: 'Butler performance report', desc: 'All KPIs per butler — delight %, quiz score, huddle attendance', fn: exportButlerPerformance },
              { name: 'Attendance analytics', desc: 'Huddles + training sessions with dates and status', fn: exportAttendance },
              { name: 'Task completion trends', desc: 'All tasks with type, status, villa, butler, due time', fn: exportTaskTrends },
              { name: 'Guest delight summary', desc: 'All delight entries with villa, booking type, photo count', fn: exportDelightSummary },
              { name: 'Quiz leaderboard', desc: 'All butlers ranked by avg quiz score', fn: exportQuizLeaderboard },
            ].map(r => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{r.desc}</div>
                </div>
                <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '5px 10px' }} onClick={r.fn}>⬇ CSV</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
