'use client';
import { useState, useEffect, useRef } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchTasks, getServiceSupabase, uploadTaskPhoto, LOCAL_PROFILES, type Task } from '@/lib/supabase';
import { getCurrentPosition } from '@/lib/get-location';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';


// ── Task field matrix ─────────────────────────────────────────
const BOOKING_REQUIRED_TYPES = ['Arrival selfie','Guest welcome','Table layout','Exit selfie','Check-In','Check-Out','Booking'];
const TASK_FIELD_MATRIX: Record<string, { bookingId: boolean; arrivalSelfie: boolean; exitSelfie: boolean; guestWelcome: boolean; comment: boolean; video: boolean }> = {
  'Arrival selfie':  { bookingId: true,  arrivalSelfie: true,  exitSelfie: false, guestWelcome: false, comment: false, video: true  },
  'Guest welcome':   { bookingId: true,  arrivalSelfie: false, exitSelfie: false, guestWelcome: true,  comment: false, video: true  },
  'Table layout':    { bookingId: true,  arrivalSelfie: false, exitSelfie: false, guestWelcome: false, comment: false, video: false },
  'Exit selfie':     { bookingId: true,  arrivalSelfie: false, exitSelfie: true,  guestWelcome: false, comment: false, video: true  },
  'Check-In':        { bookingId: true,  arrivalSelfie: true,  exitSelfie: true,  guestWelcome: true,  comment: false, video: false },
  'Check-Out':       { bookingId: true,  arrivalSelfie: true,  exitSelfie: true,  guestWelcome: false, comment: false, video: false },
  'Non Booking':     { bookingId: false, arrivalSelfie: true,  exitSelfie: true,  guestWelcome: false, comment: true,  video: false },
};

const TASK_TYPES = ['Arrival selfie','Guest welcome','Table layout','Exit selfie','Custom task'];
const taskEmoji: Record<string,string> = { 'Arrival selfie':'🤳','Guest welcome':'🙏','Table layout':'🍽','Exit selfie':'👋','Custom task':'✏️' };

