'use client';
import { useState, useEffect, useRef } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getServiceSupabase, LOCAL_PROFILES } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';

const SEVERITY: Record<string, { label: string; bg: string; color: string; border: string }> = {
  critical: { label: 'Critical',  bg: 'rgba(233,  60,  60,0.1)', color: '#8B0000', border: '#E93C3C' },
  high:     { label: 'High',      bg: 'rgba(233,160,167,0.15)', color: '#8B2020', border: '#E9A0A7' },
  medium:   { label: 'Medium',    bg: 'rgba(254,213,169,0.2)',  color: '#7A4A08', border: '#FED5A9' },
  low:      { label: 'Low',       bg: 'rgba(151,196, 89,0.12)', color: '#2D5A0E', border: '#97C459' },
};
const CATEGORIES = ['Property damage','Guest complaint','Appliance failure','Safety hazard','Cleanliness issue','Access problem','Noise complaint','Pest issue','Other'];
const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  open:        { label: 'Open',        bg: 'rgba(233,160,167,0.15)', color: '#8B2020' },
  in_progress: { label: 'In progress', bg: 'rgba(254,213,169,0.2)',  color: '#7A4A08' },
  resolved:    { label: 'Resolved',    bg: 'rgba(151,196, 89,0.12)', color: '#2D5A0E' },
};

// ── Voice recorder hook ──────────────────────────────────────
function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch { alert('Microphone permission denied'); }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function clearRecording() {
    setAudioUrl(null); setAudioBlob(null); setDuration(0);
  }

  return { recording, audioUrl, audioBlob, duration, startRecording, stopRecording, clearRecording };
}

