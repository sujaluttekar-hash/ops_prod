'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getSupabase, getServiceSupabase, fetchQuizzes, fetchQuizQuestions, createQuiz, submitQuizAttempt, fetchTrainings, type Quiz, type QuizQuestion, type Training } from '@/lib/supabase';
import { getCurrentUser, isSupervisor } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────
type QuizWithTraining = Quiz & { trainings?: { name: string } | null };
type AppUser = { id: string; name: string; role: string };
type NewQuestion = { question: string; options: string[]; correct_answer: string; type: 'mcq' | 'true_false' };

// ─── Create Quiz Modal (supervisor/admin only) ────────────────
function CreateQuizModal({ trainings, onClose, onSaved }: { trainings: Training[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', training_id: '', pass_percentage: '70', time_limit: '' });
  const [questions, setQuestions] = useState<NewQuestion[]>([
    { question: '', options: ['', '', '', ''], correct_answer: '0', type: 'mcq' },
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  function updateQ(i: number, k: keyof NewQuestion, v: any) {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [k]: v } : q));
  }
  function updateOption(qi: number, oi: number, v: string) {
    setQuestions(prev => prev.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? v : o) } : q));
  }
  function addQ() {
    setQuestions(prev => [...prev, { question: '', options: ['', '', '', ''], correct_answer: '0', type: 'mcq' }]);
  }
  function removeQ(i: number) { setQuestions(prev => prev.filter((_, idx) => idx !== i)); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const valid = questions.filter(q => q.question.trim() && (q.type !== 'mcq' || q.options.every(o => o.trim())));
    if (valid.length === 0) { setError('Add at least one complete question'); return; }
    setSaving(true); setError('');
    try {
      const { error: err } = await createQuiz({
        title: form.title,
        description: form.description || undefined,
        training_id: form.training_id || null,
        pass_percentage: parseInt(form.pass_percentage) || 70,
        time_limit_minutes: form.time_limit ? parseInt(form.time_limit) : null,
        questions: valid.map((q, i) => ({
          question: q.question,
          type: q.type,
          options: q.type === 'mcq' ? q.options : ['True', 'False'],
          correct_answer: q.type === 'true_false' ? q.correct_answer : q.options[parseInt(q.correct_answer)] || q.options[0],
          order_no: i + 1,
        })),
      });
      if (err) throw new Error((err as any).message || 'Failed to create quiz');
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 900);
    } catch (err: any) { setError(err.message); setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 640, boxShadow: '0 32px 80px rgba(0,0,0,0.2)', marginTop: 20, marginBottom: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Create quiz</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>Set questions, correct answers and pass mark</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 20 }} />

        {saved ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Quiz created!</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>Butlers can now take this quiz.</div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {error && <div style={{ background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}

            {/* Quiz meta */}
            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Quiz title *</div>
                <input className="sv-input" style={{ width: '100%' }} placeholder="e.g. F&B Service Standards" value={form.title} onChange={f('title')} required />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Linked training (optional)</div>
                <select className="sv-select" style={{ width: '100%' }} value={form.training_id} onChange={f('training_id')}>
                  <option value="">Standalone quiz</option>
                  {trainings.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Pass mark (%)</div>
                  <input className="sv-input" style={{ width: '100%' }} type="number" min="1" max="100" value={form.pass_percentage} onChange={f('pass_percentage')} />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Time limit (mins)</div>
                  <input className="sv-input" style={{ width: '100%' }} type="number" min="1" placeholder="No limit" value={form.time_limit} onChange={f('time_limit')} />
                </div>
              </div>
            </div>

            {/* Questions */}
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              Questions ({questions.length})
            </div>

            {questions.map((q, qi) => (
              <div key={qi} style={{ background: 'var(--muted)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-fg)' }}>Question {qi + 1}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)', background: '#fff' }}
                      value={q.type} onChange={e => updateQ(qi, 'type', e.target.value as any)}>
                      <option value="mcq">Multiple choice</option>
                      <option value="true_false">True / False</option>
                    </select>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQ(qi)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#8B2020', cursor: 'pointer' }}>Remove</button>
                    )}
                  </div>
                </div>
                <input className="sv-input" style={{ width: '100%', marginBottom: 10, background: '#fff' }}
                  placeholder="Enter question text"
                  value={q.question}
                  onChange={e => updateQ(qi, 'question', e.target.value)}
                  required />

                {q.type === 'mcq' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    {q.options.map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button type="button"
                          onClick={() => updateQ(qi, 'correct_answer', String(oi))}
                          style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${q.correct_answer === String(oi) ? '#97C459' : '#ddd'}`, background: q.correct_answer === String(oi) ? '#97C459' : 'white', cursor: 'pointer', flexShrink: 0, fontSize: 11, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {q.correct_answer === String(oi) ? '✓' : ''}
                        </button>
                        <input className="sv-input" style={{ flex: 1, fontSize: 12, background: '#fff', border: `1px solid ${q.correct_answer === String(oi) ? '#97C459' : 'rgba(0,0,0,0.12)'}` }}
                          placeholder={`Option ${oi + 1}`}
                          value={opt}
                          onChange={e => updateOption(qi, oi, e.target.value)}
                          required />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['True', 'False'].map((val, oi) => (
                      <button key={val} type="button"
                        onClick={() => updateQ(qi, 'correct_answer', val)}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1.5px solid ${q.correct_answer === val ? '#97C459' : 'rgba(0,0,0,0.12)'}`, background: q.correct_answer === val ? 'rgba(151,196,89,0.12)' : '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: q.correct_answer === val ? '#2D5A0E' : 'var(--sv-dark)' }}>
                        {val}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {questions.length < 20 && (
              <button type="button" className="sv-btn" style={{ width: '100%', justifyContent: 'center', marginBottom: 16, fontSize: 12 }} onClick={addQ}>
                + Add question ({questions.length}/20)
              </button>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="sv-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="sv-btn sv-btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create quiz'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Take Quiz Modal (butler) ─────────────────────────────────
function TakeQuizModal({ quiz, userId, onClose, onDone }: { quiz: QuizWithTraining; userId: string; onClose: () => void; onDone: () => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'loading' | 'quiz' | 'result'>('loading');
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuizQuestions(quiz.id).then(qs => { setQuestions(qs); setStep('quiz'); });
  }, [quiz.id]);

  async function handleSubmit() {
    setSubmitting(true);
    let score = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) score++;
    });
    const passed = (score / questions.length * 100) >= (quiz.pass_percentage || 70);
    setResult({ score, total: questions.length, passed });
    await submitQuizAttempt({ quiz_id: quiz.id, butler_id: userId, answers, score, total: questions.length, passed });
    setStep('result');
    setSubmitting(false);
  }

  const allAnswered = questions.every(q => answers[q.id]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 600, boxShadow: '0 32px 80px rgba(0,0,0,0.25)', marginTop: 20, marginBottom: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{quiz.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>
              {quiz.trainings?.name ?? 'Standalone'} · Pass: {quiz.pass_percentage ?? 70}%
              {quiz.time_limit_minutes ? ` · ${quiz.time_limit_minutes} min` : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 20 }} />

        {step === 'loading' && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted-fg)' }}>Loading questions…</div>}

        {step === 'quiz' && (
          <>
            {questions.map((q, qi) => {
              const opts: string[] = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : ['True', 'False']);
              return (
                <div key={q.id} style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                    <span style={{ color: 'var(--muted-fg)', marginRight: 8 }}>{qi + 1}.</span>{q.question}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {opts.map((opt, oi) => (
                      <button key={oi} type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${answers[q.id] === opt ? '#9CCCFC' : 'rgba(0,0,0,0.1)'}`, background: answers[q.id] === opt ? 'rgba(156,204,252,0.12)' : 'white', fontSize: 13, cursor: 'pointer', fontWeight: answers[q.id] === opt ? 600 : 400, transition: 'all 0.12s' }}>
                        <span style={{ color: 'var(--muted-fg)', marginRight: 8 }}>{String.fromCharCode(65 + oi)}.</span>{opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="sv-btn" onClick={onClose}>Cancel</button>
              <button className="sv-btn sv-btn-primary" onClick={handleSubmit} disabled={!allAnswered || submitting}>
                {submitting ? 'Submitting…' : `Submit (${Object.keys(answers).length}/${questions.length})`}
              </button>
            </div>
          </>
        )}

        {step === 'result' && result && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>{result.passed ? '🎉' : '📝'}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              {Math.round(result.score / result.total * 100)}%
            </div>
            <div style={{ fontSize: 15, color: 'var(--muted-fg)', marginBottom: 16 }}>
              {result.score} out of {result.total} correct
            </div>
            <div style={{ display: 'inline-block', padding: '8px 22px', borderRadius: 24, background: result.passed ? 'rgba(151,196,89,0.15)' : 'rgba(226,75,74,0.1)', color: result.passed ? '#2D5A0E' : '#8B2020', fontWeight: 700, fontSize: 14, marginBottom: 24 }}>
              {result.passed ? '✓ Passed' : '✗ Try again'}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="sv-btn" onClick={onClose}>Close</button>
              {!result.passed && <button className="sv-btn sv-btn-primary" onClick={() => { setAnswers({}); setStep('quiz'); }}>Retry</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Leaderboard for a quiz ───────────────────────────────────
function LeaderboardModal({ quiz, onClose }: { quiz: QuizWithTraining; onClose: () => void }) {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSupabase()
      .from('quiz_attempts')
      .select('*, profiles(name, squad)')
      .eq('quiz_id', quiz.id)
      .order('score', { ascending: false })
      .then((res: any) => { setScores(res.data ?? []); setLoading(false); });
  }, [quiz.id]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Leaderboard</div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>{quiz.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 20 }} />
        {loading ? <div style={{ textAlign: 'center', color: 'var(--muted-fg)', padding: 32 }}>Loading…</div> :
          scores.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--muted-fg)', padding: 32, fontSize: 13 }}>No attempts yet for this quiz.</div> :
          scores.map((s, i) => {
            const pct = s.total > 0 ? Math.round(s.score / s.total * 100) : (s.score || 0);
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-fg)' }}>{i + 1}</span>}
                </div>
                <div className="sv-avatar">{(s.profiles?.name ?? '??').slice(0,2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.profiles?.name ?? '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{s.profiles?.squad ?? '—'}</div>
                  <div className="progress-track" style={{ marginTop: 6 }}>
                    <div className={`progress-fill ${pct >= 80 ? 'fill-green' : pct >= 60 ? 'fill-blue' : 'fill-coral'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: pct >= 80 ? '#2D5A0E' : pct >= 60 ? '#0C447C' : '#8B2020', flexShrink: 0 }}>
                  {pct}%
                </div>
                <div style={{ flexShrink: 0 }}>
                  {s.passed ? <span className="badge badge-green">Pass</span> : <span className="badge badge-red">Fail</span>}
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<QuizWithTraining[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [takeQuiz, setTakeQuiz] = useState<QuizWithTraining | null>(null);
  const [leaderboard, setLeaderboard] = useState<QuizWithTraining | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);

  async function load() {
    const [q, t, a] = await Promise.all([
      fetchQuizzes(),
      fetchTrainings(),
      getServiceSupabase().from('quiz_attempts').select('*, profiles(name), quizzes(title)').order('attempted_at', { ascending: false }).limit(30),
    ]);
    setQuizzes(q as QuizWithTraining[]);
    setTrainings(t);
    setAttempts(a.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('sv_profile') : null;
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    load();
  }, []);

  const isSuper = user && isSupervisor(user.role as any);
  const avgScore = attempts.length > 0
    ? Math.round(attempts.filter(a => a.total > 0).reduce((acc, a) => acc + (a.score / a.total * 100), 0) / attempts.filter(a => a.total > 0).length)
    : 0;
  const passRate = attempts.length > 0
    ? Math.round(attempts.filter(a => a.passed).length / attempts.length * 100)
    : 0;

  return (
    <>
      {showCreate && <CreateQuizModal trainings={trainings} onClose={() => setShowCreate(false)} onSaved={load} />}
      {takeQuiz && user && <TakeQuizModal quiz={takeQuiz} userId={user.id} onClose={() => setTakeQuiz(null)} onDone={load} />}
      {leaderboard && <LeaderboardModal quiz={leaderboard} onClose={() => setLeaderboard(null)} />}

      <Topbar
        title="Training quizzes"
        subtitle="Scores, leaderboard and quiz management"
        actions={
          isSuper ? (
            <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowCreate(true)}>
              + Create quiz
            </button>
          ) : undefined
        }
      />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total quizzes', value: quizzes.length, cls: 'blue' },
            { label: 'Total attempts', value: attempts.length, cls: 'green' },
            { label: 'Avg score', value: `${avgScore}%`, cls: 'peach' },
            { label: 'Pass rate', value: `${passRate}%`, cls: 'coral' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Quiz list */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Available quizzes</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              quizzes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                  <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 12 }}>
                    {isSuper ? 'No quizzes yet. Create the first one.' : 'No quizzes available yet.'}
                  </div>
                  {isSuper && <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowCreate(true)}>+ Create quiz</button>}
                </div>
              ) : quizzes.map(q => (
                <div key={q.id} style={{ padding: '14px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{q.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>
                        {q.trainings?.name ?? 'Standalone'} · Pass: {q.pass_percentage ?? 70}%
                        {q.time_limit_minutes ? ` · ${q.time_limit_minutes} min` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {isSuper && (
                        <button className="sv-btn" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setLeaderboard(q)}>
                          Scores
                        </button>
                      )}
                      <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setTakeQuiz(q)}>
                        Take quiz
                      </button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Recent attempts */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Recent attempts</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              attempts.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No attempts yet.</div> :
              attempts.slice(0, 15).map((a, i) => {
                const pct = a.total > 0 ? Math.round(a.score / a.total * 100) : (a.score ?? 0);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                    <div className="sv-avatar">{(a.profiles?.name ?? '??').slice(0,2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{a.profiles?.name ?? '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{a.quizzes?.title ?? '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: pct >= 80 ? '#2D5A0E' : pct >= 60 ? '#0C447C' : '#8B2020' }}>{pct}%</div>
                      {a.passed != null && <div style={{ marginTop: 2 }}>{a.passed ? <span className="badge badge-green" style={{ fontSize: 10 }}>Pass</span> : <span className="badge badge-red" style={{ fontSize: 10 }}>Fail</span>}</div>}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </>
  );
}