// ── Assign Task Modal (moved from Allocation) ────────────────
function AssignTaskModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [butlers, setButlers] = useState<any[]>([]);
  const [form, setForm] = useState({ butler_id: '', butler_name: '', task_type: '', villa: '', due_time: '', notes: '', booking_type: 'Booking' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isSelfMode = (() => { try { const s = localStorage.getItem('sv_local_session'); return s ? JSON.parse(s).role === 'butler' : false; } catch { return false; } })();

  useEffect(() => {
    getServiceSupabase().from('profiles').select('id,name,squad').eq('role','butler').eq('is_active',true).order('name')
      .then(({ data }: any) => setButlers(data || []));
  }, []);

  async function handleSave() {
    // Butlers assign to themselves; admins/supervisors pick a butler
    const stored = typeof window !== 'undefined' ? localStorage.getItem('sv_local_session') : null;
    const localUser = stored ? JSON.parse(stored) : {};
    const isSelf = localUser.role === 'butler';
    const targetId   = isSelf ? localUser.id   : form.butler_id;
    const targetName = isSelf ? localUser.name  : (butlers.find((b:any) => b.id === form.butler_id)?.name || '');

    if (!targetId || !form.task_type) { setError(isSelf ? 'Select a task type' : 'Select butler and task type'); return; }
    setSaving(true); setError('');
    const today = new Date().toISOString().slice(0,10);
    const notes = [`Butler: ${targetName}`, `ButlerID: ${targetId}`, `Date: ${today}`, form.villa ? `Villa: ${form.villa}` : '', form.notes || ''].filter(Boolean).join(' · ');
    const { error: err } = await getServiceSupabase().from('tasks').insert({
      type: form.task_type === 'Custom task' ? (form.notes || 'Custom task') : form.task_type,
      butler_id: targetId, status: 'pending',
      due_time: form.due_time || null, notes,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    if (!isSelf) {
      try {
        await getServiceSupabase().from('notifications').insert({
          user_id: targetId, title: 'New task assigned',
          body: `${form.task_type}${form.villa ? ' at ' + form.villa : ''}${form.due_time ? ' · Due ' + form.due_time : ''}`,
          type: 'task', read: false,
        });
      } catch {}
    }
    onDone(); onClose();
  }

  
// ── Task field matrix ─────────────────────────────────────────
const BOOKING_REQUIRED_TYPES = ['Arrival selfie','Guest welcome','Table layout','Exit selfie','Check-In','Check-Out','Booking'];
const TASK_FIELD_MATRIX: Record<string, { bookingId: boolean; arrivalSelfie: boolean; exitSelfie: boolean; guestWelcome: boolean; comment: boolean; video: boolean }> = {
  'Arrival selfie':  { bookingId: true,  arrivalSelfie: true,  exitSelfie: false, guestWelcome: false, comment: false, video: true  },
  'Guest welcome':   { bookingId: true,  arrivalSelfie: false, exitSelfie: false, guestWelcome: true,  comment: false, video: true  },
  'Table layout':    { bookingId: true,  arrivalSelfie: false, exitSelfie: false, guestWelcome: false, comment: false, video: false },
  'Exit selfie':     { bookingId: true,  arrivalSelfie: false, exitSelfie: true,  guestWelcome: false, comment: false, video: true  },
  'Check-In':        { bookingId: true,  arrivalSelfie: true,  exitSelfie: true,  guestWelcome: true,  comment: false, video: false },
  'Check-Out':       { bookingId: true,  arrivalSelfie: true,  exitSelfie: true,  guestWelcome: false, comment: false, video: false },
  'Non Booking':     { bookingId: false, arrivalSelfie: true,  exitSelfie: true,  guestWelcome: false, comment: true,  video: false },
};

const TASK_TYPES = ['Arrival selfie','Guest welcome','Table layout','Exit selfie','Custom task'];
  const TASK_EMOJIS: Record<string,string> = { 'Arrival selfie':'🤳','Guest welcome':'🙏','Table layout':'🍽','Exit selfie':'👋','Custom task':'✏️' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isSelfMode ? '+ Create task' : 'Assign task'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 18 }} />
        {error && <div style={{ background: 'rgba(233,160,167,0.15)', border: '1px solid #E9A0A7', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}

        {/* Butler selector — shown only to admin/supervisor; butler creates for themselves */}
        {isSelfMode ? (
          <div style={{ padding: '10px 14px', background: 'rgba(156,204,252,0.08)', borderRadius: 10, marginBottom: 14, fontSize: 13, color: '#0C447C' }}>
            👤 Creating task for yourself
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Butler *</div>
            <select className="sv-select" style={{ width: '100%' }} value={form.butler_id}
              onChange={e => { const b = butlers.find((x:any) => x.id === e.target.value); setForm(f => ({ ...f, butler_id: e.target.value, butler_name: b?.name || '' })); }}>
              <option value="">Select butler…</option>
              {butlers.map((b:any) => <option key={b.id} value={b.id}>{b.name} · {b.squad}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Task type *</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 7 }}>
            {TASK_TYPES.map(tt => (
              <button key={tt} type="button" onClick={() => setForm(f => ({ ...f, task_type: f.task_type === tt ? '' : tt }))}
                style={{ padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${form.task_type === tt ? '#9CCCFC' : 'rgba(0,0,0,0.1)'}`, background: form.task_type === tt ? 'rgba(156,204,252,0.1)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: form.task_type === tt ? 600 : 400 }}>
                <span style={{ fontSize: 16 }}>{TASK_EMOJIS[tt]}</span>{tt}
              </button>
            ))}
          </div>
          {form.task_type === 'Custom task' && (
            <input className="sv-input" style={{ width: '100%', marginTop: 8 }} placeholder="Describe the task…"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Villa</div>
            <input className="sv-input" style={{ width: '100%' }} placeholder="Villa name" value={form.villa} onChange={e => setForm(f => ({ ...f, villa: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Due time</div>
            <input className="sv-input" style={{ width: '100%' }} type="time" value={form.due_time} onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sv-btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="sv-btn sv-btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
            {saving ? 'Saving…' : isSelfMode ? 'Create task' : 'Assign task'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Voice recorder hook ───────────────────────────────────────
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
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob); setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); mediaRef.current = mr; setRecording(true); setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch { alert('Microphone permission denied'); }
  }
  function stopRecording() { mediaRef.current?.stop(); setRecording(false); if (timerRef.current) clearInterval(timerRef.current); }
  function clearRecording() { setAudioUrl(null); setAudioBlob(null); setDuration(0); }
  return { recording, audioUrl, audioBlob, duration, startRecording, stopRecording, clearRecording };
}

// ── Complete Task Modal ────────────────────────────────────────
function CompleteTaskModal({ task, onClose, onDone }: { task: any; onClose: () => void; onDone: (taskId: string) => void }) {
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [video, setVideo] = useState<{ file: File; name: string } | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [bookingId, setBookingId] = useState('');
  const [taskComment, setTaskComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const videoRef = useRef<HTMLInputElement>(null);
  const matrix = TASK_FIELD_MATRIX[task.type] || { bookingId: false, arrivalSelfie: false, exitSelfie: false, guestWelcome: false, comment: false, video: false };
  const needsBookingId = matrix.bookingId;
  const needsComment = matrix.comment;
  const voice = useVoiceRecorder();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto({ file, preview: ev.target?.result as string });
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    setSubmitError('');
    // Validate required fields
    if (needsBookingId && !bookingId.trim()) {
      setSubmitError('Booking ID is required for this task type.');
      return;
    }
    if (needsComment && !taskComment.trim()) {
      setSubmitError('Please describe what task was performed.');
      return;
    }
    setSaving(true);
    try {
      // Upload photo first (if any)
      let photo_url: string | null = null;
      if (photo) {
        photo_url = await uploadTaskPhoto(photo.file, task.id);
      }

      // Upload video if provided
      let video_url: string | null = null;
      if (video) {
        try {
          const ext = video.file.name.split('.').pop()?.toLowerCase() || 'mp4';
          const contentType = ext === 'mov' ? 'video/quicktime' : ext === 'avi' ? 'video/avi' : 'video/mp4';
          const vPath = `tasks/video_${task.id}_${Date.now()}.${ext}`;
          const { data: vUp, error: vErr } = await getServiceSupabase().storage
            .from('delight-photos')
            .upload(vPath, video.file, { upsert: true, contentType });
          if (vUp && !vErr) {
            const { data: { publicUrl } } = getServiceSupabase().storage.from('delight-photos').getPublicUrl(vUp.path);
            video_url = publicUrl;
          } else if (vErr) {
            console.error('Video upload error:', vErr.message);
          }
        } catch (e: any) {
          console.error('Video upload failed:', e.message);
          // Don't block task completion for video upload failure
        }
      }

      // Build notes with booking ID and comment
      const noteParts = [
        task.notes || '',
        bookingId ? `BookingID: ${bookingId}` : '',
        taskComment ? `Comment: ${taskComment}` : '',
        isCustom && customTaskName ? `Task: ${customTaskName}` : '',
        notes || '',
      ].filter(Boolean);

      // Save task as completed — GPS runs after, non-blocking
      const { error } = await getServiceSupabase().from('tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: noteParts.join(' · ') || null,
        photo_path: photo_url || task.photo_path || null,
        voice_url: video_url || undefined,
      }).eq('id', task.id);

      if (error) {
        setSubmitError('Failed to save: ' + error.message);
        setSaving(false);
        return;
      }

      // Mark done immediately — don't wait for GPS or voice
      setDone(true);
      onDone(task.id);
      setTimeout(() => { onClose(); }, 1200);

      // GPS + location update runs in background after modal closes
      getCurrentPosition().then(pos => {
        if (!pos) return;
        // Update geo on task
        getServiceSupabase().from('tasks').update({ geo_lat: pos.lat, geo_lng: pos.lng }).eq('id', task.id).catch(() => {});
        // Update butler live location
        try {
          const stored = localStorage.getItem('sv_local_session');
          if (stored) {
            const u = JSON.parse(stored);
            fetch('/api/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ butler_id: u.id, butler_name: u.name, squad: u.squad || null, lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy }),
            }).catch(() => {});
          }
        } catch {}
      }).catch(() => {});

      // Voice note upload in background
      if (voice.audioBlob) {
        const vPath = `tasks/voice_${task.id}_${Date.now()}.webm`;
        getServiceSupabase().storage.from('delight-photos')
          .upload(vPath, voice.audioBlob, { upsert: true, contentType: 'audio/webm' })
          .then(({ data: vData }: { data: any }) => {
            if (vData) {
              const { data: { publicUrl } } = getServiceSupabase().storage.from('delight-photos').getPublicUrl(vData.path);
              getServiceSupabase().from('tasks').update({ voice_url: publicUrl }).eq('id', task.id).catch(() => {});
            }
          }).catch(() => {});
      }

    } catch (e: any) {
      setSubmitError('Error: ' + (e?.message || 'Please try again'));
      setSaving(false);
    }
  }

  const [customTaskName, setCustomTaskName] = useState('');
  const villaName = task.notes?.replace('Villa: ', '').split(' · ')[0] || task.property_id || '—';
  const isCustom = task.type === 'Custom task';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Task completed!</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Complete task</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>
                  {taskEmoji[task.type] || '✓'} {task.type} · {villaName}
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
            </div>
            {submitError && <div style={{ background: 'rgba(233,160,167,0.15)', border: '1px solid #E9A0A7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#8B2020', marginBottom: 14 }}>⚠ {submitError}</div>}
            <div className="sv-strip" style={{ marginBottom: 18 }} />
            {/* Custom task name input */}
            {isCustom && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Task name *</div>
                <input
                  value={customTaskName} onChange={e => setCustomTaskName(e.target.value)}
                  placeholder="Describe what you did…"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            )}

            {/* Photo upload */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Photo proof (optional)</div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
              <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              {photo ? (
                <div style={{ position: 'relative' }}>
                  <img src={photo.preview} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10 }} />
                  <button onClick={() => setPhoto(null)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => cameraRef.current?.click()}
                    style={{ flex: 1, padding: '12px 0', background: '#1B1D1F', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    📷 Take photo
                  </button>
                  <button type="button" onClick={() => galleryRef.current?.click()}
                    style={{ flex: 1, padding: '12px 0', background: 'var(--muted)', color: 'var(--sv-dark)', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    🖼 Gallery
                  </button>
                </div>
              )}
            </div>

            {/* Video upload — only for tasks that support it */}
            {matrix.video && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Video (optional · max 100MB)</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button type="button" onClick={() => videoRef.current?.click()}
                    style={{ flex: 1, padding: '10px 0', background: video ? 'rgba(151,196,89,0.1)' : 'var(--muted)', border: `1px solid ${video ? '#97C459' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: video ? '#2D5A0E' : 'var(--sv-dark)' }}>
                    🎥 {video ? '✅ ' + video.name.slice(0,20) + (video.name.length > 20 ? '…' : '') : 'Upload video'}
                  </button>
                  {video && <button type="button" onClick={() => setVideo(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}>✕</button>}
                </div>
                {video && <div style={{ fontSize: 10, color: '#2D5A0E', marginTop: 3 }}>{(video.file.size/1024/1024).toFixed(1)}MB · ready to upload</div>}
              </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Notes (optional)</div>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any notes about this task..."
                style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, resize: 'vertical', minHeight: 72, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="sv-btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button type="button" className="sv-btn sv-btn-primary" onClick={handleSubmit} disabled={saving || (isCustom && !customTaskName.trim())} style={{ flex: 2 }}>
                {saving ? 'Submitting…' : '✓ Submit & complete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [completeTask, setCompleteTask] = useState<any | null>(null);
  const [rejectTask, setRejectTask] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  async function handleReject() {
    if (!rejectTask || !rejectReason.trim()) return;
    setRejecting(true);
    const stored = localStorage.getItem('sv_local_session');
    const u = stored ? JSON.parse(stored) : {};
    const note = (rejectTask.notes ? rejectTask.notes + ' · ' : '') +
      `REJECTED by ${u.name || 'Admin'} · ${new Date().toLocaleString('en-IN')} · Reason: ${rejectReason}`;
    await getServiceSupabase().from('tasks').update({ status: 'rejected', notes: note }).eq('id', rejectTask.id);
    try {
      await getServiceSupabase().from('notifications').insert({
        user_id: rejectTask.butler_id,
        title: '❌ Task rejected — action required',
        body: `Your ${rejectTask.type} was rejected. Reason: ${rejectReason}`,
        type: 'task', read: false,
      });
    } catch {}
    setRejectTask(null); setRejectReason(''); setRejecting(false);
    load();
  }

  const [showAssign, setShowAssign] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<any | null>(null);

  const isSuper = user ? isSupervisor(user.role as any) : false;

  async function loadForUser(u: { id: string; name: string; role: string }) {
    const supervisor = isSupervisor(u.role as any);
    try {
      // Use server-side API route — guaranteed to work regardless of client-side Supabase state
      const url = supervisor
        ? '/api/tasks?all=1'
        : `/api/tasks?uid=${encodeURIComponent(u.id)}&name=${encodeURIComponent(u.name)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data as any);
    } catch (e) {
      console.error('Tasks fetch error:', e);
    }
    setLoading(false);
  }

  function load() {
    // Always read fresh from localStorage — never use stale closure
    try {
      const stored = localStorage.getItem('sv_local_session');
      if (stored) { loadForUser(JSON.parse(stored)); }
    } catch {}
  }

  // Run on mount immediately
  useEffect(() => { load(); }, []);

  // Also run when auth context user changes
  useEffect(() => { if (user) loadForUser(user as any); }, [user?.id]);

  // Poll every 15s
  useEffect(() => {
    const t = setInterval(() => load(), 15000);
    return () => clearInterval(t);
  }, []);

  const filtered = tasks.filter(t => filter === 'All' || t.status === filter);
  const done = tasks.filter(t => t.status === 'completed').length;
  const delayed = tasks.filter(t => t.status === 'delayed').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  return (
    <>
      {showAssign && <AssignTaskModal onClose={() => setShowAssign(false)} onDone={load} />}
      {/* Photo lightbox */}
      {/* Task photo verification modal */}
      {viewPhoto && (
        <div onClick={() => setViewPhoto(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Task proof — {viewPhoto.type}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 3, display: 'flex', gap: 10 }}>
                  {(() => {
                    const nameMatch = viewPhoto.notes?.match(/Butler: ([^·]+)/);
                    const butler = nameMatch ? nameMatch[1].trim() : '—';
                    const villaMatch = viewPhoto.notes?.match(/Villa: ([^·]+)/);
                    const villa = villaMatch ? villaMatch[1].trim() : '—';
                    return <><span>👤 {butler}</span><span>🏡 {villa}</span>{viewPhoto.due_time && <span>⏰ {viewPhoto.due_time}</span>}</>;
                  })()}
                </div>
              </div>
              <button onClick={() => setViewPhoto(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)', padding: '0 4px' }}>✕</button>
            </div>
            {/* Photo */}
            {viewPhoto.photo_path ? (
              <div style={{ background: '#f5f5f3', position: 'relative' }}>
                <img src={viewPhoto.photo_path} alt="Task proof"
                  style={{ width: '100%', maxHeight: '55vh', objectFit: 'contain', display: 'block' }} />
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(151,196,89,0.9)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                  ✅ Completed
                </div>
              </div>
            ) : (
              <div style={{ background: '#f5f5f3', padding: '40px 0', textAlign: 'center', color: 'var(--muted-fg)', fontSize: 13 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                No photo uploaded for this task.
              </div>
            )}
            {/* Footer */}
            <div style={{ padding: '14px 20px', display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>
                Completed: {viewPhoto.completed_at ? new Date(viewPhoto.completed_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {viewPhoto.photo_path && (
                  <a href={viewPhoto.photo_path} download target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    <button className="sv-btn" style={{ fontSize: 12 }}>⬇ Download</button>
                  </a>
                )}
                <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setViewPhoto(null)}>✓ Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Reject Modal */}
      {rejectTask && (
        <div onClick={() => setRejectTask(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>❌ Reject task</div>
            <div className="sv-strip" style={{ marginBottom: 14 }} />
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 14 }}>Rejecting: <strong>{rejectTask.type}</strong> — butler notified immediately.</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 6 }}>Reason <span style={{ color: '#E93C3C' }}>*</span></div>
            <textarea className="sv-input" style={{ width: '100%', minHeight: 72, resize: 'vertical', marginBottom: 16 }}
              placeholder="e.g. Photo quality too low, wrong location, please redo…"
              value={rejectReason} onChange={e => setRejectReason(e.target.value)} autoFocus />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="sv-btn" style={{ flex: 1 }} onClick={() => setRejectTask(null)}>Cancel</button>
              <button disabled={!rejectReason.trim() || rejecting}
                style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: rejectReason.trim() ? '#E93C3C' : 'rgba(0,0,0,0.08)', color: rejectReason.trim() ? '#fff' : 'var(--muted-fg)', fontWeight: 700, fontSize: 13, cursor: rejectReason.trim() ? 'pointer' : 'not-allowed' }}
                onClick={handleReject}>
                {rejecting ? 'Rejecting…' : '✗ Reject & notify butler'}
              </button>
            </div>
          </div>
        </div>
      )}

      {completeTask && <CompleteTaskModal task={completeTask} onClose={() => setCompleteTask(null)} onDone={(taskId) => {
        // Immediately update local state so UI reflects completion
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' as any } : t));
        setCompleteTask(null);
        // Also re-fetch from Supabase after a short delay
        setTimeout(load, 1000);
      }} />}
      <Topbar title={isSuper ? 'Audit' : 'Audit'} subtitle={isSuper ? 'Assign and track butler tasks' : 'Your tasks'}
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowAssign(true)}>{isSuper ? '+ Assign task' : '+ Create task'}</button>
            <button className="sv-btn" style={{ fontSize: 12 }} onClick={() => load()}>↻ Refresh</button>
          </div>
        } />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total tasks', value: tasks.length, cls: 'blue' },
            { label: 'Completed', value: done, cls: 'green' },
            { label: 'Pending', value: pending, cls: 'peach' },
            { label: 'Delayed', value: delayed, cls: 'coral' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        {/* Type breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
          {TASK_TYPES.map(type => {
            const count = tasks.filter(t => t.type === type).length;
            const doneCount = tasks.filter(t => t.type === type && t.status === 'completed').length;
            return (
              <div key={type} className="sv-card" style={{ textAlign: 'center', padding: 14 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{taskEmoji[type]}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)' }}>{type}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{doneCount}<span style={{ fontSize: 13, color: 'var(--muted-fg)' }}>/{count}</span></div>
              </div>
            );
          })}
        </div>

        {/* Task table */}
        <div className="sv-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {isSuper ? 'All tasks' : 'My tasks'}
              <span className="badge badge-green" style={{ marginLeft: 6 }}>Live</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['All','pending','completed','delayed'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className="sv-btn"
                  style={{ fontSize: 11, padding: '5px 10px', background: filter === f ? '#1B1D1F' : undefined, color: filter === f ? '#fff' : undefined }}>
                  {f === 'All' ? 'All' : getStatusLabel(f)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-fg)' }}>
              {filter === 'All' ? 'No tasks yet.' : `No ${filter} tasks.`}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    {isSuper && <th>Butler</th>}
                    <th>Villa</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const tAny = t as any;
                    const isPending = t.status === 'pending';
                    // Extract villa — handle multiple note formats
                    const villaMatch = t.notes?.match(/Villa: ([^·]+)/);
                    const hasButlerPrefix = t.notes?.startsWith('Butler:');
                    const villaName = villaMatch
                      ? villaMatch[1].trim()
                      : (!hasButlerPrefix && t.notes && t.notes.trim() ? t.notes.split(' · ')[0].trim() : '—');
                    return (
                      <tr key={t.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ fontSize: 16 }}>{taskEmoji[t.type] || '✓'}</span>
                            <span style={{ fontWeight: 500 }}>{t.type}</span>
                          </div>
                        </td>
                        {isSuper && (
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              {(() => {
                                // Extract butler name from notes OR by butler_id UUID lookup
                                const nameMatch = t.notes?.match(/Butler: ([^\u00b7\n]+)/);
                                const profileMatch = t.butler_id ? LOCAL_PROFILES.find((p: any) => p.id === t.butler_id) : null;
                                const butlerName = (nameMatch ? nameMatch[1].trim() : null) || profileMatch?.name || tAny.profiles?.name || null;
                                return (
                                  <>
                                    <div className="sv-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>
                                      {butlerName ? butlerName.slice(0,2).toUpperCase() : '?'}
                                    </div>
                                    <span style={{ color: 'var(--muted-fg)', fontSize: 13 }}>{butlerName || '—'}</span>
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                        )}
                        <td style={{ color: 'var(--muted-fg)', fontSize: 13 }}>{villaName}</td>
                        <td style={{ color: 'var(--muted-fg)', fontSize: 13 }}>{t.due_time ?? '—'}</td>
                        <td><span className={getStatusBadge(t.status)}>{getStatusLabel(t.status)}</span></td>
                        <td>
                          {isPending ? (
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setCompleteTask(t)}>
                                Complete task
                              </button>
                              {isSuper && (
                                <button className="sv-btn" style={{ fontSize: 11, padding: '5px 8px', color: '#8B2020', borderColor: '#E9A0A7' }}
                                  onClick={() => { setRejectTask(t); setRejectReason(''); }}>✗ Reject</button>
                              )}
                            </div>
                          ) : t.status === 'completed' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, color: '#2D5A0E', fontWeight: 600 }}>✅ Done</span>
                              <button
                                onClick={() => setViewPhoto(t)}
                                style={{ fontSize: 10, padding: '3px 8px', background: (t as any).photo_path ? 'rgba(151,196,89,0.15)' : 'rgba(0,0,0,0.05)', border: `1px solid ${(t as any).photo_path ? '#97C459' : 'rgba(0,0,0,0.1)'}`, borderRadius: 5, cursor: 'pointer', color: (t as any).photo_path ? '#2D5A0E' : 'var(--muted-fg)', fontWeight: 600 }}>
                                {(t as any).photo_path ? '📷 View photo' : '📋 Details'}
                              </button>
                            </div>
                          ) : (t as any).status === 'rejected' ? (
                            <div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#8B2020', background: 'rgba(233,160,167,0.12)', padding: '3px 8px', borderRadius: 6 }}>❌ Rejected</span>
                              {(t as any).notes?.includes('Reason:') && (
                                <div style={{ fontSize: 10, color: '#8B2020', marginTop: 3 }}>{(t as any).notes.split('Reason: ')[1]?.slice(0,60)}</div>
                              )}
                              {!isSuper && (
                                <button className="sv-btn" style={{ fontSize: 10, marginTop: 4, padding: '3px 8px' }}
                                  onClick={() => setCompleteTask(t)}>↩ Resubmit</button>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: '#8B2020' }}>⚠ Delayed</span>
                          )}
                        </td>
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
