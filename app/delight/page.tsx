'use client';
import { useState, useRef } from 'react';
import Topbar from '@/components/layout/Topbar';
import { guestDelights as mockDelights } from '@/lib/data';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

// ── Photo pointer config ─────────────────────────────────────
const PHOTO_POINTERS = [
  { key: 'arrival_selfie',    label: 'Arrival selfie at villa',         emoji: '🤳', note: 'With timestamp' },
  { key: 'guest_welcome',     label: 'Guest welcome photo',             emoji: '🙏', note: '' },
  { key: 'table_layout',      label: 'Table layout',                    emoji: '🍽', note: 'Breakfast / Lunch / Dinner' },
  { key: 'guest_delight',     label: 'Guest delight',                   emoji: '🎁', note: 'Low / zero cost' },
  { key: 'exit_selfie',       label: 'Exit selfie at villa',            emoji: '👋', note: 'With timestamp' },
  { key: 'experience',        label: 'Experiences',                     emoji: '✨', note: 'Sit-down dinner / BBQ / birthday decor etc.' },
  { key: 'feedback',          label: 'Feedback',                        emoji: '⭐', note: '5 star / 7 star' },
];

const BOOKING_TYPES = [
  'Check in',
  'Check out',
  'Booking (full day)',
  'Non Booking Task',
  'Booking',
  'Non Booking',
];

const CAL_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

type PhotoMap = Record<string, { file: File; preview: string; timestamp: string } | null>;

type Entry = {
  id: string;
  your_name: string;
  squad: string;
  booking_date: string;
  booking_id: string;
  villa_name: string;
  booking_type: string;
  status: string;
  photos: PhotoMap;
};

// ── Helpers ──────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// ── Photo upload cell ─────────────────────────────────────────
function PhotoCell({
  pointer,
  value,
  onChange,
}: {
  pointer: typeof PHOTO_POINTERS[0];
  value: { file: File; preview: string; timestamp: string } | null;
  onChange: (v: { file: File; preview: string; timestamp: string } | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    const ts = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
    reader.onload = ev => onChange({ file, preview: ev.target?.result as string, timestamp: ts });
    reader.readAsDataURL(file);
  }

  return (
    <div style={{
      border: `1.5px dashed ${value ? '#97C459' : 'rgba(0,0,0,0.13)'}`,
      borderRadius: 10,
      padding: value ? 8 : 14,
      background: value ? 'rgba(151,196,89,0.05)' : 'transparent',
      transition: 'all 0.15s',
      cursor: 'pointer',
      minHeight: value ? 'auto' : 80,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      textAlign: 'center',
    }} onClick={() => ref.current?.click()}>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />

      {value ? (
        <>
          <img src={value.preview} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 7 }} />
          <div style={{ fontSize: 10, color: '#2D5A0E', fontWeight: 500 }}>✓ {value.timestamp}</div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(null); }}
            style={{ fontSize: 10, color: '#8B2020', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Remove
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 22 }}>{pointer.emoji}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sv-dark)', lineHeight: 1.3 }}>{pointer.label}</div>
          {pointer.note && <div style={{ fontSize: 10, color: 'var(--muted-fg)' }}>{pointer.note}</div>}
          <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 2 }}>Tap to upload</div>
        </>
      )}
    </div>
  );
}

