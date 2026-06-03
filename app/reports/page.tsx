'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchDashboardStats, fetchProfiles, fetchTrainings, type Profile, type Training } from '@/lib/supabase';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({ delights: [], tasks: [], upcomingHuddles: [] });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchProfiles(), fetchTrainings()]).then(([s, p, t]) => {
      setStats(s); setProfiles(p); setTrainings(t); setLoading(false);
    });
  }, []);

  const delightDone = stats.delights.filter((d: any) => d.status === 'completed').length;
  const taskDone = stats.tasks.filter((t: any) => t.status === 'completed').length;

  return (
    <>
      <Topbar title="Reports & analytics" subtitle="Live from Supabase"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>⬇ Download all</button>} />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total butlers', value: profiles.length, cls: 'blue' },
            { label: 'Tasks done', value: taskDone, cls: 'green' },
            { label: 'Delights done', value: `${delightDone}/${stats.delights.length}`, cls: 'peach' },
            { label: 'Trainings', value: trainings.length, cls: 'coral' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Butler list</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              profiles.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No butlers in system yet.</div> :
              profiles.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--muted)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div className="sv-avatar">{p.name.slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{p.squad ?? '—'} · {p.role}</div>
                  </div>
                  <span className="badge badge-green">Active</span>
                </div>
              ))
            }
          </div>

          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Export reports</div>
            {[
              { name: 'Butler performance report', desc: 'Full scorecard', format: 'PDF' },
              { name: 'Attendance analytics', desc: 'Huddles + training', format: 'Excel' },
              { name: 'Task completion trends', desc: 'By property + butler', format: 'CSV' },
              { name: 'Guest delight summary', desc: 'Category-wise breakdown', format: 'PDF' },
            ].map(r => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{r.desc}</div>
                </div>
                <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '5px 10px' }}>⬇ {r.format}</button>
              </div>
            ))}
          </div>
        </div>

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
      </div>
    </>
  );
}
