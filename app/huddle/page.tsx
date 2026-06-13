'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchHuddles, fetchProfiles, getSupabase, getServiceSupabase, type Huddle, type Profile } from '@/lib/supabase';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';

// ── Types ─────────────────────────────────────────────────────
type QuizQuestion = { question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string; };
type HuddleWithStats = Huddle & { attendanceCount?: number; hasQuiz?: boolean; questionCount?: number; };

// ── Schedule Modal (admin/supervisor) ────────────────────────
function ScheduleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ team: '', huddle_date: '', time: '', participants_expected: '', notes: '', status: 'scheduled' });
  const [questions, setQuestions] = useState<QuizQuestion[]>([{ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a' }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addQuiz, setAddQuiz] = useState(false);
  const [step, setStep] = useState<'details' | 'quiz'>('details');
  const [error, setError] = useState('');

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  function updateQ(i: number, k: keyof QuizQuestion, v: string) {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [k]: v } : q));
  }

  function addQuestion() {
    if (questions.length < 10) setQuestions(prev => [...prev, { question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a' }]);
  }

  function removeQuestion(i: number) {
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const sb = getServiceSupabase();
      // Insert huddle
      const { data: huddle, error: hErr } = await sb.from('huddles').insert({
        team: form.team,
        huddle_date: form.huddle_date,
        time: form.time || null,
        participants_expected: parseInt(form.participants_expected) || 0,
        notes: form.notes || null,
        status: form.status,
      }).select().single();
      if (hErr) throw new Error(hErr.message);

      // Insert quiz questions if enabled


      // Save quiz questions if added
      if (addQuiz && huddle) {
        const qs = questions.filter(q => q.question.trim());
        if (qs.length > 0) {
          await sb.from('huddle_quiz_questions').insert(
            qs.map((q, i) => ({ huddle_id: huddle.id, question: q.question, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_option: q.correct_option, order_no: i + 1 }))
          );
          await sb.from('huddles').update({ has_quiz: true }).eq('id', huddle.id);
        }
      }

      // Send notifications to all butlers
      const { data: butlers } = await sb.from('profiles').select('id').eq('role', 'butler').eq('is_active', true);
      if (butlers && butlers.length > 0) {
        sb.from('notifications').insert(
          butlers.map((b: any) => ({
            user_id: b.id,
            title: `Huddle scheduled: ${form.team}`,
            body: `Scheduled for ${new Date(form.huddle_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${form.time ? ' at ' + form.time.slice(0,5) : ''}`,
            type: 'huddle',
            read: false,
          }))
        ).then(() => {}).catch(() => {});
      }

      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (err: any) { setError(err.message); setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 580, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', marginTop: 20, marginBottom: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Schedule huddle</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>
              Schedule huddle
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 20 }} />

        {saved ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Huddle scheduled!</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>Butlers have been notified.</div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {error && <div style={{ background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}
                <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Team / huddle name *</div>
                    <input className="sv-input" style={{ width: '100%' }} placeholder="e.g. Lonavala team huddle" value={form.team} onChange={f('team')} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Date *</div>
                      <input className="sv-input" style={{ width: '100%' }} type="date" value={form.huddle_date} onChange={f('huddle_date')} required />
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Time</div>
                      <input className="sv-input" style={{ width: '100%' }} type="time" value={form.time} onChange={f('time')} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Participants expected</div>
                      <input className="sv-input" style={{ width: '100%' }} type="number" min="1" placeholder="12" value={form.participants_expected} onChange={f('participants_expected')} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Status</div>
                      <select className="sv-select" style={{ width: '100%' }} value={form.status} onChange={f('status')}>
                        <option value="scheduled">Scheduled</option>
                        <option value="tbc">TBC</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Notes / agenda</div>
                    <textarea className="sv-input" style={{ width: '100%', minHeight: 60, resize: 'vertical' }} placeholder="What will be covered?" value={form.notes} onChange={f('notes')} />
                  </div>



                </div>

                {/* Quiz toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: addQuiz ? 'rgba(156,204,252,0.08)' : 'var(--muted)', borderRadius: 10, border: `1.5px solid ${addQuiz ? '#9CCCFC' : 'transparent'}`, cursor: 'pointer', marginBottom: 16 }}
                  onClick={() => setAddQuiz(v => !v)}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${addQuiz ? '#9CCCFC' : '#ccc'}`, background: addQuiz ? '#9CCCFC' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#0C447C', flexShrink: 0 }}>
                    {addQuiz ? '✓' : ''}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Add quiz to this huddle</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>Butlers will answer questions after the huddle. Scores are recorded.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="sv-btn" onClick={onClose}>Cancel</button>
                  {addQuiz ? (
                    <button type="button" className="sv-btn sv-btn-primary" onClick={() => { if (!form.team || !form.huddle_date) { setError('Fill in team name and date first'); return; } setError(''); setStep('quiz'); }}>
                      Next: Add quiz →
                    </button>
                  ) : (
                    <button type="submit" className="sv-btn sv-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Schedule huddle'}</button>
                  )}
                </div>
              

            
          {step === 'quiz' && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-fg)' }}>{questions.length}/10 questions added</div>
                <button type="button" className="sv-btn" onClick={() => setStep('details')}>← Back</button>
              </div>
              {questions.map((q, i) => (
                <div key={i} style={{ background: 'var(--muted)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Question {i + 1}</span>
                    {questions.length > 1 && <button type="button" onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))} style={{ fontSize: 11, color: '#8B2020', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>}
                  </div>
                  <input className="sv-input" style={{ width: '100%', marginBottom: 8, background: '#fff' }} placeholder="Enter question" value={q.question} onChange={e => setQuestions(qs => qs.map((qq, j) => j === i ? { ...qq, question: e.target.value } : qq))} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                    {(['a','b','c','d'] as const).map(opt => (
                      <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, width: 14 }}>{opt.toUpperCase()}</span>
                        <input className="sv-input" style={{ flex: 1, background: '#fff', fontSize: 12 }} placeholder={`Option ${opt.toUpperCase()}`} value={(q as any)[`option_${opt}`]} onChange={e => setQuestions(qs => qs.map((qq, j) => j === i ? { ...qq, [`option_${opt}`]: e.target.value } : qq))} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>Correct answer:</span>
                    {(['a','b','c','d'] as const).map(opt => (
                      <button key={opt} type="button" onClick={() => setQuestions(qs => qs.map((qq, j) => j === i ? { ...qq, correct_option: opt } : qq))}
                        style={{ width: 28, height: 28, borderRadius: 6, border: `1.5px solid ${q.correct_option === opt ? '#97C459' : '#ccc'}`, background: q.correct_option === opt ? '#97C459' : 'white', fontWeight: 700, fontSize: 11, color: q.correct_option === opt ? '#fff' : '#666', cursor: 'pointer' }}>
                        {opt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {questions.length < 10 && (
                <button type="button" className="sv-btn" style={{ width: '100%', marginBottom: 12, justifyContent: 'center' }}
                  onClick={() => setQuestions(qs => [...qs, { question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', order_no: qs.length + 1 }])}>
                  + Add question ({questions.length}/10)
                </button>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="sv-btn" onClick={onClose}>Cancel</button>
                <button type="button" className="sv-btn sv-btn-primary" disabled={saving} onClick={handleSave as any}>{saving ? 'Saving…' : 'Schedule with quiz'}</button>
              </div>
            </div>
          )}
          </form>
        )}
      </div>
    </div>
  );
}


// ── Butler acknowledgement button ────────────────────────────
function ButlerAttendButton({ huddleId, butlerId }: { huddleId: string; butlerId: string }) {
  const [attended, setAttended] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    getServiceSupabase()
      .from('huddle_attendance')
      .select('attended')
      .eq('huddle_id', huddleId)
      .eq('butler_id', butlerId)
      .maybeSingle()
      .then(({ data }: any) => { setAttended(data?.attended ?? false); });
  }, [huddleId, butlerId]);

  async function acknowledge() {
    setSaving(true);
    await getServiceSupabase()
      .from('huddle_attendance')
      .upsert({ huddle_id: huddleId, butler_id: butlerId, attended: true, acknowledged_at: new Date().toISOString() }, { onConflict: 'huddle_id,butler_id' });
    setAttended(true);
    setShowConfirm(false);
    setSaving(false);
  }

  if (attended === null) return null;

  if (attended) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#2D5A0E', background: 'rgba(151,196,89,0.12)', border: '1px solid #97C459', borderRadius: 6, padding: '3px 10px' }}>
        ✅ Acknowledged
      </div>
    );
  }

  return (
    <>
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowConfirm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 340, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✋</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Acknowledge huddle</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 20, lineHeight: 1.5 }}>
              By acknowledging, you confirm that you have attended or reviewed this huddle and understand the agenda.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="sv-btn" onClick={() => setShowConfirm(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="sv-btn sv-btn-primary" onClick={acknowledge} disabled={saving} style={{ flex: 2 }}>
                {saving ? 'Saving…' : '✅ I acknowledge this huddle'}
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        className="sv-btn"
        style={{ fontSize: 11, padding: '3px 10px' }}
        onClick={() => setShowConfirm(true)}>
        ✋ Acknowledge
      </button>
    </>
  );
}

// ── Attendance Modal ──────────────────────────────────────────
function AttendanceModal({ huddle, profiles, onClose, onSaved }: { huddle: HuddleWithStats; profiles: Profile[]; onClose: () => void; onSaved: () => void }) {
  const [attended, setAttended] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getServiceSupabase().from('huddle_attendance').select('butler_id, attended').eq('huddle_id', huddle.id).then((res: any) => {
      if (res.data) setAttended(new Set(res.data.filter((r: any) => r.attended).map((r: any) => r.butler_id)));
    });
  }, [huddle.id]);

  const toggle = (id: string) => setAttended(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function handleSave() {
    setSaving(true);
    const sb = getServiceSupabase();
    const butlers = profiles.filter(p => p.role === 'butler');
    for (const p of butlers) {
      await sb.from('huddle_attendance').upsert({ huddle_id: huddle.id, butler_id: p.id, attended: attended.has(p.id) }, { onConflict: 'huddle_id,butler_id' });
    }
    await sb.from('huddles').update({ status: 'completed' }).eq('id', huddle.id);
    setSaved(true);
    setTimeout(() => { onSaved(); onClose(); }, 700);
  }

  const butlers = profiles.filter(p => p.role === 'butler');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Mark attendance</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>{huddle.team}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 20 }} />
        {saved ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Attendance saved!</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>{attended.size}/{butlers.length} attended</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--muted-fg)' }}>{attended.size} selected</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="sv-btn" style={{ fontSize: 11 }} onClick={() => setAttended(new Set(butlers.map(p => p.id)))}>All present</button>
                <button className="sv-btn" style={{ fontSize: 11 }} onClick={() => setAttended(new Set())}>Clear</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {butlers.map(p => (
                <div key={p.id} onClick={() => toggle(p.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${attended.has(p.id) ? '#97C459' : 'rgba(0,0,0,0.1)'}`, background: attended.has(p.id) ? 'rgba(151,196,89,0.08)' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div className="sv-avatar">{(p.name || "??").slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{p.squad ?? '—'}</div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${attended.has(p.id) ? '#97C459' : '#ddd'}`, background: attended.has(p.id) ? '#97C459' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', flexShrink: 0 }}>
                    {attended.has(p.id) ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="sv-btn" onClick={onClose}>Cancel</button>
              <button className="sv-btn sv-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save & complete'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Score Modal ───────────────────────────────────────────────
function ScoresModal({ huddle, onClose }: { huddle: HuddleWithStats; onClose: () => void }) {
  const [scores, setScores] = useState<any[]>([]);
  const [allButlers, setAllButlers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getServiceSupabase();
    Promise.all([
      sb.from('huddle_quiz_attempts').select('*, profiles(name, squad)').eq('huddle_id', huddle.id).order('percentage', { ascending: false }),
      sb.from('profiles').select('id, name, squad').eq('role', 'butler').eq('is_active', true),
    ]).then(([attRes, butlerRes]: any) => {
      setScores(attRes.data ?? []);
      setAllButlers(butlerRes.data ?? []);
      setLoading(false);
    });
  }, [huddle.id]);

  const attemptedIds = new Set(scores.map((s: any) => s.butler_id));
  const notAttempted = allButlers.filter((b: any) => !attemptedIds.has(b.id));
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, s: any) => a + s.percentage, 0) / scores.length) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Quiz results — {huddle.team}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>
              {scores.length} attempted · {notAttempted.length} pending · avg score {avgScore}%
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 16 }} />

        {loading ? <div style={{ textAlign: 'center', color: 'var(--muted-fg)', padding: 32 }}>Loading…</div> : <>

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Attempted', value: scores.length, color: '#2D5A0E', bg: 'rgba(151,196,89,0.1)' },
              { label: 'Pending', value: notAttempted.length, color: '#7A4A08', bg: 'rgba(254,213,169,0.2)' },
              { label: 'Avg score', value: `${avgScore}%`, color: '#0C447C', bg: 'rgba(156,204,252,0.1)' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '12px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Scores */}
          {scores.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted-fg)', padding: '16px 0', fontSize: 13 }}>No attempts yet.</div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Scores</div>
              {scores.map((s: any, i: number) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-fg)' }}>{i+1}</span>}
                  </div>
                  <div className="sv-avatar">{(s.profiles?.name ?? '??').slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.profiles?.name ?? '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 1 }}>{s.profiles?.squad ?? '—'} · {s.score}/{s.total} correct</div>
                    <div className="progress-track" style={{ marginTop: 5 }}>
                      <div className={`progress-fill ${s.percentage >= 80 ? 'fill-green' : s.percentage >= 60 ? 'fill-blue' : 'fill-coral'}`} style={{ width: `${s.percentage}%` }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.percentage >= 80 ? '#2D5A0E' : s.percentage >= 60 ? '#0C447C' : '#8B2020', flexShrink: 0 }}>
                    {s.percentage}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Not attempted */}
          {notAttempted.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Not attempted yet</div>
              {notAttempted.map((b: any) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                  <div className="sv-avatar" style={{ opacity: 0.5 }}>{(b.name || '??').slice(0,2).toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--muted-fg)' }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', opacity: 0.6 }}>{b.squad ?? '—'}</div>
                  </div>
                  <span className="badge badge-amber" style={{ marginLeft: 'auto' }}>Pending</span>
                </div>
              ))}
            </div>
          )}
        </>}
      </div>
    </div>
  );
}

