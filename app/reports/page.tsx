'use client';
import Topbar from '@/components/layout/Topbar';
import { butlers } from '@/lib/data';

const ringColor = (score: number) => score >= 85 ? '#97C459' : score >= 70 ? '#9CCCFC' : '#E9A0A7';

export default function ReportsPage() {
  return (
    <>
      <Topbar
        title="Reports & analytics"
        subtitle="June 2026 — all properties"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="sv-select">
              <option>June 2026</option>
              <option>May 2026</option>
              <option>April 2026</option>
            </select>
            <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>⬇ Download all</button>
          </div>
        }
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Summary metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Overall score</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>87%</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>↑ 6% vs May</div>
          </div>
          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Tasks completed</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>1,284</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>This month</div>
          </div>
          <div className="metric-card peach">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Delights done</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>29</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>of 38 assigned</div>
          </div>
          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Huddle attendance</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>89%</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>Team average</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          {/* Butler scorecard */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Butler scorecards</div>
            {butlers.map(b => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--muted)', borderRadius: 10, padding: 14, marginBottom: 10,
              }}>
                <div className="score-ring" style={{ borderColor: ringColor(b.score) }}>
                  {b.score}%
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{b.property}</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-green">Tasks: {b.tasks}%</span>
                    <span className="badge badge-blue">Quiz: {b.quizScore}%</span>
                    <span className="badge badge-coral">Attend: {b.attendance}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trend summary + Exports */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Trend */}
            <div className="sv-card">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Monthly trend</div>
              {[
                { month: 'Jan', score: 79 },
                { month: 'Feb', score: 81 },
                { month: 'Mar', score: 83 },
                { month: 'Apr', score: 80 },
                { month: 'May', score: 82 },
                { month: 'Jun', score: 87 },
              ].map(m => (
                <div key={m.month} className="stat-row">
                  <div style={{ width: 32, flexShrink: 0, fontSize: 12, fontWeight: 500 }}>{m.month}</div>
                  <div className="progress-track" style={{ flex: 1 }}>
                    <div
                      className="progress-fill fill-blue"
                      style={{ width: `${m.score}%`, background: m.month === 'Jun' ? '#9CCCFC' : 'rgba(156,204,252,0.5)' }}
                    />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: m.month === 'Jun' ? 700 : 400, width: 36, textAlign: 'right' }}>
                    {m.score}%
                  </span>
                </div>
              ))}
            </div>

            {/* Export reports */}
            <div className="sv-card">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Export reports</div>
              {[
                { name: 'Butler performance report', desc: 'Full scorecard · June 2026', format: 'PDF' },
                { name: 'Attendance analytics', desc: 'Huddles + training · June 2026', format: 'Excel' },
                { name: 'Task completion trends', desc: 'By property + butler', format: 'CSV' },
                { name: 'Guest delight summary', desc: 'Category-wise breakdown', format: 'PDF' },
              ].map(r => (
                <div key={r.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{r.desc}</div>
                  </div>
                  <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '5px 10px' }}>
                    ⬇ {r.format}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Property-wise */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Property performance — June 2026</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sv-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Location</th>
                  <th>Butlers</th>
                  <th>Tasks done</th>
                  <th>Delight %</th>
                  <th>Avg score</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Villa Serenity', loc: 'Lonavala', butlers: 4, tasks: 312, delight: 90, score: 91, trend: '↑' },
                  { name: 'Casa Azure', loc: 'Alibaug', butlers: 6, tasks: 401, delight: 82, score: 85, trend: '↑' },
                  { name: 'The Hillside', loc: 'Karjat', butlers: 5, tasks: 287, delight: 75, score: 79, trend: '→' },
                  { name: 'Villa Bloom', loc: 'Nashik', butlers: 4, tasks: 198, delight: 60, score: 68, trend: '↓' },
                  { name: 'Casa Paradiso', loc: 'Pune', butlers: 5, tasks: 86, delight: 88, score: 88, trend: '↑' },
                ].map(p => (
                  <tr key={p.name}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: 'var(--muted-fg)' }}>{p.loc}</td>
                    <td>{p.butlers}</td>
                    <td>{p.tasks.toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-track" style={{ width: 60 }}>
                          <div className={`progress-fill ${p.delight >= 80 ? 'fill-green' : p.delight >= 70 ? 'fill-blue' : 'fill-coral'}`} style={{ width: `${p.delight}%` }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{p.delight}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 14, fontWeight: 700,
                        color: p.score >= 85 ? '#2D5A0E' : p.score >= 75 ? '#0C447C' : '#8B2020',
                      }}>{p.score}%</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 16, color: p.trend === '↑' ? '#2D5A0E' : p.trend === '↓' ? '#8B2020' : '#7A4A08' }}>
                        {p.trend}
                      </span>
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
