'use client';
import { useState, useEffect, useRef } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getServiceSupabase, BUCKETS } from '@/lib/supabase';
import { PROPERTIES } from '@/lib/properties-data';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';

// ── Categories ────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'arrival_selfie', emoji: '🤳', label: 'Arrival selfie',  note: 'With timestamp', subtypes: [] },
  { key: 'guest_welcome',  emoji: '🙏', label: 'Guest welcome',   note: '',               subtypes: [] },
  { key: 'table_layout',   emoji: '🍽', label: 'Table layout',    note: 'Meal type',      subtypes: ['Breakfast','Lunch','Dinner','Hi-tea','Cocktails'] },
  { key: 'guest_delight',  emoji: '🎁', label: 'Guest delight',   note: 'Low / zero cost',subtypes: ['Room decor','Welcome note','Fresh flowers','Fruit basket','Other'] },
  { key: 'exit_selfie',    emoji: '👋', label: 'Exit selfie',     note: 'With timestamp', subtypes: [] },
  { key: 'experience',     emoji: '✨', label: 'Experiences',     note: 'Special moments',subtypes: ['Sit-down dinner','BBQ / bonfire','Birthday decor','Anniversary','Picnic setup','Other'] },
  { key: 'feedback',       emoji: '⭐', label: 'Feedback',        note: '5★ / 7★',        subtypes: ['5 star','7 star'] },
];

const BOOKING_TYPES = ['Check in','Check out','Booking (full day)','Non Booking Task'];
type PhotoVal = { file: File; preview: string; timestamp: string } | null;