// ── Calendar view ─────────────────────────────────────────────
function CalendarView({ huddles }: { huddles: HuddleWithStats[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0

  const huddlesByDay: Record<number, HuddleWithStats[]> = {};
  huddles.forEach(h => {
    const d = new Date(h.huddle_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!huddlesByDay[day]) huddlesByDay[day] = [];
      huddlesByDay[day].push(h);
    }
  });

  return (
    <div className="sv-card" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
        {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dayHuddles = huddlesByDay[day] ?? [];
          const isToday = day === today.getDate();
          return (
            <div key={day} className={`cal-day ${isToday ? 'today' : ''}`} style={{ minHeight: 70 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? '#0C447C' : 'var(--sv-mid)', marginBottom: 2 }}>{day}</div>
              {dayHuddles.map((h, i) => (
                <span key={i} className="cal-dot" style={{ background: h.status === 'completed' ? 'rgba(151,196,89,0.2)' : 'rgba(156,204,252,0.25)', color: h.status === 'completed' ? '#2D5A0E' : '#0C447C', fontSize: 9 }}>
                  ◎ {h.team.split(' ')[0]}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function HuddlePage() {
  const { user } = useAuth();
  const isSuper = user && isSupervisor(user.role as any);
  const [huddles, setHuddles] = useState<HuddleWithStats[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [attendanceHuddle, setAttendanceHuddle] = useState<HuddleWithStats | null>(null);
  const [scoresHuddle, setScoresHuddle] = useState<HuddleWithStats | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  async function load() {
    const sb = getServiceSupabase();
    const [h, p, att, qs] = await Promise.all([
      fetchHuddles(),
      fetchProfiles(),
      sb.from('huddle_attendance').select('huddle_id, attended'),
      sb.from('huddle_quiz_questions').select('huddle_id'),
    ]);

    const attMap: Record<string, number> = {};
    (att.data ?? []).forEach((a: any) => { if (a.attended) attMap[a.huddle_id] = (attMap[a.huddle_id] ?? 0) + 1; });

    const qMap: Record<string, number> = {};
    (qs.data ?? []).forEach((q: any) => { qMap[q.huddle_id] = (qMap[q.huddle_id] ?? 0) + 1; });

    const enriched = h.map(huddle => ({ ...huddle, attendanceCount: attMap[huddle.id] ?? 0, hasQuiz: (qMap[huddle.id] ?? 0) > 0, questionCount: qMap[huddle.id] ?? 0 }));
    setHuddles(enriched); setProfiles(p); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const upcoming = huddles.filter(h => h.status === 'scheduled' || h.status === 'tbc');
  const completed = huddles.filter(h => h.status === 'completed');
  const butlers = profiles.filter(p => p.role === 'butler');

  return (
    <>
      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onSaved={load} />}
      {attendanceHuddle && <AttendanceModal huddle={attendanceHuddle} profiles={profiles} onClose={() => setAttendanceHuddle(null)} onSaved={load} />}
      {scoresHuddle && <ScoresModal huddle={scoresHuddle} onClose={() => setScoresHuddle(null)} />}

      <Topbar title="Butler huddles" subtitle="Schedule, attendance and quiz scores"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, overflow: 'hidden' }}>
              {(['list','calendar'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{ padding: '6px 12px', fontSize: 12, border: 'none', background: view === v ? '#1B1D1F' : 'white', color: view === v ? '#fff' : 'var(--sv-dark)', cursor: 'pointer', fontWeight: view === v ? 600 : 400 }}>
                  {v === 'list' ? '☰ List' : '◫ Calendar'}
                </button>
              ))}
            </div>
            {isSuper && <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowSchedule(true)}>+ Schedule huddle</button>}
          </div>
        }
      />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total huddles', value: huddles.length, cls: 'blue' },
            { label: 'Upcoming', value: upcoming.length, cls: 'green' },
            { label: 'Completed', value: completed.length, cls: 'peach' },
            { label: 'Butlers', value: butlers.length, cls: 'coral' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        {/* Calendar view */}
        {view === 'calendar' && <CalendarView huddles={huddles} />}

        {/* List view */}
        {view === 'list' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
              {/* Upcoming */}
              <div className="sv-card">
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Upcoming huddles</div>
                {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
                  upcoming.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>◎</div>
                      <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 12 }}>No upcoming huddles.</div>
                      {isSuper && <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowSchedule(true)}>+ Schedule first huddle</button>}
                    </div>
                  ) : upcoming.map(h => {
                    const d = new Date(h.huddle_date);
                    return (
                      <div key={h.id} style={{ display: 'flex', gap: 14, background: 'var(--muted)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                        <div className="huddle-date">
                          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
                          <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase' }}>{d.toLocaleString('default', { month: 'short' })}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{h.team}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>
                            {h.time ? h.time.slice(0,5) : '—'} · {h.participants_expected} expected
                          </div>
                          {h.hasQuiz && <div style={{ fontSize: 11, marginTop: 3 }}><span className="badge badge-blue">Quiz: {h.questionCount}q</span></div>}
                          {h.notes && <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4, fontStyle: 'italic' }}>{h.notes}</div>}

                          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span>
                            {isSuper && <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setAttendanceHuddle(h)}>Mark attendance</button>}
                            {isSuper && h.hasQuiz && (
                              <button className="sv-btn" style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(156,204,252,0.15)', borderColor: '#9CCCFC', color: '#0C447C', fontWeight: 600 }} onClick={() => setScoresHuddle(h)}>
                                📊 View scores
                              </button>
                            )}
                            {!isSuper && user && (
                              <ButlerAttendButton huddleId={h.id} butlerId={user.id} />
                            )}
                            {h.hasQuiz && !isSuper && (
                              <a href={`/huddle-quiz?huddle=${h.id}`} style={{ textDecoration: 'none' }}>
                                <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '3px 10px', background: '#97C459', border: 'none' }}>
                                  📝 Take quiz
                                </button>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Attendance summary — admin sees all butlers, butler sees only own */}
              <div className="sv-card">
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
                  {isSuper ? 'Overall butler attendance' : 'My huddle attendance'}
                </div>
                {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
                  isSuper ? (
                    // Admin/supervisor: show all butlers
                    butlers.length === 0
                      ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No butlers yet.</div>
                      : butlers.map(p => {
                          const totalCompleted = completed.length;
                          return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                              <div className="sv-avatar">{(p.name || '??').slice(0,2).toUpperCase()}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 1 }}>{p.squad ?? '—'}</div>
                              </div>
                              {totalCompleted > 0 && <span className="badge badge-blue">{totalCompleted} huddle{totalCompleted !== 1 ? 's' : ''}</span>}
                            </div>
                          );
                        })
                  ) : (
                    // Butler: show only their own upcoming huddles and attendance
                    upcoming.length === 0
                      ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No upcoming huddles scheduled.</div>
                      : upcoming.map(h => (
                          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                            <div style={{ fontSize: 22 }}>💬</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{h.team}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 1 }}>
                                {new Date(h.huddle_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                {h.time ? ' · ' + h.time.slice(0,5) : ''}
                              </div>
                            </div>
                            {user && <ButlerAttendButton huddleId={h.id} butlerId={user.id} />}
                          </div>
                        ))
                  )
                }
              </div>
            </div>

            {/* All huddles table */}
            <div className="sv-card">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>All huddles</div>
              {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
                huddles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted-fg)', fontSize: 13 }}>
                    No huddles yet. Schedule your first one above.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="sv-table">
                      <thead>
                        <tr><th>Huddle</th><th>Date</th><th>Time</th><th>Expected</th><th>Attended</th><th>Quiz</th><th>Status</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {huddles.map(h => (
                          <tr key={h.id}>
                            <td style={{ fontWeight: 500 }}>{h.team}</td>
                            <td style={{ color: 'var(--muted-fg)' }}>{new Date(h.huddle_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td style={{ color: 'var(--muted-fg)' }}>{h.time ? h.time.slice(0,5) : '—'}</td>
                            <td>{h.participants_expected}</td>
                            <td>
                              <span style={{ fontSize: 13, fontWeight: 600, color: (h.attendanceCount ?? 0) > 0 ? '#2D5A0E' : 'var(--muted-fg)' }}>
                                {h.attendanceCount ?? 0}
                              </span>
                            </td>
                            <td>
                              {h.hasQuiz
                                ? <span className="badge badge-blue">{h.questionCount}q</span>
                                : <span style={{ color: 'var(--muted-fg)', fontSize: 12 }}>—</span>}
                            </td>
                            <td><span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {isSuper && h.status !== 'completed' && <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setAttendanceHuddle(h)}>Attendance</button>}
                                {h.hasQuiz && isSuper && <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setScoresHuddle(h)}>Scores</button>}
                                {h.hasQuiz && !isSuper && (
                                  <a href={`/huddle-quiz?huddle=${h.id}`} style={{ textDecoration: 'none' }}>
                                    <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '4px 8px', background: '#97C459', border: 'none', color: '#fff' }}>📝 Take quiz</button>
                                  </a>
                                )}
                                {isSuper && <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px', color: '#8B2020', borderColor: '#E9A0A7' }}
                                  onClick={async () => { if (confirm('Delete this huddle?')) { await getServiceSupabase().from('huddles').delete().eq('id', h.id); load(); } }}>
                                  ✕
                                </button>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
