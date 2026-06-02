'use client';
import { useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import { guestDelights, calendarEvents } from '@/lib/data';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

const CAL_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);
const DOT_COLORS: Record<string, { bg: string; color: string }> = {
  blue: { bg: 'rgba(156,204,252,0.25)', color: '#0C447C' },
  coral: { bg: 'rgba(233,160,167,0.25)', color: '#7A2D42' },
  green: { bg: 'rgba(151,196,89,0.2)', color: '#2D5A0E' },
};

function AddDelightModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ guest: '', property: '', butler: '', category: '', date: '', notes: '' });
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(onClose, 1000);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Add guest delight</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted-fg)', lineHeight: 1 }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 20 }} />

        {saved ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Delight added!</div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Guest name *</label>
                <input className="sv-input" style={{ width: '100%' }} placeholder="e.g. Sharma family" value={form.guest} onChange={e => setForm(f => ({ ...f, guest: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Property *</label>
                <select className="sv-select" style={{ width: '100%' }} value={form.property} onChange={e => setForm(f => ({ ...f, property: e.target.value }))} required>
                  <option value="">Select</option>
                  <option>Villa Serenity</option>
                  <option>Casa Azure</option>
                  <option>The Hillside</option>
                  <option>Villa Bloom</option>
                  <option>Casa Paradiso</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Butler assigned *</label>
                <select className="sv-select" style={{ width: '100%' }} value={form.butler} onChange={e => setForm(f => ({ ...f, butler: e.target.value }))} required>
                  <option value="">Select</option>
                  <option>Ravi Kumar</option>
                  <option>Pooja Nair</option>
                  <option>Arjun Singh</option>
                  <option>Meena Joshi</option>
                  <option>Karan Mehta</option>
                  <option>Divya Shah</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Category *</label>
                <select className="sv-select" style={{ width: '100%' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
                  <option value="">Select</option>
                  <option>Birthday</option>
                  <option>Anniversary</option>
                  <option>Honeymoon</option>
                  <option>Welcome</option>
                  <option>Kids special</option>
                  <option>Surprise</option>
                  <option>Pet stay</option>
                  <option>Turndown</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Date *</label>
                <input className="sv-input" type="date" style={{ width: '100%' }} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Status</label>
                <select className="sv-select" style={{ width: '100%' }}>
                  <option>Pending</option>
                  <option>Completed</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Notes / instructions</label>
              <textarea className="sv-input" style={{ width: '100%', minHeight: 72, resize: 'vertical' }} placeholder="e.g. Flower surprise + cake arranged by 6 PM" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="upload-zone" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>📎</div>
              <div style={{ fontSize: 12 }}>Attach photo (optional)</div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="sv-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="sv-btn sv-btn-primary">Save delight</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function DelightPage() {
  const [filterProperty, setFilterProperty] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showModal, setShowModal] = useState(false);

  const filtered = guestDelights.filter(d =>
    (filterProperty === 'All' || d.property === filterProperty) &&
    (filterStatus === 'All' || d.status === filterStatus)
  );

  const completed = guestDelights.filter(d => d.status === 'completed').length;
  const pending = guestDelights.filter(d => d.status === 'pending').length;
  const overdue = guestDelights.filter(d => d.status === 'overdue').length;
  const pct = Math.round((completed / guestDelights.length) * 100);

  return (
    <>
      {showModal && <AddDelightModal onClose={() => setShowModal(false)} />}
      <Topbar
        title="Guest delight"
        subtitle="Calendar and delight tracking"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowModal(true)}>+ Add delight</button>}
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total assigned</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{guestDelights.length}</div>
          </div>
          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Completed</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{completed}</div>
          </div>
          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Pending</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{pending + overdue}</div>
          </div>
          <div className="metric-card peach">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Completion</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{pct}%</div>
          </div>
        </div>

        {/* Calendar */}
        <div className="sv-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>June 2026</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="sv-btn" style={{ fontSize: 12, padding: '5px 10px' }}>← May</button>
              <button className="sv-btn" style={{ fontSize: 12, padding: '5px 10px' }}>Jul →</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {/* Offset for June 2026 starting Monday */}
            {CAL_DAYS.map(day => {
              const events = calendarEvents[day as keyof typeof calendarEvents] || [];
              return (
                <div key={day} className={`cal-day ${day === 3 ? 'today' : ''}`}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sv-mid)', marginBottom: 2 }}>{day}</div>
                  {events.map((ev, i) => {
                    const col = DOT_COLORS[ev.color] || DOT_COLORS.blue;
                    return (
                      <span key={i} className="cal-dot" style={{ background: col.bg, color: col.color }}>{ev.label}</span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters + Table */}
        <div className="sv-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Delight log</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="sv-select" value={filterProperty} onChange={e => setFilterProperty(e.target.value)}>
                <option>All</option>
                <option>Villa Serenity</option>
                <option>Casa Azure</option>
                <option>The Hillside</option>
                <option>Villa Bloom</option>
              </select>
              <select className="sv-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option>All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sv-table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Property</th>
                  <th>Butler</th>
                  <th>Category</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="sv-avatar">{d.initials}</div>
                        <span style={{ fontWeight: 500 }}>{d.guest}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted-fg)' }}>{d.property}</td>
                    <td style={{ color: 'var(--muted-fg)' }}>{d.butler}</td>
                    <td><span className="badge badge-coral">{d.category}</span></td>
                    <td style={{ color: 'var(--muted-fg)', fontSize: 12, maxWidth: 180 }}>{d.notes}</td>
                    <td><span className={getStatusBadge(d.status)}>{getStatusLabel(d.status)}</span></td>
                    <td style={{ color: 'var(--muted-fg)' }}>{d.date}</td>
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
