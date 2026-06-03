'use client';
import { useState, useRef, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchGuestDelights, insertGuestDelight, uploadDelightPhoto, getSupabase, BUCKETS, type GuestDelight } from '@/lib/supabase';
import { getCurrentUser, type AppUser } from '@/lib/auth';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

const PHOTO_POINTERS = [
  { key: 'arrival_selfie', label: 'Arrival selfie at villa', emoji: '🤳', note: 'With timestamp' },
  { key: 'guest_welcome',  label: 'Guest welcome photo',    emoji: '🙏', note: '' },
  { key: 'table_layout',   label: 'Table layout',           emoji: '🍽', note: 'Breakfast / Lunch / Dinner' },
  { key: 'guest_delight',  label: 'Guest delight',          emoji: '🎁', note: 'Low / zero cost' },
  { key: 'exit_selfie',    label: 'Exit selfie at villa',   emoji: '👋', note: 'With timestamp' },
  { key: 'experience',     label: 'Experiences',            emoji: '✨', note: 'Sit-down dinner / BBQ / birthday decor' },
  { key: 'feedback',       label: 'Feedback',               emoji: '⭐', note: '5 star / 7 star' },
];

const BOOKING_TYPES = ['Check in','Check out','Booking (full day)','Non Booking Task','Booking','Non Booking'];

type PhotoVal = { file: File; preview: string; timestamp: string } | null;
type PhotoMap = Record<string, PhotoVal>;
const CAL_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

function PhotoCell({ pointer, value, onChange }: { pointer: typeof PHOTO_POINTERS[0]; value: PhotoVal; onChange: (v: PhotoVal) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    const ts = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
    reader.onload = ev => onChange({ file, preview: ev.target?.result as string, timestamp: ts });
    reader.readAsDataURL(file);
  }
  return (
    <div style={{ border: `1.5px dashed ${value ? '#97C459' : 'rgba(0,0,0,0.13)'}`, borderRadius: 10, padding: value ? 8 : 14, background: value ? 'rgba(151,196,89,0.05)' : 'transparent', cursor: 'pointer', minHeight: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textAlign: 'center', transition: 'all 0.15s' }} onClick={() => ref.current?.click()}>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
      {value ? (
        <>
          <img src={value.preview} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 7 }} />
          <div style={{ fontSize: 10, color: '#2D5A0E', fontWeight: 600 }}>✓ {value.timestamp}</div>
          <button type="button" onClick={e => { e.stopPropagation(); onChange(null); }} style={{ fontSize: 10, color: '#8B2020', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 22 }}>{pointer.emoji}</div>
          <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>{pointer.label}</div>
          {pointer.note && <div style={{ fontSize: 10, color: 'var(--muted-fg)' }}>{pointer.note}</div>}
          <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 2 }}>Tap to upload</div>
        </>
      )}
    </div>
  );
}

