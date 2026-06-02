'use client';
import Topbar from '@/components/layout/Topbar';
import { trainings, butlers } from '@/lib/data';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

export default function TrainingPage() {
  return (
    <>
      <Topbar
        title="Functional training"
        subtitle="Twice-yearly structured training sessions"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Schedule training</button>}
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Sessions this year</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>4</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>2 per cycle</div>
          </div>
          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Completion rate</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>91%</div>
          </div>
          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Overdue</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>2</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>Butlers pending</div>
          </div>
          <div className="metric-card peach">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Certificates</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>38</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>Issued to date</div>
          </div>
        </div>

        <div className="sv-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Training schedule</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sv-table">
              <thead>
                <tr>
                  <th>Training</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Enrolled</th>
                  <th>Completion</th>
                  <th>Status</th>
                  <th>Quiz</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainings.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.name}</td>
                    <td style={{ color: 'var(--muted-fg)' }}>{t.date}</td>
                    <td>
                      <span className={t.type === 'Mandatory' ? 'badge badge-amber' : 'badge badge-coral'}>{t.type}</span>
                    </td>
                    <td style={{ color: 'var(--muted-fg)' }}>{t.enrolled}/{t.total}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                        <div className="progress-track" style={{ flex: 1 }}>
                          <div
                            className={`progress-fill ${t.completion >= 80 ? 'fill-green' : t.completion > 0 ? 'fill-blue' : ''}`}
                            style={{ width: `${t.completion}%` }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, width: 32 }}>{t.completion}%</span>
                      </div>
                    </td>
                    <td><span className={getStatusBadge(t.status)}>{getStatusLabel(t.status)}</span></td>
                    <td>
                      {t.hasQuiz ? <span className="badge badge-blue">Yes</span> : <span style={{ color: 'var(--muted-fg)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {t.status === 'completed' && (
                          <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }}>📄 Cert</button>
                        )}
                        <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }}>View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-butler completion */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Butler training completion</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {butlers.map(b => (
              <div key={b.id} style={{ background: 'var(--muted)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div className="sv-avatar">{b.initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{b.property}</div>
                  </div>
                </div>
                {[
                  { label: 'F&B service standards', done: b.score > 80, pct: b.score > 80 ? 100 : 0 },
                  { label: 'Guest communication', done: true, pct: 100 },
                  { label: 'Property knowledge', done: b.score > 70, pct: b.score > 70 ? 100 : 0 },
                  { label: 'Safety protocols', done: false, pct: 0 },
                ].map((tr, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: tr.done ? '#97C459' : 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0 }}>
                      {tr.done ? '✓' : ''}
                    </span>
                    <span style={{ flex: 1, color: tr.done ? 'var(--sv-dark)' : 'var(--muted-fg)' }}>{tr.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
