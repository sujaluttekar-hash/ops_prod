'use client';
import Topbar from '@/components/layout/Topbar';
import { huddles, butlers } from '@/lib/data';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

export default function HuddlePage() {
  return (
    <>
      <Topbar
        title="Butler huddles"
        subtitle="Fortnightly team meetings — twice a month"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Schedule huddle</button>}
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total huddles</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>24</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>This year</div>
          </div>
          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Avg attendance</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>89%</div>
          </div>
          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Missed</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>3</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>Butler absences</div>
          </div>
          <div className="metric-card peach">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Next huddle</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>Jun 8</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>6 days away</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          {/* Upcoming */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Upcoming huddles</div>
            {huddles.filter(h => h.status !== 'completed').map(h => (
              <div key={h.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'var(--muted)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div className="huddle-date">
                  <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{h.date}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase' }}>{h.month}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{h.team}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>
                    {h.time} · {h.participants} participants expected
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span>
                    <button className="sv-btn" style={{ fontSize: 11, padding: '3px 8px' }}>View agenda</button>
                    <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '3px 8px' }}>Mark attendance</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Attendance record */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Butler attendance</div>
            {butlers.map(b => (
              <div key={b.id} className="stat-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 140, flexShrink: 0 }}>
                  <div className="sv-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>{b.initials}</div>
                  <span style={{ fontSize: 12 }}>{b.name.split(' ')[0]}</span>
                </div>
                <div className="progress-track" style={{ flex: 1 }}>
                  <div
                    className={`progress-fill ${b.attendance >= 90 ? 'fill-green' : b.attendance >= 75 ? 'fill-blue' : 'fill-coral'}`}
                    style={{ width: `${b.attendance}%` }}
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, width: 36, textAlign: 'right' }}>{b.attendance}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Huddle history */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Huddle history</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sv-table">
              <thead>
                <tr>
                  <th>Huddle</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Participants</th>
                  <th>Attendance</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {huddles.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 500 }}>{h.team}</td>
                    <td style={{ color: 'var(--muted-fg)' }}>{h.date} {h.month}</td>
                    <td style={{ color: 'var(--muted-fg)' }}>{h.time}</td>
                    <td>{h.participants}</td>
                    <td>
                      {h.attendance ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-track" style={{ width: 60 }}>
                            <div className="progress-fill fill-green" style={{ width: `${h.attendance}%` }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{h.attendance}%</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td><span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span></td>
                    <td>
                      {h.status === 'completed' ? (
                        <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }}>View notes</button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
