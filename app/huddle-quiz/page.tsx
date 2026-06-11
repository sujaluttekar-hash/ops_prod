'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { getServiceSupabase } from '@/lib/supabase';

function HuddleQuizContent() {
  const params = useSearchParams();
  const router = useRouter();
  const huddleId = params.get('huddle');
  const [questions, setQuestions] = useState<any[]>([]);
  const [huddle, setHuddle] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);

  // Get current user from localStorage (local session auth)
  function getCurrentUserId(): string | null {
    try {
      const s = localStorage.getItem('sv_local_session');
      if (s) return JSON.parse(s).id;
    } catch {}
    return null;
  }
  function getCurrentUserName(): string {
    try {
      const s = localStorage.getItem('sv_local_session');
      if (s) return JSON.parse(s).name || 'Butler';
    } catch {}
    return 'Butler';
  }

  useEffect(() => {
    if (!huddleId) return;
    async function load() {
      const sb = getServiceSupabase();
      const userId = getCurrentUserId();
      const [hRes, qRes, aRes] = await Promise.all([
        sb.from('huddles').select('*').eq('id', huddleId).single(),
        sb.from('huddle_quiz_questions').select('*').eq('huddle_id', huddleId).order('order_no'),
        userId ? sb.from('huddle_quiz_attempts').select('*').eq('huddle_id', huddleId).eq('butler_id', userId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setHuddle(hRes.data);
      setQuestions(qRes.data ?? []);
      if ((aRes as any).data) { setAlreadyDone(true); setScore((aRes as any).data.percentage); }
      setLoading(false);
    }
    load();
  }, [huddleId]);

  async function handleSubmit() {
    const userId = getCurrentUserId();
    if (!userId) { alert('Please log in to submit the quiz.'); return; }
    setSaving(true);

    let correct = 0;
    questions.forEach(q => { if (answers[q.id] === q.correct_option) correct++; });
    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

    const { error } = await getServiceSupabase().from('huddle_quiz_attempts').upsert({
      huddle_id: huddleId,
      butler_id: userId,
      answers: JSON.stringify(answers),
      score: correct,
      total: questions.length,
      percentage: pct,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'huddle_id,butler_id' });

    if (error) {
      console.error('Submit error:', error);
      alert('Error saving quiz: ' + error.message);
      setSaving(false);
      return;
    }

    setScore(pct);
    setSubmitted(true);
    setSaving(false);
  }

  const q = questions[currentQ];
  const opts = q ? [
    { key: 'a', label: q.option_a },
    { key: 'b', label: q.option_b },
    { key: 'c', label: q.option_c },
    { key: 'd', label: q.option_d },
  ].filter(o => o.label) : [];

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted-fg)' }}>Loading quiz…</div>;
  if (!huddleId || !huddle) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>Huddle not found.</div>;
  if (questions.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>No quiz attached to this huddle.</div>;

  return (
    <>
      <Topbar title={`Quiz — ${huddle.team}`} subtitle={`${questions.length} question${questions.length !== 1 ? 's' : ''}`} />
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }} className="page-enter">
        <div className="sv-strip" />

        {/* Already completed */}
        {alreadyDone && !submitted ? (
          <div className="sv-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Already completed!</div>
            <div style={{ fontSize: 14, color: 'var(--muted-fg)', marginBottom: 20 }}>You scored {score}% on this quiz.</div>
            <div style={{ width: 80, height: 80, borderRadius: '50%', border: `6px solid ${score >= 80 ? '#97C459' : score >= 60 ? '#9CCCFC' : '#E9A0A7'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, margin: '0 auto 24px', color: score >= 80 ? '#2D5A0E' : score >= 60 ? '#0C447C' : '#8B2020' }}>
              {score}%
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="sv-btn" onClick={() => router.push('/huddle')}>← Back to huddles</button>
              <button className="sv-btn sv-btn-primary" onClick={() => setAlreadyDone(false)}>Retake quiz</button>
            </div>
          </div>

        /* Submitted */
        ) : submitted ? (
          <div className="sv-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>{score >= 80 ? '🎉' : score >= 60 ? '👏' : '📚'}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Quiz submitted!</div>
            <div style={{ width: 90, height: 90, borderRadius: '50%', border: `7px solid ${score >= 80 ? '#97C459' : score >= 60 ? '#9CCCFC' : '#E9A0A7'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, margin: '16px auto 20px', color: score >= 80 ? '#2D5A0E' : score >= 60 ? '#0C447C' : '#8B2020' }}>
              {score}%
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted-fg)', marginBottom: 24 }}>
              {score >= 80 ? 'Excellent work! 🌟' : score >= 60 ? 'Good effort! Keep it up.' : 'Review the material and try again.'}
            </div>
            <button className="sv-btn sv-btn-primary" onClick={() => router.push('/huddle')}>← Back to huddles</button>
          </div>

        /* Quiz in progress */
        ) : (
          <div className="sv-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-fg)' }}>Question {currentQ + 1} of {questions.length}</div>
              <span className="badge badge-blue">{Object.keys(answers).length}/{questions.length} answered</span>
            </div>
            <div className="progress-track" style={{ marginBottom: 22 }}>
              <div className="progress-fill fill-blue" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
            </div>

            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, marginBottom: 20 }}>{q.question}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {opts.map(opt => {
                const isSelected = answers[q.id] === opt.key;
                return (
                  <div key={opt.key}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${isSelected ? '#9CCCFC' : 'rgba(0,0,0,0.1)'}`, background: isSelected ? 'rgba(156,204,252,0.08)' : '#fff', cursor: 'pointer', transition: 'all 0.12s' }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: isSelected ? '#9CCCFC' : 'var(--muted)', color: isSelected ? '#0C447C' : 'var(--muted-fg)' }}>
                      {opt.key.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 400 }}>{opt.label}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
              {currentQ > 0 && <button className="sv-btn" onClick={() => setCurrentQ(c => c - 1)}>← Prev</button>}
              {currentQ < questions.length - 1 ? (
                <button className="sv-btn sv-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCurrentQ(c => c + 1)}>
                  Next →
                </button>
              ) : (
                <button className="sv-btn sv-btn-primary"
                  style={{ flex: 1, justifyContent: 'center', background: saving ? 'rgba(156,204,252,0.5)' : undefined }}
                  onClick={handleSubmit}
                  disabled={saving || Object.keys(answers).length < questions.length}>
                  {saving ? 'Submitting…' : `Submit quiz (${Object.keys(answers).length}/${questions.length})`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function HuddleQuizPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <HuddleQuizContent />
    </Suspense>
  );
}
