'use client';
import { useState, useRef, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { insertSubmission, uploadTaskPhoto, getSupabase } from '@/lib/supabase';
import { getCurrentUser, type AppUser } from '@/lib/auth';

const TASK_TYPES = ['Arrival selfie','Guest welcome','Table layout','Exit selfie'] as const;
const TASK_EMOJI: Record<string,string> = { 'Arrival selfie':'🤳','Guest welcome':'🙏','Table layout':'🍽','Exit selfie':'👋' };

export default function SubmitPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ task_type: '', property: '', notes: '' });
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
    getSupabase().from('properties').select('id, name').order('name').then(({ data }) => setProperties(data ?? []));
  }, []);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto({ file, preview: ev.target?.result as string });
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setError('Not logged in'); return; }
    setSaving(true); setError('');
    try {
      const submissionId = crypto.randomUUID();
      let photo_url: string | null = null;
      if (photo) photo_url = await uploadTaskPhoto(photo.file, submissionId);
      const { error: err } = await insertSubmission({
        butler_id: user.id,
        butler_name: user.name,
        task_type: form.task_type,
        property: form.property,
        date_of_service: new Date().toISOString().split('T')[0],
        submitted_at: new Date().toISOString(),
        notes: form.notes,
        photo_url,
        status: 'pending',
      });
      if (err) throw new Error(err.message);
      setSaved(true);
      setTimeout(() => { setSaved(false); setForm({ task_type: '', property: '', notes: '' }); setPhoto(null); }, 2000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  return (
    <>
      <Topbar title="Submit task" subtitle="Log your daily task with photo proof" />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        {saved ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Task submitted!</div>
            <div style={{ fontSize: 14, color: 'var(--muted-fg)' }}>Your supervisor will review it shortly.</div>
          </div>
        ) : (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div className="sv-card">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>Task details</div>
              {error && <div style={{ background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}
              <form onSubmit={handleSubmit}>
                {/* Task type */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Task type *</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {TASK_TYPES.map(type => (
                      <button key={type} type="button"
                        onClick={() => setForm(f => ({ ...f, task_type: type }))}
                        style={{ padding: '12px 10px', borderRadius: 10, border: `1.5px solid ${form.task_type === type ? '#9CCCFC' : 'rgba(0,0,0,0.12)'}`, background: form.task_type === type ? 'rgba(156,204,252,0.1)' : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{TASK_EMOJI[type]}</div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{type}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Property */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Villa / Property *</div>
                  {properties.length > 0 ? (
                    <select className="sv-select" style={{ width: '100%' }} value={form.property} onChange={e => setForm(f => ({ ...f, property: e.target.value }))} required>
                      <option value="">Select property</option>
                      {properties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  ) : (
                    <input className="sv-input" style={{ width: '100%' }} placeholder="Type villa name" value={form.property} onChange={e => setForm(f => ({ ...f, property: e.target.value }))} required />
                  )}
                </div>

                {/* Notes */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Notes</div>
                  <textarea className="sv-input" style={{ width: '100%', minHeight: 72, resize: 'vertical' }} placeholder="Any additional notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>

                {/* Photo */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Proof photo *</div>
                  <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
                  {photo ? (
                    <div style={{ position: 'relative' }}>
                      <img src={photo.preview} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10 }} />
                      <button type="button" onClick={() => setPhoto(null)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                    </div>
                  ) : (
                    <div className="upload-zone" onClick={() => ref.current?.click()}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                      <div style={{ fontWeight: 500 }}>Tap to capture proof photo</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>Auto-timestamped on upload</div>
                    </div>
                  )}
                </div>

                <button type="submit" className="sv-btn sv-btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: 12 }} disabled={saving || !form.task_type || !form.property}>
                  {saving ? 'Submitting…' : 'Submit task'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
