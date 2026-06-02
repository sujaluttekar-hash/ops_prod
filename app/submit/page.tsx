'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { PROPERTY_NAMES } from '@/lib/data';
import type { SessionUser } from '@/lib/session';

const TASK_TYPES = ['Arrival selfie', 'Guest welcome', 'Table layout', 'Exit selfie'] as const;
const TASK_EMOJI: Record<string, string> = {
  'Arrival selfie': '🤳',
  'Guest welcome':  '🙏',
  'Table layout':   '🍽',
  'Exit selfie':    '👋',
};

export default function SubmitPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [taskType, setTaskType] = useState('');
  const [property, setProperty] = useState('');
  const [dateOfService, setDateOfService] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('sv_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setUser(u);
        if (u.property) setProperty(u.property);
        if (u.role === 'admin') router.replace('/dashboard');
      } catch {}
    }
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskType) { setError('Please select a task type'); return; }
    if (!property) { setError('Please select a property'); return; }
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const newSub = { id: `s${Date.now()}`, butlerId: user?.id || '', butlerName: user?.name || '', taskType, property, dateOfService, submittedAt: ts, notes, photoLabel: photoName || undefined, status: 'pending' };
    const existing = JSON.parse(localStorage.getItem('sv_submissions') || '[]');
    localStorage.setItem('sv_submissions', JSON.stringify([newSub, ...existing]));
    setSubmittedAt(ts);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <>
        <Topbar title="Submit task" />
        <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }} className="page-enter">
          <div className="sv-card" style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Task submitted!</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 24 }}>Recorded and visible to admin now.</div>
            <div style={{ background: 'var(--muted)', borderRadius: 10, padding: 14, textAlign: 'left', marginBottom: 20, fontSize: 13 }}>
              {[['Butler', user?.name], ['Task', taskType], ['Property', property], ['Date of service', dateOfService], ['Submitted at', submittedAt]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--muted-fg)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <button className="sv-btn sv-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => { setSubmitted(false); setTaskType(''); setNotes(''); setPhotoName(''); }}>
              Submit another
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Submit task" subtitle="Butler task submission — visible to admin immediately" />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <div style={{ maxWidth: 560 }}>
          <div className="sv-card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Task type</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {TASK_TYPES.map(t => (
                <button key={t} onClick={() => { setTaskType(t); setError(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: `1.5px solid ${taskType === t ? '#9CCCFC' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, cursor: 'pointer', background: taskType === t ? 'rgba(156,204,252,0.08)' : 'white', transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 24 }}>{TASK_EMOJI[t]}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'left' }}>{t}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Task details</div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Butler (auto-filled)</label>
                <input className="sv-input" value={user?.name || '—'} disabled style={{ width: '100%', background: 'var(--muted)', color: 'var(--muted-fg)' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Property / location</label>
                <select className="sv-select" value={property} onChange={e => setProperty(e.target.value)} style={{ width: '100%' }} required>
                  <option value="">Select property</option>
                  {PROPERTY_NAMES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Date of service</label>
                <input type="date" className="sv-input" value={dateOfService} onChange={e => setDateOfService(e.target.value)} style={{ width: '100%' }} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Photo evidence</label>
                <div className="upload-zone" onClick={() => setPhotoName(photoName ? '' : `photo_${Date.now()}.jpg`)}>
                  {photoName ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>📷</span>
                      <div><div style={{ fontWeight: 600, fontSize: 13 }}>{photoName}</div><div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>Click to remove</div></div>
                    </div>
                  ) : (
                    <><div style={{ fontSize: 28, marginBottom: 6 }}>📷</div><div style={{ fontWeight: 500, fontSize: 13 }}>Tap to attach photo</div><div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>Selfie or task evidence — optional</div></>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Notes (optional)</label>
                <textarea className="sv-input" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Guest name, special requests, observations..." style={{ width: '100%', resize: 'vertical' }} />
              </div>
              {error && <div style={{ fontSize: 12, color: '#8B2020', marginBottom: 10, background: 'rgba(226,75,74,0.08)', padding: '8px 12px', borderRadius: 8 }}>{error}</div>}
              <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⏱</span> Submission timestamp auto-recorded
              </div>
              <button type="submit" className="sv-btn sv-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 14 }}>
                Submit task
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