// ── Add entry modal ───────────────────────────────────────────
function AddDelightModal({ onClose, onSaved }: { onClose: () => void; onSaved: (e: Entry) => void }) {
  const [form, setForm] = useState({
    your_name: '',
    squad: '',
    booking_date: '',
    booking_id: '',
    villa_name: '',
    booking_type: '',
  });
  const [photos, setPhotos] = useState<PhotoMap>(
    Object.fromEntries(PHOTO_POINTERS.map(p => [p.key, null]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setPhoto(key: string, val: { file: File; preview: string; timestamp: string } | null) {
    setPhotos(prev => ({ ...prev, [key]: val }));
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Supabase insert goes here when keys are set
    const entry: Entry = {
      id: Date.now().toString(),
      ...form,
      status: 'pending',
      photos,
    };
    setSaved(true);
    setTimeout(() => { onSaved(entry); onClose(); }, 900);
  }

  const uploadedCount = Object.values(photos).filter(Boolean).length;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px 16px', overflowY: 'auto',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 18, padding: 28,
        width: '100%', maxWidth: 640,
        boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
        marginTop: 20, marginBottom: 20,
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Log butler activity</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>Fill booking details + upload photo evidence</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)', lineHeight: 1 }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 22 }} />

        {saved ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Entry logged!</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>
              {uploadedCount} photo{uploadedCount !== 1 ? 's' : ''} uploaded
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {/* ── Booking info ── */}
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sv-dark)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              Booking details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <Field label="Your name *">
                <input className="sv-input" style={{ width: '100%' }} placeholder="e.g. Ravi Kumar" value={form.your_name} onChange={f('your_name')} required />
              </Field>
              <Field label="Your squad *">
                <input className="sv-input" style={{ width: '100%' }} placeholder="e.g. Lonavala" value={form.squad} onChange={f('squad')} required />
              </Field>
              <Field label="Booking date *">
                <input className="sv-input" type="date" style={{ width: '100%' }} value={form.booking_date} onChange={f('booking_date')} required />
              </Field>
              <Field label="Booking ID">
                <input className="sv-input" style={{ width: '100%' }} placeholder="e.g. BK-2026-04821" value={form.booking_id} onChange={f('booking_id')} />
              </Field>
              <Field label="Villa name *">
                <input className="sv-input" style={{ width: '100%' }} placeholder="Type villa name" value={form.villa_name} onChange={f('villa_name')} required />
              </Field>
              <Field label="Booking type *">
                <select className="sv-select" style={{ width: '100%' }} value={form.booking_type} onChange={f('booking_type')} required>
                  <option value="">Select type</option>
                  {BOOKING_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            {/* ── Photo pointers ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sv-dark)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Photo evidence
              </div>
              <span className={`badge ${uploadedCount > 0 ? 'badge-green' : 'badge-gray'}`}>
                {uploadedCount}/{PHOTO_POINTERS.length} uploaded
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 22 }}>
              {PHOTO_POINTERS.map(p => (
                <PhotoCell key={p.key} pointer={p} value={photos[p.key]} onChange={v => setPhoto(p.key, v)} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="sv-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="sv-btn sv-btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Submit entry'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Photo lightbox ────────────────────────────────────────────
function PhotoLightbox({ photos, onClose }: { photos: PhotoMap; onClose: () => void }) {
  const entries = PHOTO_POINTERS.map(p => ({ ...p, data: photos[p.key] })).filter(p => p.data);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 24,
        maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Photo evidence — {entries.length} photo{entries.length !== 1 ? 's' : ''}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {entries.map(p => (
            <div key={p.key} style={{ borderRadius: 10, overflow: 'hidden', border: '0.5px solid var(--card-border)' }}>
              <img src={p.data!.preview} alt={p.label} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{p.emoji} {p.label}</div>
                <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 2 }}>{p.data!.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
const DOT_COLORS: Record<string, { bg: string; color: string }> = {
  blue:  { bg: 'rgba(156,204,252,0.25)', color: '#0C447C' },
  coral: { bg: 'rgba(233,160,167,0.25)', color: '#7A2D42' },
  green: { bg: 'rgba(151,196,89,0.2)',   color: '#2D5A0E' },
};

export default function DelightPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<PhotoMap | null>(null);
  const [filterType, setFilterType] = useState('All');
  const [filterSquad, setFilterSquad] = useState('All');

  const allEntries = [
    // seed with mock so page isn't empty on first load
    ...mockDelights.map(d => ({
      id: d.id,
      your_name: d.butler,
      squad: d.property.split(' ')[0],
      booking_date: '2026-06-0' + d.id,
      booking_id: 'BK-2026-0' + (1000 + parseInt(d.id)),
      villa_name: d.property,
      booking_type: 'Check in',
      status: d.status,
      photos: {} as PhotoMap,
    })),
    ...entries,
  ];

  const filtered = allEntries.filter(e =>
    (filterType === 'All' || e.booking_type === filterType) &&
    (filterSquad === 'All' || e.squad === filterSquad)
  );

  const done = allEntries.filter(e => e.status === 'completed').length;
  const pending = allEntries.filter(e => e.status !== 'completed').length;
  const squads = [...new Set(allEntries.map(e => e.squad))];

  return (
    <>
      {showModal && (
        <AddDelightModal
          onClose={() => setShowModal(false)}
          onSaved={e => setEntries(prev => [e, ...prev])}
        />
      )}
      {lightboxPhotos && <PhotoLightbox photos={lightboxPhotos} onClose={() => setLightboxPhotos(null)} />}

      <Topbar
        title="Guest delight"
        subtitle="Photo evidence log per booking"
        actions={
          <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowModal(true)}>
            + Log activity
          </button>
        }
      />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total assigned</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{allEntries.length}</div>
          </div>
          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Completed</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{done}</div>
          </div>
          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Pending</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{pending}</div>
          </div>
          <div className="metric-card peach">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Photo pointers</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>7</div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>Per booking</div>
          </div>
        </div>

        {/* Photo pointer guide */}
        <div className="sv-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Photo pointers — required per booking</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {PHOTO_POINTERS.map((p, i) => (
              <div key={p.key} style={{
                background: 'var(--muted)', borderRadius: 10, padding: '12px 10px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{p.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, color: 'var(--sv-dark)' }}>{p.label}</div>
                {p.note && <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 3 }}>{p.note}</div>}
              </div>
            ))}
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
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {CAL_DAYS.map(day => {
              const dayEntries = allEntries.filter(e => {
                if (!e.booking_date) return false;
                try { return new Date(e.booking_date).getDate() === day; } catch { return false; }
              });
              return (
                <div key={day} className={`cal-day ${day === 2 ? 'today' : ''}`}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sv-mid)', marginBottom: 2 }}>{day}</div>
                  {dayEntries.slice(0, 2).map((e, i) => (
                    <span key={i} className="cal-dot" style={{ background: DOT_COLORS.blue.bg, color: DOT_COLORS.blue.color }}>
                      {e.booking_type === 'Check in' ? '→' : e.booking_type === 'Check out' ? '←' : '•'} {e.your_name.split(' ')[0]}
                    </span>
                  ))}
                  {dayEntries.length > 2 && (
                    <span className="cal-dot" style={{ background: DOT_COLORS.coral.bg, color: DOT_COLORS.coral.color }}>
                      +{dayEntries.length - 2} more
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Log table */}
        <div className="sv-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Activity log</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="sv-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="All">All types</option>
                {BOOKING_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <select className="sv-select" value={filterSquad} onChange={e => setFilterSquad(e.target.value)}>
                <option value="All">All squads</option>
                {squads.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sv-table">
              <thead>
                <tr>
                  <th>Butler</th>
                  <th>Squad</th>
                  <th>Date</th>
                  <th>Booking ID</th>
                  <th>Villa</th>
                  <th>Type</th>
                  <th>Photos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const photoCount = Object.values(e.photos).filter(Boolean).length;
                  return (
                    <tr key={e.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="sv-avatar">{e.your_name.slice(0, 2).toUpperCase()}</div>
                          <span style={{ fontWeight: 500 }}>{e.your_name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted-fg)' }}>{e.squad}</td>
                      <td style={{ color: 'var(--muted-fg)' }}>
                        {e.booking_date ? new Date(e.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.booking_id || '—'}</td>
                      <td style={{ color: 'var(--muted-fg)', maxWidth: 140 }}>{e.villa_name}</td>
                      <td><span className="badge badge-blue">{e.booking_type}</span></td>
                      <td>
                        {photoCount > 0 ? (
                          <button
                            className="sv-btn"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => setLightboxPhotos(e.photos)}
                          >
                            📷 {photoCount}/{PHOTO_POINTERS.length}
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>No photos</span>
                        )}
                      </td>
                      <td><span className={getStatusBadge(e.status)}>{getStatusLabel(e.status)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