// ── Villa search ──────────────────────────────────────────────
function VillaSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState(value);
  const [open, setOpen] = useState(false);
  const results = q.length > 0 ? PROPERTIES.filter((p: any) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 10) : [];
  return (
    <div style={{ position: 'relative' }}>
      <input className="sv-input" style={{ width: '100%' }} placeholder="Search villa…" value={q}
        onChange={e => { setQ(e.target.value); onChange(''); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 180)} />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
          {results.map((p: any) => (
            <div key={p.id} onMouseDown={() => { setQ(p.name); onChange(p.name); setOpen(false); }}
              style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '0.5px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.squad === 'Lonavala' ? '#9CCCFC' : '#97C459', flexShrink: 0 }} />
              <div><div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 10, color: 'var(--muted-fg)' }}>{p.squad}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Category card in modal ────────────────────────────────────
function CategoryCard({ cat, photo, existingPhoto, subtypes, onPhoto, onSubtype }: { cat: typeof CATEGORIES[0]; photo: PhotoVal; existingPhoto?: any; subtypes: string[]; onPhoto: (v: PhotoVal) => void; onSubtype: (s: string) => void }) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const hasNewPhoto = !!photo;
  const hasExistingPhoto = !!existingPhoto?.public_url && !photo; // show existing only if no new photo selected
  const hasPhoto = hasNewPhoto || hasExistingPhoto;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    onPhoto({ file: f, preview: URL.createObjectURL(f), timestamp: new Date().toISOString() });
    e.target.value = '';
  }

  return (
    <div style={{ borderRadius: 12, border: `1.5px solid ${hasPhoto ? '#97C459' : 'rgba(0,0,0,0.08)'}`, padding: 14, background: hasPhoto ? 'rgba(151,196,89,0.04)' : '#fff', transition: 'all 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: cat.subtypes.length > 0 || hasPhoto ? 10 : 0 }}>
        <span style={{ fontSize: 22, lineHeight: 1.3 }}>{cat.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sv-dark)' }}>{cat.label}</div>
          {cat.note && <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 1 }}>{cat.note}</div>}
        </div>
        {hasPhoto && <span style={{ fontSize: 16 }}>✅</span>}
      </div>

      {/* Subtypes */}
      {cat.subtypes.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {cat.subtypes.map(s => (
            <button key={s} type="button" onClick={() => onSubtype(s)}
              style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 20, border: `1.5px solid ${subtypes.includes(s) ? '#9CCCFC' : 'rgba(0,0,0,0.1)'}`, background: subtypes.includes(s) ? 'rgba(156,204,252,0.15)' : 'white', color: subtypes.includes(s) ? '#0C447C' : 'var(--muted-fg)', cursor: 'pointer', fontWeight: subtypes.includes(s) ? 700 : 400 }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Photo preview — show new upload OR existing from DB */}
      {hasNewPhoto && (
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <img src={photo!.preview} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #97C459' }} />
          <button type="button" onClick={() => onPhoto(null)} style={{ position: 'absolute', top: 6, right: 6, background: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>✕</button>
          <div style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 9, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>
            {new Date(photo!.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{ position: 'absolute', top: 6, left: 8, fontSize: 9, color: '#fff', background: 'rgba(151,196,89,0.9)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>New</div>
        </div>
      )}
      {hasExistingPhoto && (
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <img src={existingPhoto.public_url} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #97C459' }} />
          <div style={{ position: 'absolute', top: 6, left: 8, fontSize: 9, color: '#fff', background: 'rgba(45,90,14,0.85)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>✅ Uploaded</div>
          <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 9, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>Tap Camera/Gallery to replace</div>
        </div>
      )}

      {/* Upload buttons */}
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
      <input ref={galRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={() => camRef.current?.click()} className="sv-btn" style={{ flex: 1, fontSize: 11, padding: '5px 0' }}>📷 {hasExistingPhoto ? 'Replace' : hasNewPhoto ? 'Retake' : 'Camera'}</button>
        <button type="button" onClick={() => galRef.current?.click()} className="sv-btn" style={{ flex: 1, fontSize: 11, padding: '5px 0' }}>🖼 Gallery</button>
      </div>
    </div>
  );
}

// ── Log / Edit Modal ──────────────────────────────────────────
function LogModal({ editEntry, onClose, onSaved, defaultUser }: { editEntry?: any; onClose: () => void; onSaved: () => void; defaultUser: any }) {
  const isEdit = !!editEntry;
  const [form, setForm] = useState({
    your_name: editEntry?.your_name || defaultUser?.name || '',
    squad: editEntry?.squad || defaultUser?.squad || '',
    booking_date: editEntry?.booking_date || '',
    booking_id: editEntry?.booking_id || '',
    villa_name: editEntry?.villa_name || '',
    booking_type: editEntry?.booking_type || '',
  });
  const [photos, setPhotos] = useState<Record<string, PhotoVal>>(Object.fromEntries(CATEGORIES.map(c => [c.key, null])));
  const [subtypes, setSubtypes] = useState<Record<string, string[]>>(Object.fromEntries(CATEGORIES.map(c => [c.key, []])));
  // Existing photos from DB (for edit mode) — keyed by pointer_key
  const existingPhotos: Record<string, any> = Object.fromEntries(
    (editEntry?.delight_photos || []).map((p: any) => [p.pointer_key, p])
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  function toggleSubtype(catKey: string, s: string) {
    setSubtypes(prev => {
      const cur = prev[catKey] || [];
      return { ...prev, [catKey]: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] };
    });
  }

  const uploadedCount = CATEGORIES.filter(cat => photos[cat.key] || existingPhotos[cat.key]).length;

  async function handleSave() {
    if (!form.villa_name) { setError('Please select a villa'); return; }
    if (!form.booking_date) { setError('Please set a booking date'); return; }
    if (uploadedCount === 0 && !isEdit) { setError('Please upload at least one photo'); return; }
    setSaving(true); setError('');
    const sb = getServiceSupabase();

    try {
      let entryId = editEntry?.id;

      if (!isEdit) {
        // Create new entry
        const { data, error: insertErr } = await sb.from('guest_delights').insert({
          your_name: form.your_name, squad: form.squad, booking_date: form.booking_date,
          booking_id: form.booking_id || null, villa_name: form.villa_name,
          booking_type: form.booking_type, status: 'pending',
        }).select().single();
        if (insertErr) throw new Error(insertErr.message);
        entryId = data.id;
      }

      // Upload new photos
      for (const cat of CATEGORIES) {
        const p = photos[cat.key];
        if (!p) continue;
        const path = `${entryId}/${cat.key}_${Date.now()}.jpg`;
        const { data: upData } = await sb.storage.from('delight-photos').upload(path, p.file, { upsert: true });
        if (upData) {
          const { data: { publicUrl } } = sb.storage.from('delight-photos').getPublicUrl(upData.path);
          // Delete existing photo for this category then insert fresh (avoids upsert constraint issues)
          await sb.from('delight_photos').delete().eq('delight_id', entryId).eq('pointer_key', cat.key);
          const { error: insErr } = await sb.from('delight_photos').insert({
            delight_id: entryId,
            pointer_key: cat.key,
            storage_path: path,
            public_url: publicUrl,
          });
          if (insErr) {
            console.error('Photo save error:', insErr.message);
          }
        }
      }

      // If editing, update form fields too
      if (isEdit) {
        await sb.from('guest_delights').update({
          your_name: form.your_name, squad: form.squad, booking_date: form.booking_date,
          booking_id: form.booking_id || null, villa_name: form.villa_name,
          booking_type: form.booking_type,
        }).eq('id', entryId);
      }

      onSaved(); onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isEdit ? '✏️ Edit delight' : '🎁 Log guest delight'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 18 }} />

        {error && <div style={{ background: 'rgba(233,160,167,0.15)', border: '1px solid #E9A0A7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}

        {/* Form fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Your name *</div>
            <input className="sv-input" style={{ width: '100%' }} value={form.your_name} onChange={f('your_name')} placeholder="Your name" />
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Squad</div>
            <select className="sv-select" style={{ width: '100%' }} value={form.squad} onChange={f('squad')}>
              <option value="">Select…</option>
              {['Lonavala','Karjat','Nashik','Alibaug'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Villa *</div>
          <VillaSearch value={form.villa_name} onChange={v => setForm(p => ({ ...p, villa_name: v }))} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Booking date *</div>
            <input type="date" className="sv-input" style={{ width: '100%' }} value={form.booking_date} onChange={f('booking_date')} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Booking type</div>
            <select className="sv-select" style={{ width: '100%' }} value={form.booking_type} onChange={f('booking_type')}>
              <option value="">Select…</option>
              {BOOKING_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* 7 category cards */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
          Photo categories · {uploadedCount}/{CATEGORIES.length} uploaded
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {CATEGORIES.map(cat => (
            <CategoryCard key={cat.key} cat={cat} photo={photos[cat.key]}
              existingPhoto={existingPhotos[cat.key]}
              subtypes={subtypes[cat.key] || []}
              onPhoto={v => setPhotos(prev => ({ ...prev, [cat.key]: v }))}
              onSubtype={s => toggleSubtype(cat.key, s)}
            />
          ))}
        </div>

        {!isEdit && (
          <div style={{ background: 'rgba(156,204,252,0.1)', border: '1px solid #9CCCFC', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#0C447C', marginBottom: 14 }}>
            💡 You can submit now with just one photo and add the rest later by editing this entry.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sv-btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="sv-btn sv-btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
            {saving ? 'Saving…' : isEdit ? '✓ Save changes' : `Submit (${uploadedCount} photo${uploadedCount !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────
function EntryCard({ entry, onEdit, onAcknowledge, onUnacknowledge, canAcknowledge, currentUserId }: { entry: any; onEdit: () => void; onAcknowledge: () => void; onUnacknowledge: () => void; canAcknowledge: boolean; currentUserId: string }) {
  const [expanded, setExpanded] = useState(false);
  const acks = entry.acknowledged_by || [];
  const hasAcked = acks.includes(currentUserId);
  const ackCount = acks.length;
  const isCompleted = entry.status === 'completed';
  const photos = entry.delight_photos || [];

  const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
    in_progress: { label: 'In progress', bg: 'rgba(254,213,169,0.2)',  color: '#7A4A08' },
    pending:     { label: 'In progress', bg: 'rgba(254,213,169,0.2)',  color: '#7A4A08' },
    completed:   { label: 'Completed',   bg: 'rgba(151,196,89,0.12)', color: '#2D5A0E' },
    requests:    { label: 'Request',     bg: 'rgba(156,204,252,0.12)', color: '#0C447C' },
  };
  const sm = STATUS_META[entry.status] || STATUS_META.in_progress;

  return (
    <div className="sv-card" style={{ borderLeft: `3px solid ${isCompleted ? '#97C459' : '#9CCCFC'}` }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>🏡 {entry.villa_name || '—'}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: sm.bg, color: sm.color }}>{sm.label}</span>
            {ackCount > 0 && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(151,196,89,0.12)', color: '#2D5A0E' }}>✅ Acknowledged</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>
            {entry.your_name} · {entry.booking_type || '—'} · {entry.booking_date ? new Date(entry.booking_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {canAcknowledge && !isCompleted && (
!hasAcked ? (
              <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '5px 12px', background: '#0C447C', borderColor: '#0C447C' }} onClick={onAcknowledge}>
                ✅ Acknowledge
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#2D5A0E', padding: '5px 10px', background: 'rgba(151,196,89,0.12)', borderRadius: 8 }}>✅ Acknowledged</span>
                <button className="sv-btn" style={{ fontSize: 10, padding: '4px 8px', color: '#7A4A08', borderColor: '#FED5A9' }} onClick={onUnacknowledge}>↩ Undo</button>
              </div>
            )
          )}
          <button className="sv-btn" style={{ fontSize: 11, padding: '4px 10px' }} onClick={onEdit}>✏️ Edit</button>
          <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setExpanded(v => !v)}>
            {expanded ? '▲' : `📷 ${photos.length}`}
          </button>
        </div>
      </div>

      {/* Photo grid */}
      {expanded && (
        <div style={{ marginTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {CATEGORIES.map(cat => {
              const p = photos.find((ph: any) => ph.pointer_key === cat.key);
              return (
                <div key={cat.key} style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${p ? '#97C459' : 'rgba(0,0,0,0.08)'}`, background: p ? '#fff' : 'var(--muted)' }}>
                  {p ? (
                    <img src={p.public_url} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{cat.emoji}</div>
                  )}
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 10, fontWeight: 600 }}>{cat.emoji} {cat.label}</div>
                    {p?.subtypes?.length > 0 && <div style={{ fontSize: 9, color: 'var(--muted-fg)', marginTop: 1 }}>{Array.isArray(p.subtypes) ? p.subtypes.join(', ') : ''}</div>}
                    {!p && <div style={{ fontSize: 9, color: 'var(--muted-fg)' }}>Not uploaded</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted-fg)' }}>
            {ackCount === 0 ? 'Not acknowledged yet — admin or supervisor can acknowledge' : '✅ Acknowledged'}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function DelightPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<any | null>(null);
  const [tab, setTab] = useState<'all' | 'in_progress' | 'completed' | 'requests'>('all');
  const isSuper = user ? isSupervisor(user.role as any) : false;

  const localUser = (() => { try { return JSON.parse(localStorage.getItem('sv_local_session') || '{}'); } catch { return {}; } })();

  async function load() {
    setLoading(true);
    const sb = getServiceSupabase();
    try {
      // Fetch delights and photos separately — join doesn't work without FK constraint
      let delightQ = sb.from('guest_delights').select('*').order('created_at', { ascending: false });
      if (!isSuper) delightQ = delightQ.eq('your_name', localUser.name || '');
      const { data: delights } = await delightQ;

      const { data: allPhotos } = await sb.from('delight_photos')
        .select('id, delight_id, pointer_key, public_url, storage_path');

      // Merge photos into their delight entries
      const photosMap: Record<string, any[]> = {};
      (allPhotos || []).forEach((p: any) => {
        if (!photosMap[p.delight_id]) photosMap[p.delight_id] = [];
        photosMap[p.delight_id].push(p);
      });

      const merged = (delights || []).map((d: any) => ({
        ...d,
        delight_photos: photosMap[d.id] || [],
      }));

      setEntries(merged);
    } catch (e) {
      console.error('load error:', e);
      setEntries([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function handleAcknowledge(entryId: string) {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    const userId = localUser.id;
    const acks: string[] = entry.acknowledged_by || [];
    if (acks.includes(userId)) return;
    const newAcks = [...acks, userId];
    await getServiceSupabase().from('guest_delights').update({ acknowledged_by: newAcks, status: 'completed' }).eq('id', entryId);
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, acknowledged_by: newAcks, status: 'completed' } : e));
  }

  async function handleUnacknowledge(entryId: string) {
    await getServiceSupabase().from('guest_delights').update({ acknowledged_by: [], status: 'pending' }).eq('id', entryId);
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, acknowledged_by: [], status: 'pending' } : e));
  }

  const filtered = entries.filter(e => {
    if (tab === 'all') return true;
    if (tab === 'requests') return (e.status === 'pending' || e.status === 'in_progress') && (!e.acknowledged_by || e.acknowledged_by.length === 0);
    if (tab === 'in_progress') return e.status === 'pending' || e.status === 'in_progress';
    return e.status === tab;
  });

  const counts = {
    all: entries.length,
    in_progress: entries.filter(e => e.status === 'pending' || e.status === 'in_progress').length,
    completed: entries.filter(e => e.status === 'completed').length,
    requests: entries.filter(e => (e.status === 'pending' || e.status === 'in_progress') && (!e.acknowledged_by || e.acknowledged_by.length === 0)).length,
  };

  return (
    <>
      {(showModal || editEntry) && (
        <LogModal
          editEntry={editEntry || undefined}
          onClose={() => { setShowModal(false); setEditEntry(null); }}
          onSaved={() => { setShowModal(false); setEditEntry(null); load(); }}
          defaultUser={localUser}
        />
      )}

      <Topbar title="Guest delight" subtitle="Log and track villa activities"
        actions={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {isSuper && (
              <a href="https://drive.google.com/drive/folders/1ExnORyWbMXz9rGKA7vX7tECCVRizqMp_" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <button className="sv-btn" style={{ fontSize: 12 }}>📁 Drive</button>
              </a>
            )}
            <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowModal(true)}>+ Log activity</button>
          </div>
        }
      />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Summary cards */}
        {isSuper && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total', val: counts.all, cls: 'blue' },
              { label: 'In progress', val: counts.in_progress, cls: 'peach' },
              { label: 'Completed', val: counts.completed, cls: 'green' },
              { label: 'Requests', val: counts.requests, cls: 'coral' },
            ].map(m => (
              <div key={m.label} className={`metric-card ${m.cls}`}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{loading ? '…' : m.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {([
            { key: 'all',         label: `All (${counts.all})`, show: true },
            { key: 'requests',    label: `🔔 Requests (${counts.requests})`, show: isSuper },
            { key: 'in_progress', label: `⏳ In progress (${counts.in_progress})`, show: true },
            { key: 'completed',   label: `✅ Completed (${counts.completed})`, show: true },
          ] as const).filter(t => t.show).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${tab === t.key ? '#1B1D1F' : 'rgba(0,0,0,0.1)'}`, background: tab === t.key ? '#1B1D1F' : '#fff', color: tab === t.key ? '#fff' : 'var(--sv-dark)', cursor: 'pointer', fontWeight: tab === t.key ? 600 : 400 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Entry list */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎁</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sv-dark)', marginBottom: 4 }}>No entries here</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Tap + Log activity to add a new delight entry.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(entry => (
              <EntryCard key={entry.id} entry={entry}
                onEdit={() => setEditEntry(entry)}
                onAcknowledge={() => handleAcknowledge(entry.id)}
                onUnacknowledge={() => handleUnacknowledge(entry.id)}
                canAcknowledge={isSuper}
                currentUserId={localUser.id || ''}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
