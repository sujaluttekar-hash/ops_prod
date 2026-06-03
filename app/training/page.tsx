'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchTrainings, fetchProfiles, type Training, type Profile } from '@/lib/supabase';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

export default function TrainingPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchTrainings(), fetchProfiles()]).then(([t, p]) => { setTrainings(t); setProfiles(p); setLoading(false); });
  }, []);

  const completed = trainings.filter(t => t.status === 'completed').length;

  return (
    <>
      <Topbar title="Functional training" subtitle="Training sessions and completion tracking"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Schedule training</button>} />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
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

        <div className="sv-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Training schedule</div>
          {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
            trainings.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No trainings scheduled yet.</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead><tr><th>Training</th><th>Date</th><th>Type</th><th>Seats</th><th>Status</th><th>Quiz</th></tr></thead>
                <tbody>
                  {trainings.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.name}</td>
                      <td style={{ color: 'var(--muted-fg)' }}>{t.training_date ? new Date(t.training_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td><span className={t.type === 'Mandatory' ? 'badge badge-amber' : 'badge badge-coral'}>{t.type}</span></td>
                      <td style={{ color: 'var(--muted-fg)' }}>{t.total_seats}</td>
                      <td><span className={getStatusBadge(t.status)}>{getStatusLabel(t.status)}</span></td>
                      <td>{t.has_quiz ? <span className="badge badge-blue">Yes</span> : <span style={{ color: 'var(--muted-fg)' }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Butler roster</div>
          {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
            profiles.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No butlers in system yet.</div> :
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
          }
        </div>
      </div>
    </>
  );
}