function AddDelightModal({ user, onClose, onSaved }: { user: AppUser | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ your_name: user?.name ?? '', squad: user?.squad ?? '', booking_date: '', booking_id: '', villa_name: '', booking_type: '' });
  const [photos, setPhotos] = useState<PhotoMap>(Object.fromEntries(PHOTO_POINTERS.map(p => [p.key, null])));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const { data, error: insertErr } = await insertGuestDelight({ your_name: form.your_name, squad: form.squad, booking_date: form.booking_date, booking_id: form.booking_id || null, villa_name: form.villa_name, booking_type: form.booking_type, status: 'pending' });
      if (insertErr) throw new Error(insertErr.message);
      if (data?.id) {
        for (const p of PHOTO_POINTERS) {
          const photo = photos[p.key];
          if (photo) await uploadDelightPhoto(data.id, p.key, photo.file, photo.timestamp);
        }
      }
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (err: any) { setError(err.message ?? 'Failed to save'); setSaving(false); }
  }

  const uploadedCount = Object.values(photos).filter(Boolean).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 640, boxShadow: '0 32px 80px rgba(0,0,0,0.2)', marginTop: 20, marginBottom: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div><div style={{ fontSize: 16, fontWeight: 700 }}>Log butler activity</div><div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>Fill booking details + upload photo evidence</div></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 22 }} />
        {saved ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Saved!</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>{uploadedCount} photo{uploadedCount !== 1 ? 's' : ''} uploaded</div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {error && <div style={{ background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Booking details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {([['your_name','Your name *','text','e.g. Ravi Kumar',true],['squad','Your squad *','text','e.g. Lonavala',true],['booking_date','Booking date *','date','',true],['booking_id','Booking ID','text','e.g. BK-2026-04821',false],['villa_name','Villa name *','text','Type villa name',true]] as any[]).map(([key,label,type,ph,req]) => (
                <div key={key}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>{label}</div>
                  <input className="sv-input" style={{ width: '100%' }} type={type} placeholder={ph} value={(form as any)[key]} onChange={f(key)} required={req} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Booking type *</div>
                <select className="sv-select" style={{ width: '100%' }} value={form.booking_type} onChange={f('booking_type')} required>
                  <option value="">Select type</option>
                  {BOOKING_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Photo evidence</div>
              <span className={`badge ${uploadedCount > 0 ? 'badge-green' : 'badge-gray'}`}>{uploadedCount}/{PHOTO_POINTERS.length} uploaded</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10, marginBottom: 22 }}>
              {PHOTO_POINTERS.map(p => <PhotoCell key={p.key} pointer={p} value={photos[p.key]} onChange={v => setPhotos(prev => ({ ...prev, [p.key]: v }))} />)}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="sv-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="sv-btn sv-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Submit entry'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function PhotoLightbox({ photos, onClose }: { photos: { key: string; url: string; ts: string }[]; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Photo evidence — {photos.length} photo{photos.length !== 1 ? 's' : ''}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {photos.map((p, i) => {
            const ptr = PHOTO_POINTERS.find(x => x.key === p.key);
            return (
              <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: '0.5px solid var(--card-border)' }}>
                <img src={p.url} alt={ptr?.label} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{ptr?.emoji} {ptr?.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 2 }}>{p.ts}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DelightPage() {
  const [entries, setEntries] = useState<GuestDelight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [lightbox, setLightbox] = useState<{ key: string; url: string; ts: string }[] | null>(null);
  const [filterType, setFilterType] = useState('All');
  const [user, setUser] = useState<AppUser | null>(null);

  async function load() {
    setLoading(true);
    const data = await fetchGuestDelights();
    setEntries(data); setLoading(false);
  }

  useEffect(() => { getCurrentUser().then(setUser); load(); }, []);

  useEffect(() => {
    const channel = getSupabase().channel('delight_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'guest_delights' }, load).subscribe();
    return () => { getSupabase().removeChannel(channel); };
  }, []);

  const filtered = entries.filter(e => filterType === 'All' || e.booking_type === filterType);
  const done = entries.filter(e => e.status === 'completed').length;

  function openLightbox(delight: GuestDelight) {
    const photos = (delight.delight_photos ?? []).map(p => ({
      key: p.pointer_key,
      url: p.public_url ?? getSupabase().storage.from(BUCKETS.DELIGHT_PHOTOS).getPublicUrl(p.storage_path).data.publicUrl,
      ts: p.captured_at ? new Date(p.captured_at).toLocaleString('en-IN') : new Date(p.uploaded_at).toLocaleString('en-IN'),
    }));
    setLightbox(photos);
  }

  return (
    <>
      {showModal && <AddDelightModal user={user} onClose={() => setShowModal(false)} onSaved={load} />}
      {lightbox && <PhotoLightbox photos={lightbox} onClose={() => setLightbox(null)} />}
      <Topbar title="Guest delight" subtitle="Live photo evidence per booking"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowModal(true)}>+ Log activity</button>} />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[{ label: 'Total', value: entries.length, cls: 'blue' }, { label: 'Completed', value: done, cls: 'green' }, { label: 'Pending', value: entries.length - done, cls: 'coral' }, { label: 'Completion', value: entries.length > 0 ? `${Math.round(done/entries.length*100)}%` : '—', cls: 'peach' }].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>
        <div className="sv-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Photo pointers — required per booking</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {PHOTO_POINTERS.map(p => (
              <div key={p.key} style={{ background: 'var(--muted)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{p.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>{p.label}</div>
                {p.note && <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 3 }}>{p.note}</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="sv-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Activity log <span className="badge badge-green" style={{ marginLeft: 6 }}>Live</span></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="sv-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="All">All types</option>
                {BOOKING_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <button className="sv-btn" style={{ fontSize: 12 }} onClick={load}>↻ Refresh</button>
            </div>
          </div>
          {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div> :
            filtered.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-fg)' }}>No entries yet. Click <strong>+ Log activity</strong> to add the first one.</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead><tr><th>Butler</th><th>Squad</th><th>Date</th><th>Booking ID</th><th>Villa</th><th>Type</th><th>Photos</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="sv-avatar">{e.your_name.slice(0,2).toUpperCase()}</div><span style={{ fontWeight: 500 }}>{e.your_name}</span></div></td>
                      <td style={{ color: 'var(--muted-fg)' }}>{e.squad ?? '—'}</td>
                      <td style={{ color: 'var(--muted-fg)' }}>{e.booking_date ? new Date(e.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.booking_id ?? '—'}</td>
                      <td>{e.villa_name}</td>
                      <td><span className="badge badge-blue">{e.booking_type}</span></td>
                      <td>
                        {(e.delight_photos?.length ?? 0) > 0
                          ? <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => openLightbox(e)}>📷 {e.delight_photos?.length}/{PHOTO_POINTERS.length}</button>
                          : <span style={{ fontSize: 12, color: 'var(--muted-fg)' }}>No photos</span>}
                      </td>
                      <td><span className={getStatusBadge(e.status)}>{getStatusLabel(e.status)}</span></td>
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