// ── Report Incident Modal ────────────────────────────────────
function ReportModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ villa: '', category: CATEGORIES[0], severity: 'medium', description: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const voice = useVoiceRecorder();
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!form.villa || !form.description) { setError('Villa and description are required'); return; }
    setSaving(true); setError('');
    const sb = getServiceSupabase();
    const stored = typeof window !== 'undefined' ? localStorage.getItem('sv_local_session') : null;
    const u = stored ? JSON.parse(stored) : user;

    // Upload photo if attached
    let photoUrl: string | null = null;
    if (photo) {
      const path = `incidents/${Date.now()}_${photo.name}`;
      const { data, error: upErr } = await sb.storage.from('delight-photos').upload(path, photo, { upsert: true });
      if (!upErr && data) {
        const { data: { publicUrl } } = sb.storage.from('delight-photos').getPublicUrl(data.path);
        photoUrl = publicUrl;
      }
    }

    // Upload voice note if recorded
    let voiceUrl: string | null = null;
    if (voice.audioBlob) {
      const path = `incidents/voice_${Date.now()}.webm`;
      const { data, error: vErr } = await sb.storage.from('delight-photos').upload(path, voice.audioBlob, { upsert: true, contentType: 'audio/webm' });
      if (!vErr && data) {
        const { data: { publicUrl } } = sb.storage.from('delight-photos').getPublicUrl(data.path);
        voiceUrl = publicUrl;
      }
    }

    const { error: err } = await sb.from('incidents').insert({
      villa: form.villa,
      category: form.category,
      severity: form.severity,
      description: form.description,
      reported_by: u?.name || 'Butler',
      reporter_id: u?.id || null,
      squad: u?.squad || null,
      photo_url: photoUrl,
      voice_url: voiceUrl,
      status: 'open',
    });

    if (err) { setError(err.message); setSaving(false); return; }

    // Notify admin
    const { data: admins } = await sb.from('profiles').select('id').in('role', ['super_admin', 'ops_manager']);
    if (admins?.length) {
      await sb.from('notifications').insert(admins.map((a: any) => ({
        user_id: a.id, title: `🆘 Incident at ${form.villa}`,
        body: `${form.category} — ${form.severity.toUpperCase()} — reported by ${u?.name}`,
        type: 'task', read: false,
      }))).catch(() => {});
    }

    onSaved(); onClose();
  }

  const sevStyle = SEVERITY[form.severity];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>🆘 Report incident</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 18 }} />
        {error && <div style={{ background: 'rgba(233,160,167,0.15)', border: '1px solid #E9A0A7', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}

        {/* Villa */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Villa / Location *</div>
          <input className="sv-input" style={{ width: '100%' }} placeholder="e.g. Casa Enchante, Lonavala" value={form.villa} onChange={e => setForm(f => ({ ...f, villa: e.target.value }))} />
        </div>

        {/* Category + Severity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Category</div>
            <select className="sv-select" style={{ width: '100%' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Severity</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.entries(SEVERITY).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setForm(f => ({ ...f, severity: k }))}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: `1.5px solid ${form.severity === k ? v.border : 'rgba(0,0,0,0.1)'}`, background: form.severity === k ? v.bg : 'white', color: form.severity === k ? v.color : 'var(--muted-fg)', fontSize: 9.5, fontWeight: form.severity === k ? 700 : 400, cursor: 'pointer' }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>What happened? *</div>
          <textarea className="sv-input" rows={3} style={{ width: '100%', resize: 'vertical' }} placeholder="Describe the incident clearly…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>

        {/* Voice note */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>🎙 Voice note (optional)</div>
          {!voice.audioUrl ? (
            <button type="button" onMouseDown={voice.startRecording} onMouseUp={voice.stopRecording} onTouchStart={voice.startRecording} onTouchEnd={voice.stopRecording}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${voice.recording ? '#E9A0A7' : 'rgba(0,0,0,0.1)'}`, background: voice.recording ? 'rgba(233,160,167,0.1)' : 'var(--muted)', cursor: 'pointer', width: '100%', fontSize: 13, fontWeight: 500 }}>
              <span style={{ fontSize: 20 }}>{voice.recording ? '⏺' : '🎙'}</span>
              {voice.recording ? `Recording… ${voice.duration}s (release to stop)` : 'Hold to record voice note'}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(151,196,89,0.08)', border: '1px solid #97C459' }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <audio src={voice.audioUrl} controls style={{ flex: 1, height: 32 }} />
              <button type="button" onClick={voice.clearRecording} style={{ background: 'none', border: 'none', color: '#8B2020', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          )}
        </div>

        {/* Photo */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>📷 Photo evidence (optional)</div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
          {!photoPreview ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => { if (fileRef.current) { fileRef.current.setAttribute('capture','environment'); fileRef.current.click(); } }} className="sv-btn" style={{ flex: 1, fontSize: 12 }}>📷 Camera</button>
              <button type="button" onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click(); } }} className="sv-btn" style={{ flex: 1, fontSize: 12 }}>🖼 Gallery</button>
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={photoPreview} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid #97C459' }} />
              <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} style={{ position: 'absolute', top: 8, right: 8, background: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sv-btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="sv-btn sv-btn-primary" onClick={handleSubmit} disabled={saving} style={{ flex: 2, background: SEVERITY[form.severity].color, borderColor: SEVERITY[form.severity].color }}>
            {saving ? 'Submitting…' : `🆘 Report ${SEVERITY[form.severity].label} incident`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function IncidentsPage() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [viewVoice, setViewVoice] = useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const isSuper = user ? isSupervisor(user.role as any) : false;

  async function load() {
    setLoading(true);
    const sb = getServiceSupabase();
    const stored = typeof window !== 'undefined' ? localStorage.getItem('sv_local_session') : null;
    const u = stored ? JSON.parse(stored) : user;
    let q = sb.from('incidents').select('*').order('created_at', { ascending: false });
    if (!isSuper) q = q.eq('reporter_id', u?.id);
    const { data } = await q;
    setIncidents(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await getServiceSupabase().from('incidents').update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null }).eq('id', id);
    await load();
    setUpdating(null);
  }

  const filtered = filter === 'all' ? incidents : incidents.filter(i => filter === 'open' || filter === 'in_progress' || filter === 'resolved' ? i.status === filter : i.severity === filter);
  const openCount = incidents.filter(i => i.status === 'open').length;
  const critCount = incidents.filter(i => i.severity === 'critical' && i.status === 'open').length;

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
      {showReport && <ReportModal onClose={() => setShowReport(false)} onSaved={load} />}

      {viewPhoto && (
        <div onClick={() => setViewPhoto(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'relative', maxWidth: 500, width: '100%' }} onClick={e => e.stopPropagation()}>
            <img src={viewPhoto} style={{ width: '100%', borderRadius: 12 }} />
            <button onClick={() => setViewPhoto(null)} style={{ position: 'absolute', top: -12, right: -12, width: 32, height: 32, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>✕</button>
          </div>
        </div>
      )}

      <Topbar title="Incidents" subtitle={isSuper ? `${openCount} open · ${critCount > 0 ? critCount + ' critical' : 'all clear'}` : 'Report and track villa incidents'}
        actions={
          <button className="sv-btn" style={{ fontSize: 12, background: '#8B0000', color: '#fff', border: 'none' }} onClick={() => setShowReport(true)}>
            🆘 Report incident
          </button>
        }
      />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Summary pills */}
        {isSuper && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Open', val: incidents.filter(i => i.status === 'open').length, cls: 'coral' },
              { label: 'In progress', val: incidents.filter(i => i.status === 'in_progress').length, cls: 'peach' },
              { label: 'Resolved', val: incidents.filter(i => i.status === 'resolved').length, cls: 'green' },
              { label: 'Critical', val: incidents.filter(i => i.severity === 'critical').length, cls: 'coral' },
            ].map(m => (
              <div key={m.label} className={`metric-card ${m.cls}`}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{m.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {[
            { key: 'all', label: `All (${incidents.length})` },
            { key: 'open', label: '🔴 Open' },
            { key: 'in_progress', label: '🟡 In progress' },
            { key: 'resolved', label: '✅ Resolved' },
            { key: 'critical', label: '🚨 Critical' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${filter === key ? '#1B1D1F' : 'rgba(0,0,0,0.1)'}`, background: filter === key ? '#1B1D1F' : '#fff', color: filter === key ? '#fff' : 'var(--sv-dark)', cursor: 'pointer', fontWeight: filter === key ? 600 : 400 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Incident cards */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No incidents</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>{isSuper ? 'All clear.' : 'Tap "Report incident" if something needs attention.'}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(inc => {
              const sev = SEVERITY[inc.severity] || SEVERITY.medium;
              const sta = STATUS_META[inc.status] || STATUS_META.open;
              return (
                <div key={inc.id} className="sv-card" style={{ borderLeft: `4px solid ${sev.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>🏡 {inc.villa}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sev.bg, color: sev.color }}>{sev.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: sta.bg, color: sta.color }}>{sta.label}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 2 }}>{inc.category}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>
                        {inc.reported_by} · {inc.squad || '—'} · {timeAgo(inc.created_at)}
                      </div>
                    </div>
                    {isSuper && (
                      <select value={inc.status} disabled={updating === inc.id}
                        onChange={e => updateStatus(inc.id, e.target.value)}
                        style={{ fontSize: 11, padding: '5px 8px', borderRadius: 7, border: `1.5px solid ${sta.color}`, background: sta.bg, color: sta.color, cursor: 'pointer', fontWeight: 600 }}>
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    )}
                  </div>

                  <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--sv-dark)', margin: '8px 0' }}>{inc.description}</p>

                  {/* Media */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {inc.photo_url && (
                      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setViewPhoto(inc.photo_url)}>
                        <img src={inc.photo_url} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.1)' }} />
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', opacity: 0, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                          <span style={{ color: '#fff', fontSize: 18 }}>🔍</span>
                        </div>
                      </div>
                    )}
                    {inc.voice_url && (
                      <div style={{ background: 'rgba(151,196,89,0.08)', border: '1px solid #97C459', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
                        <span style={{ fontSize: 18 }}>🎙</span>
                        <audio src={inc.voice_url} controls style={{ height: 30, flex: 1 }} />
                      </div>
                    )}
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
