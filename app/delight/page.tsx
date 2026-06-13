'use client';
import { PROPERTIES } from '@/lib/properties-data';
import { useState, useRef, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchGuestDelights, insertGuestDelight, uploadDelightPhoto, getSupabase, getServiceSupabase, BUCKETS, type GuestDelight } from '@/lib/supabase';
import { getCurrentUser, isSupervisor, type AppUser } from '@/lib/auth';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';

const PHOTO_POINTERS = [
  { key: 'arrival_selfie', label: 'Arrival selfie', emoji: '🤳', note: 'With timestamp' },
  { key: 'guest_welcome',  label: 'Guest welcome',  emoji: '🙏', note: '' },
  { key: 'table_layout',   label: 'Table layout',   emoji: '🍽', note: 'Breakfast / Lunch / Dinner' },
  { key: 'guest_delight',  label: 'Guest delight',  emoji: '🎁', note: 'Low / zero cost' },
  { key: 'exit_selfie',    label: 'Exit selfie',    emoji: '👋', note: 'With timestamp' },
  { key: 'experience',     label: 'Experiences',    emoji: '✨', note: 'Sit-down dinner / BBQ / birthday decor' },
  { key: 'feedback',       label: 'Feedback',       emoji: '⭐', note: '5 star / 7 star' },
];

const BOOKING_TYPES = ['Check in','Check out','Booking (full day)','Non Booking Task','Booking','Non Booking'];

type PhotoVal = { file: File; preview: string; timestamp: string } | null;
type PhotoMap = Record<string, PhotoVal>;

