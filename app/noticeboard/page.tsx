'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getServiceSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';

// ── Types ─────────────────────────────────────────────────────
type Notice = {
  id: string;
  title: string;
  body: string;
  category: 'announcement' | 'sop' | 'villa' | 'urgent' | 'reminder';
  squad: string | null;
  pinned: boolean;
  created_by: string;
  created_at: string;
  acknowledged_by: string[];
};

const CATEGORY_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  urgent:       { label: 'Urgent',       bg: 'rgba(233,160,167,0.15)', color: '#8B2020', icon: '🚨' },
  announcement: { label: 'Announcement', bg: 'rgba(156,204,252,0.12)', color: '#0C447C', icon: '📢' },
  sop:          { label: 'SOP Update',   bg: 'rgba(254,213,169,0.15)', color: '#7A4A08', icon: '📋' },
  villa:        { label: 'Villa Info',   bg: 'rgba(151,196,89,0.12)',  color: '#2D5A0E', icon: '🏡' },
  reminder:     { label: 'Reminder',     bg: 'rgba(196,181,253,0.15)', color: '#4C1D95', icon: '🔔' },
};

// ── Post Notice Modal ─────────────────────────────────────────
function PostModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', body: '', category: 'announcement', squad: 'All', pinned: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSave() {
    if (!form.title.trim() || !form.body.trim()) { setError('Title and message are required.'); return; }
    setSaving(true); setError('');
    const sb = getServiceSupabase();
    const { error: err } = await sb.from('noticeboard').insert({
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      squad: form.squad === 'All' ? null : form.squad,
      pinned: form.pinned,
      created_by: user?.name || 'Admin',
      acknowledged_by: [],
    });
    if (err) { setError(err.message); setSaving(false); return; }

    // Notify all butlers (or squad-specific)
    const { data: butlers } = await sb.from('profiles').select('id')
      .eq('role', 'butler').eq('is_active', true);
    if (butlers && butlers.length > 0) {
      await sb.from('notifications').insert(
        butlers.map((b: any) => ({
          user_id: b.id,
          title: `${CATEGORY_META[form.category]?.icon} ${form.title}`,
          body: form.body.slice(0, 100),
          type: 'task', read: false,
        }))
      ).catch(() => {});
    }
    onSaved(); onClose();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Post to noticeboard</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 18 }} />
        {error && <div style={{ background: 'rgba(233,160,167,0.12)', border: '1px solid #E9A0A7', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Title *</div>
          <input className="sv-input" style={{ width: '100%' }} placeholder="e.g. New check-in SOP for Lonavala villas" value={form.title} onChange={f('title')} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Message *</div>
          <textarea className="sv-input" rows={4} style={{ width: '100%', resize: 'vertical' }} placeholder="Write the full notice here…" value={form.body} onChange={f('body')} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Category</div>
            <select className="sv-select" style={{ width: '100%' }} value={form.category} onChange={f('category')}>
              {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Squad</div>
            <select className="sv-select" style={{ width: '100%' }} value={form.squad} onChange={f('squad')}>
              {['All', 'Lonavala', 'Karjat', 'Nashik', 'Alibaug', 'Pune'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.pinned} onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))} style={{ width: 18, height: 18, accentColor: '#1B1D1F' }} />
          <span style={{ fontSize: 13 }}>📌 Pin to top — shown first to all butlers</span>
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sv-btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="sv-btn sv-btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
            {saving ? 'Posting…' : '📢 Post notice'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function NoticeboardPage() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPost, setShowPost] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const isSuper = user ? isSupervisor(user.role as any) : false;

  async function load() {
    setLoading(true);
    const sb = getServiceSupabase();
    let q = sb.from('noticeboard').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
    const { data } = await q;
    setNotices((data || []) as Notice[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function acknowledge(noticeId: string) {
    if (!user) return;
    const notice = notices.find(n => n.id === noticeId);
    if (!notice) return;
    const already = notice.acknowledged_by?.includes(user.id);
    if (already) return;
    const newList = [...(notice.acknowledged_by || []), user.id];
    await getServiceSupabase().from('noticeboard').update({ acknowledged_by: newList }).eq('id', noticeId);
    setNotices(ns => ns.map(n => n.id === noticeId ? { ...n, acknowledged_by: newList } : n));
  }

  async function deleteNotice(id: string) {
    setDeleting(id);
    await getServiceSupabase().from('noticeboard').delete().eq('id', id);
    setNotices(ns => ns.filter(n => n.id !== id));
    setDeleting(null);
  }

  async function togglePin(notice: Notice) {
    await getServiceSupabase().from('noticeboard').update({ pinned: !notice.pinned }).eq('id', notice.id);
    load();
  }

  const filtered = notices.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.acknowledged_by?.includes(user?.id || '');
    return n.category === filter;
  });

  const unreadCount = notices.filter(n => !n.acknowledged_by?.includes(user?.id || '')).length;

  function timeAgo(t: string) {
    const diff = Date.now() - new Date(t).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <>
      {showPost && <PostModal onClose={() => setShowPost(false)} onSaved={load} />}
      <Topbar title="Noticeboard" subtitle="Team announcements, SOPs, villa updates"
        actions={isSuper ? (
          <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowPost(true)}>
            📢 Post notice
          </button>
        ) : undefined}
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { key: 'all', label: `All (${notices.length})` },
            { key: 'unread', label: `🔴 Unread (${unreadCount})` },
            { key: 'urgent', label: '🚨 Urgent' },
            { key: 'sop', label: '📋 SOPs' },
            { key: 'villa', label: '🏡 Villa info' },
            { key: 'announcement', label: '📢 Announcements' },
            { key: 'reminder', label: '🔔 Reminders' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${filter === key ? '#1B1D1F' : 'rgba(0,0,0,0.1)'}`, background: filter === key ? '#1B1D1F' : '#fff', color: filter === key ? '#fff' : 'var(--sv-dark)', cursor: 'pointer', fontWeight: filter === key ? 600 : 400 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Notices */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sv-dark)', marginBottom: 6 }}>No notices here</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)' }}>{isSuper ? 'Post your first notice using the button above.' : 'Check back later for updates from your team.'}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(n => {
              const meta = CATEGORY_META[n.category] || CATEGORY_META.announcement;
              const isRead = n.acknowledged_by?.includes(user?.id || '');
              const ackCount = n.acknowledged_by?.length || 0;
              return (
                <div key={n.id} className="sv-card" style={{ borderLeft: `4px solid ${meta.color}`, opacity: isRead && !isSuper ? 0.75 : 1, position: 'relative' }}>
                  {n.pinned && (
                    <div style={{ position: 'absolute', top: 12, right: isSuper ? 100 : 16, fontSize: 11, fontWeight: 600, color: '#7A4A08', background: 'rgba(254,213,169,0.3)', padding: '2px 8px', borderRadius: 20 }}>
                      📌 Pinned
                    </div>
                  )}

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{meta.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sv-dark)' }}>{n.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: meta.bg, color: meta.color }}>{meta.label}</span>
                        {!isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E9A0A7', display: 'inline-block' }} />}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>
                        Posted by {n.created_by} · {timeAgo(n.created_at)}
                        {n.squad && <span style={{ marginLeft: 6 }}>· {n.squad} squad</span>}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ fontSize: 13, color: 'var(--sv-dark)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 14, paddingLeft: 48 }}>
                    {n.body}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 48, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>
                      {ackCount > 0 ? `✅ ${ackCount} acknowledged` : 'No acknowledgements yet'}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {isSuper && (
                        <>
                          <button onClick={() => togglePin(n)} className="sv-btn" style={{ fontSize: 11, padding: '3px 8px' }}>
                            {n.pinned ? '📌 Unpin' : '📌 Pin'}
                          </button>
                          <button onClick={() => deleteNotice(n.id)} className="sv-btn" style={{ fontSize: 11, padding: '3px 8px', color: '#8B2020', borderColor: '#E9A0A7' }} disabled={deleting === n.id}>
                            {deleting === n.id ? '…' : '🗑 Delete'}
                          </button>
                        </>
                      )}
                      {!isSuper && !isRead && (
                        <button onClick={() => acknowledge(n.id)} className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '5px 14px' }}>
                          ✅ I've read this
                        </button>
                      )}
                      {!isSuper && isRead && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#2D5A0E' }}>✅ Acknowledged</span>
                      )}
                    </div>
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
