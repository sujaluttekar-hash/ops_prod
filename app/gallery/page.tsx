'use client';
import { useState, useEffect, useRef } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getServiceSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const CAT_MAP: Record<string, { emoji: string; label: string }> = {
  arrival_selfie: { emoji: '🤳', label: 'Arrival selfie' },
  guest_welcome:  { emoji: '🙏', label: 'Guest welcome' },
  table_layout:   { emoji: '🍽', label: 'Table layout' },
  guest_delight:  { emoji: '🎁', label: 'Guest delight' },
  exit_selfie:    { emoji: '👋', label: 'Exit selfie' },
  experience:     { emoji: '✨', label: 'Experiences' },
  feedback:       { emoji: '⭐', label: 'Feedback' },
};

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  approved: { label: '✅ Approved', bg: 'rgba(151,196,89,0.15)', color: '#2D5A0E' },
  declined: { label: '❌ Redo',     bg: 'rgba(233,160,167,0.15)', color: '#8B2020' },
  pending:  { label: '🕐 Pending',  bg: 'rgba(254,213,169,0.2)',  color: '#7A4A08' },
};

export default function GalleryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isSuper = user ? isSupervisor(user.role as any) : false;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all');
  const [catFilter, setCatFilter] = useState('all');
  const [entries, setEntries] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<any | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  useEffect(() => {
    if (!isSuper) { router.push('/dashboard'); return; }
    load();
  }, [isSuper]);

  async function load() {
    setLoading(true);
    const sb = getServiceSupabase();
    const [dR, pR] = await Promise.all([
      sb.from('guest_delights').select('id,your_name,villa_name,booking_id,booking_date,booking_type,squad,status,created_at').order('created_at', { ascending: false }),
      sb.from('delight_photos').select('*'),
    ]);
    setEntries(dR.data || []);
    setPhotos(pR.data || []);
    setLoading(false);
  }

  async function handlePhotoAction(photoId: string, action: 'approved' | 'declined') {
    await getServiceSupabase().from('delight_photos').update({ photo_status: action }).eq('id', photoId);
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, photo_status: action } : p));
  }

  // Build flat photo list with entry context
  const allPhotosWithContext = photos.map(p => {
    const entry = entries.find(e => e.id === p.delight_id);
    if (!entry) return null;
    const cat = CAT_MAP[p.pointer_key] || { emoji: '📷', label: p.pointer_key };
    return { ...p, entry, cat };
  }).filter(Boolean) as any[];

  // Search + filter
  const q = search.toLowerCase().trim();
  const filtered = allPhotosWithContext.filter(p => {
    if (filter !== 'all' && (p.photo_status || 'pending') !== filter) return false;
    if (catFilter !== 'all' && p.pointer_key !== catFilter) return false;
    if (!q) return true;
    return (
      p.entry.your_name?.toLowerCase().includes(q) ||
      p.entry.booking_id?.toLowerCase().includes(q) ||
      p.entry.villa_name?.toLowerCase().includes(q) ||
      p.cat.label.toLowerCase().includes(q)
    );
  });

  // Group by delight entry for display
  const grouped = filtered.reduce((acc: Record<string, any[]>, p) => {
    const key = p.delight_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped);

  // Lightbox navigation
  const flatForLightbox = filtered;
  function openLightbox(photo: any) {
    const idx = flatForLightbox.findIndex(p => p.id === photo.id);
    setLightboxIdx(idx);
    setLightbox(photo);
  }
  function navLightbox(dir: 1 | -1) {
    const newIdx = Math.max(0, Math.min(flatForLightbox.length - 1, lightboxIdx + dir));
    setLightboxIdx(newIdx);
    setLightbox(flatForLightbox[newIdx]);
  }

  const pendingCount   = allPhotosWithContext.filter(p => (p.photo_status||'pending') === 'pending').length;
  const approvedCount  = allPhotosWithContext.filter(p => p.photo_status === 'approved').length;
  const declinedCount  = allPhotosWithContext.filter(p => p.photo_status === 'declined').length;

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLightbox(null)}>
          {/* Header */}
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(0,0,0,0.6)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{lightbox.cat.emoji} {lightbox.cat.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                {lightbox.entry.your_name} · {lightbox.entry.villa_name} · #{lightbox.entry.booking_id}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {isSuper && (
                <>
                  <button onClick={() => handlePhotoAction(lightbox.id, 'approved')}
                    style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(151,196,89,0.2)', color: '#97C459', cursor: 'pointer', fontWeight: 600 }}>
                    ✅ Approve
                  </button>
                  <button onClick={() => handlePhotoAction(lightbox.id, 'declined')}
                    style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(233,160,167,0.2)', color: '#E9A0A7', cursor: 'pointer', fontWeight: 600 }}>
                    ❌ Redo
                  </button>
                </>
              )}
              <button onClick={() => setLightbox(null)}
                style={{ fontSize: 22, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
          </div>

          {/* Photo */}
          <img onClick={e => e.stopPropagation()} src={lightbox.public_url}
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }} />

          {/* Status badge */}
          <div onClick={e => e.stopPropagation()} style={{ marginTop: 12 }}>
            {(() => { const s = STATUS_STYLE[lightbox.photo_status || 'pending']; return (
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
            ); })()}
          </div>

          {/* Nav arrows */}
          {lightboxIdx > 0 && (
            <button onClick={e => { e.stopPropagation(); navLightbox(-1); }}
              style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 28, width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          )}
          {lightboxIdx < flatForLightbox.length - 1 && (
            <button onClick={e => { e.stopPropagation(); navLightbox(1); }}
              style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 28, width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          )}

          {/* Counter */}
          <div style={{ position: 'absolute', bottom: 20, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {lightboxIdx + 1} / {flatForLightbox.length}
          </div>
        </div>
      )}

      <Topbar title="Photo gallery" subtitle={`${allPhotosWithContext.length} photos · ${approvedCount} approved · ${declinedCount} need redo`} />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Summary pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {([
            { key: 'all',      label: `All (${allPhotosWithContext.length})` },
            { key: 'pending',  label: `🕐 Pending (${pendingCount})` },
            { key: 'approved', label: `✅ Approved (${approvedCount})` },
            { key: 'declined', label: `❌ Redo (${declinedCount})` },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${filter === t.key ? '#1B1D1F' : 'rgba(0,0,0,0.1)'}`, background: filter === t.key ? '#1B1D1F' : '#fff', color: filter === t.key ? '#fff' : 'var(--sv-dark)', cursor: 'pointer', fontWeight: filter === t.key ? 700 : 400 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search + category filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <input className="sv-input" style={{ flex: 1, minWidth: 200 }}
            placeholder="Search by butler name, booking ID or villa…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="sv-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}
            style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff' }}>
            <option value="all">All categories</option>
            {Object.entries(CAT_MAP).map(([key, { emoji, label }]) => (
              <option key={key} value={key}>{emoji} {label}</option>
            ))}
          </select>
        </div>

        {/* Photo grid grouped by entry */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading photos…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sv-dark)' }}>No photos found</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 4 }}>Try a different search or filter</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {groupKeys.map(delightId => {
              const groupPhotos = grouped[delightId];
              const entry = groupPhotos[0].entry;
              return (
                <div key={delightId} className="sv-card">
                  {/* Entry header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>🏡 {entry.villa_name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>
                        {entry.your_name} · {entry.squad || '—'} · {entry.booking_type || '—'} · {entry.booking_date || '—'}
                        {entry.booking_id && <span style={{ marginLeft: 6, fontWeight: 700, color: '#0C447C' }}>#{entry.booking_id}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{groupPhotos.length} photo{groupPhotos.length !== 1 ? 's' : ''}</div>
                  </div>

                  {/* Photo grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                    {groupPhotos.map((p: any) => {
                      const ss = STATUS_STYLE[p.photo_status || 'pending'];
                      return (
                        <div key={p.id} style={{ borderRadius: 10, overflow: 'hidden', border: `2px solid ${p.photo_status === 'approved' ? '#97C459' : p.photo_status === 'declined' ? '#E9A0A7' : 'rgba(0,0,0,0.08)'}`, cursor: 'pointer', position: 'relative' }}
                          onClick={() => openLightbox(p)}>
                          <img src={p.public_url} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                          {/* Category label */}
                          <div style={{ padding: '8px 10px', background: '#fff' }}>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>{p.cat.emoji} {p.cat.label}</div>
                            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: ss.bg, color: ss.color }}>{ss.label}</span>
                              {isSuper && (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button onClick={e => { e.stopPropagation(); handlePhotoAction(p.id, 'approved'); }}
                                    style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, border: 'none', background: 'rgba(151,196,89,0.15)', color: '#2D5A0E', cursor: 'pointer' }}>✅</button>
                                  <button onClick={e => { e.stopPropagation(); handlePhotoAction(p.id, 'declined'); }}
                                    style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, border: 'none', background: 'rgba(233,160,167,0.15)', color: '#8B2020', cursor: 'pointer' }}>❌</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
