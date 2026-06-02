'use client';
import Topbar from '@/components/layout/Topbar';
import { rosterData } from '@/lib/data';
import { getShiftClass } from '@/lib/utils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export default function RosterPage() {
  return (
    <>
      <Topbar
        title="Roster management"
        subtitle="Week of Jun 2–8, 2026"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="sv-btn" style={{ fontSize: 12 }}>⬆ Upload CSV</button>
            <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Add shift</button>
          </div>
        }
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total butlers</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>24</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>Across 5 properties</div>
          </div>
          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>On shift today</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>18</div>
          </div>
          <div className="metric-card peach">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>On weekly off</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>6</div>
          </div>
          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Swap requests</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>2</div>
            <div style={{ fontSize: 11, color: '#8B2020', marginTop: 4 }}>Pending approval</div>
          </div>
        </div>

        {/* Roster grid */}
        <div className="sv-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Weekly roster</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="sv-btn" style={{ fontSize: 11, padding: '5px 10px' }}>← Prev week</button>
              <button className="sv-btn" style={{ fontSize: 11, padding: '5px 10px' }}>Next week →</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sv-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>Butler</th>
                  <th>Property</th>
                  {DAYS.map(d => <th key={d} style={{ textAlign: 'center', minWidth: 70 }}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {rosterData.map(r => (
                  <tr key={r.butler}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="sv-avatar">{r.initials}</div>
                        <span style={{ fontWeight: 500 }}>{r.butler}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted-fg)', fontSize: 12 }}>{r.property}</td>
                    {DAY_KEYS.map(day => (
                      <td key={day} style={{ textAlign: 'center' }}>
                        <span className={`badge ${getShiftClass(r[day])}`} style={{ minWidth: 38, justifyContent: 'center' }}>
                          {r[day]}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 16, fontSize: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="badge shift-m">M</span> Morning 6am–2pm</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="badge shift-e">E</span> Evening 2pm–10pm</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="badge shift-n">N</span> Night 10pm–6am</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="badge shift-off">Off</span> Weekly off</span>
          </div>
        </div>

        {/* Shift swap requests */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Pending shift swap requests</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { from: 'Karan Mehta', to: 'Meena Joshi', date: 'Jun 5 (Thu)', shift: 'Morning', reason: 'Personal appointment', time: '2h ago' },
              { from: 'Arjun Singh', to: 'Divya Shah', date: 'Jun 7 (Sat)', shift: 'Evening', reason: 'Family function', time: '4h ago' },
            ].map((req, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--muted)', borderRadius: 10, padding: 14, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {req.from} <span style={{ color: 'var(--muted-fg)', fontWeight: 400 }}>→</span> {req.to}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>
                    {req.date} · {req.shift} shift · {req.reason}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{req.time}</span>
                  <button className="sv-btn" style={{ fontSize: 11, padding: '5px 10px', color: '#8B2020', borderColor: '#E9A0A7' }}>Decline</button>
                  <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '5px 10px' }}>Approve</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