// ── Photo upload cell ────────────────────────────────────────
function PhotoCell({ pointer, value, onChange }: { pointer: typeof PHOTO_POINTERS[0]; value: PhotoVal; onChange: (v: PhotoVal) => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    const ts = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
    reader.onload = ev => onChange({ file, preview: ev.target?.result as string, timestamp: ts });
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ border: `1.5px dashed ${value ? '#97C459' : 'rgba(0,0,0,0.13)'}`, borderRadius: 10, padding: value ? 8 : 12, background: value ? 'rgba(151,196,89,0.05)' : 'transparent', minHeight: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', transition: 'all 0.15s' }}>
      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      {value ? (
        <>
          <img src={value.preview} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 7 }} />
          <div style={{ fontSize: 10, color: '#2D5A0E', fontWeight: 600 }}>✓ {value.timestamp}</div>
          <button type="button" onClick={() => onChange(null)} style={{ fontSize: 10, color: '#8B2020', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Remove</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 22 }}>{pointer.emoji}</div>
          <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>{pointer.label}</div>
          {pointer.note && <div style={{ fontSize: 10, color: 'var(--muted-fg)' }}>{pointer.note}</div>}
          {/* Two upload options */}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button type="button"
              onClick={() => cameraRef.current?.click()}
              style={{ fontSize: 11, padding: '5px 10px', background: '#1B1D1F', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              📷 Camera
            </button>
            <button type="button"
              onClick={() => galleryRef.current?.click()}
              style={{ fontSize: 11, padding: '5px 10px', background: 'var(--muted)', color: 'var(--sv-dark)', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              🖼 Gallery
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Add delight modal ────────────────────────────────────────
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
      if (!form.villa_name) { alert('Please select a villa from the dropdown.'); setSaving(false); return; }
      const { data, error: insertErr } = await insertGuestDelight({ your_name: form.your_name, squad: form.squad, booking_date: form.booking_date, booking_id: form.booking_id || null, villa_name: form.villa_name, booking_type: form.booking_type, status: 'pending' });
      if (insertErr) throw new Error(insertErr.message);
      if (data?.id) {
        let uploadCount = 0;
        for (const p of PHOTO_POINTERS) {
          const photo = photos[p.key];
          if (photo) {
            const { error: upErr } = await uploadDelightPhoto(data.id, p.key, photo.file, photo.timestamp);
            if (!upErr) uploadCount++;
          }
        }
        // Auto-complete if all 7 photos uploaded
        if (uploadCount === PHOTO_POINTERS.length) {
          await getServiceSupabase().from('guest_delights').update({ status: 'completed' }).eq('id', data.id);
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
          <div><div style={{ fontSize: 16, fontWeight: 700 }}>Log butler activity</div><div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>Booking details + photo evidence</div></div>
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
              {([['your_name','Your name *','text','e.g. Ravi Kumar',true],['squad','Your squad *','text','e.g. Lonavala',true],['booking_date','Booking date *','date','',true],['booking_id','Booking ID','text','BK-2026-04821',false]] as any[]).map(([key,label,type,ph,req]) => (
                <div key={key}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>{label}</div>
                  <input className="sv-input" style={{ width: '100%' }} type={type} placeholder={ph} value={(form as any)[key]} onChange={f(key)} required={req} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Booking type *</div>
                {/* Villa search dropdown */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 5 }}>Villa name *</label>
                  <DelightVillaSearch value={form.villa_name} onChange={v => setForm(f => ({ ...f, villa_name: v }))} squad={form.squad} />
                </div>
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

// ── Photo review modal (admin/supervisor) ────────────────────
function PhotoReviewModal({ entry, onClose, onApprove }: { entry: GuestDelight; onClose: () => void; onApprove: () => void }) {
  const photos = entry.delight_photos ?? [];
  const sb = getServiceSupabase();

  async function handleApprove() {
    await sb.from('guest_delights').update({ status: 'completed' }).eq('id', entry.id);
    onApprove();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 720, boxShadow: '0 32px 80px rgba(0,0,0,0.3)', marginTop: 20, marginBottom: 20 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Photo review — {entry.your_name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>
              {entry.villa_name} · {entry.booking_type} · {entry.booking_date ? new Date(entry.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 20 }} />

        {/* Booking info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Butler', value: entry.your_name },
            { label: 'Squad', value: entry.squad ?? '—' },
            { label: 'Booking ID', value: entry.booking_id ?? '—' },
            { label: 'Villa', value: entry.villa_name },
            { label: 'Type', value: entry.booking_type },
            { label: 'Status', value: getStatusLabel(entry.status) },
          ].map(f => (
            <div key={f.label} style={{ background: 'var(--muted)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{f.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{f.value}</div>
            </div>
          ))}
        </div>

        {/* Photos */}
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted-fg)' }}>
          Photo evidence — {photos.length}/{PHOTO_POINTERS.length} uploaded
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {PHOTO_POINTERS.map(ptr => {
            const photo = photos.find(p => p.pointer_key === ptr.key);
            const url = photo?.public_url 
              ?? (photo?.storage_path 
                ? `https://ryuxwnbrdsjwzwdimynd.supabase.co/storage/v1/object/public/delight-photos/${photo.storage_path}`
                : null);
            return (
              <div key={ptr.key} style={{ borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${photo ? '#97C459' : 'rgba(0,0,0,0.08)'}`, background: photo ? '#fff' : 'var(--muted)' }}>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={ptr.label} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                  </a>
                ) : (
                  <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 28, opacity: 0.3 }}>{ptr.emoji}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted-fg)' }}>Not uploaded</span>
                  </div>
                )}
                <div style={{ padding: '8px 10px', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {photo ? '✅' : '⭕'} {ptr.label}
                  </div>
                  {photo && <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 2 }}>
                    {photo.captured_at ? new Date(photo.captured_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                  </div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
          <button className="sv-btn" onClick={onClose}>Close</button>
          {entry.status !== 'completed' && (
            <button className="sv-btn sv-btn-primary" onClick={handleApprove}>
              ✓ Mark as completed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────

// ── Villa Search for Delight ─────────────────────────────────
function DelightVillaSearch({ value, onChange, squad }: { value: string; onChange: (v: string) => void; squad: string }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const results = query.length > 0
    ? PROPERTIES.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : PROPERTIES.filter(p => !squad || p.squad === squad).slice(0, 10);
  return (
    <div style={{ position: 'relative' }}>
      <input className="sv-input" style={{ width: '100%' }} placeholder="Search villa name…" value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 180)} />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.12)', maxHeight: 180, overflowY: 'auto', marginTop: 2 }}>
          {results.map(p => (
            <div key={p.id} onMouseDown={() => { setQuery(p.name); onChange(p.name); setOpen(false); }}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.squad === 'Lonavala' ? '#9CCCFC' : '#97C459', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted-fg)' }}>{p.squad} · {p.kms} km</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DelightPage() {
  const [entries, setEntries] = useState<GuestDelight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [reviewEntry, setReviewEntry] = useState<GuestDelight | null>(null);
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [user, setUser] = useState<AppUser | null>(null);
  const [backing, setBacking] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  async function backupToDrive() {
    setBacking(true); setBackupMsg('');
    try {
      const res = await fetch('/api/drive-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'delight', accessToken: 'via-mcp' }),
      });
      const data = await res.json();
      setBackupMsg(data.message || 'Backup done');
    } catch { setBackupMsg('Backup failed'); }
    setBacking(false);
  }

  async function load() {
    setLoading(true);
    const data = await fetchGuestDelights();
    if (user && user.role === 'butler') {
      setEntries(data.filter(e => e.your_name === user.name));
    } else {
      setEntries(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    let currentUser = null;
    try {
      const stored = localStorage.getItem('sv_local_session');
      if (stored) { currentUser = JSON.parse(stored); setUser(currentUser); }
    } catch {}
    // Pass user directly to load so filter works on first render
    const fetchData = async () => {
      const data = await (await import('@/lib/supabase')).fetchGuestDelights();
      if (currentUser && currentUser.role === 'butler') {
        setEntries(data.filter((e: any) => e.your_name === currentUser.name));
      } else {
        setEntries(data);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Realtime polling every 30s (replaces broken Supabase realtime subscription)
  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const isAdminOrSupervisor = user && isSupervisor(user.role);
  const filtered = entries.filter(e =>
    (filterType === 'All' || e.booking_type === filterType) &&
    (filterStatus === 'All' || e.status === filterStatus)
  );
  const done = entries.filter(e => e.status === 'completed').length;
  const pending = entries.filter(e => e.status === 'pending').length;
  const pct = entries.length > 0 ? Math.round(done / entries.length * 100) : 0;

  return (
    <>
      {showModal && <AddDelightModal user={user} onClose={() => setShowModal(false)} onSaved={load} />}
      {reviewEntry && <PhotoReviewModal entry={reviewEntry} onClose={() => setReviewEntry(null)} onApprove={load} />}

      <Topbar title="Guest delight" subtitle="Photo evidence per booking"
        actions={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {isAdminOrSupervisor && (
              <a href="https://drive.google.com/drive/folders/1ExnORyWbMXz9rGKA7vX7tECCVRizqMp_" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <button className="sv-btn" style={{ fontSize: 12 }}>📁 Drive backup</button>
              </a>
            )}
            <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowModal(true)}>+ Log activity</button>
          </div>
        }
      />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[{ label: 'Total', value: entries.length, cls: 'blue' }, { label: 'Completed', value: done, cls: 'green' }, { label: 'Pending', value: pending, cls: 'coral' }, { label: 'Completion', value: `${pct}%`, cls: 'peach' }].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        {/* Photo pointers guide */}
        <div className="sv-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Photo pointers — required per booking</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {PHOTO_POINTERS.map(p => (
              <div key={p.key} style={{ background: 'var(--muted)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{p.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>{p.label}</div>
                {p.note && <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 3 }}>{p.note}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Activity log */}
        <div className="sv-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              Activity log <span className="badge badge-green" style={{ marginLeft: 6 }}>Live</span>
              {isAdminOrSupervisor && <span style={{ fontSize: 12, color: 'var(--muted-fg)', marginLeft: 8, fontWeight: 400 }}>Click any row to review photos</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="sv-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="All">All types</option>
                {BOOKING_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <select className="sv-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="All">All statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
              <button className="sv-btn" style={{ fontSize: 12 }} onClick={load}>↻ Refresh</button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-fg)' }}>
              No entries yet. Click <strong>+ Log activity</strong> to add the first one.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead>
                  <tr>
                    <th>Butler</th><th>Squad</th><th>Date</th><th>Booking ID</th>
                    <th>Villa</th><th>Type</th><th>Photos</th><th>Status</th>
                    {isAdminOrSupervisor && <th>Review</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const photoCount = e.delight_photos?.length ?? 0;
                    const allUploaded = photoCount === PHOTO_POINTERS.length;
                    return (
                      <tr key={e.id} style={{ cursor: isAdminOrSupervisor ? 'pointer' : 'default' }}
                        onClick={() => isAdminOrSupervisor && setReviewEntry(e)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="sv-avatar">{e.your_name.slice(0, 2).toUpperCase()}</div>
                            <span style={{ fontWeight: 500 }}>{e.your_name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--muted-fg)' }}>{e.squad ?? '—'}</td>
                        <td style={{ color: 'var(--muted-fg)' }}>
                          {e.booking_date ? new Date(e.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.booking_id ?? '—'}</td>
                        <td style={{ fontWeight: 500 }}>{e.villa_name}</td>
                        <td><span className="badge badge-blue">{e.booking_type}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: allUploaded ? '#2D5A0E' : photoCount > 0 ? '#7A4A08' : 'var(--muted-fg)' }}>
                              📷 {photoCount}/{PHOTO_POINTERS.length}
                            </span>
                            {allUploaded && <span className="badge badge-green">Complete</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span className={getStatusBadge(e.status)}>{getStatusLabel(e.status)}</span>
                            {photoCount > 0 && (
                              <button className="sv-btn" style={{ fontSize: 10, padding: '3px 8px' }}
                                onClick={ev => { ev.stopPropagation(); setReviewEntry(e); }}>
                                🖼 View
                              </button>
                            )}
                            {photoCount > 0 && (
                              <button className="sv-btn" style={{ fontSize: 10, padding: '3px 8px' }}
                                onClick={ev => {
                                  ev.stopPropagation();
                                  const photos = e.delight_photos ?? [];
                                  photos.forEach((p, i) => {
                                    if (p.public_url) {
                                      const a = document.createElement('a');
                                      a.href = p.public_url;
                                      a.download = `${e.your_name}_${e.villa_name}_${p.pointer_key}.jpg`;
                                      a.target = '_blank';
                                      a.click();
                                    }
                                  });
                                }}>
                                ⬇ Photos
                              </button>
                            )}
                          </div>
                        </td>
                        {isAdminOrSupervisor && (
                          <td onClick={ev => { ev.stopPropagation(); setReviewEntry(e); }}>
                            <button className="sv-btn" style={{ fontSize: 11, padding: '4px 10px' }}>
                              {photoCount > 0 ? '🔍 Review' : '📋 View'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
