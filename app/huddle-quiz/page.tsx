'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { getSupabase } from '@/lib/supabase';

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
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);

  useEffect(() => {
    if (!huddleId) return;
    async function load() {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      const userId = session?.user?.id;

      const [hRes, qRes, aRes] = await Promise.all([
        sb.from('huddles').select('*').eq('id', huddleId).single(),
        sb.from('huddle_quiz_questions').select('*').eq('huddle_id', huddleId).order('order_no'),
        userId ? sb.from('huddle_quiz_attempts').select('*').eq('huddle_id', huddleId).eq('butler_id', userId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setHuddle(hRes.data);
      setQuestions(qRes.data ?? []);
      if (aRes.data) { setAlreadyDone(true); setScore(aRes.data.percentage); }
      setLoading(false);
    }
    load();
  }, [huddleId]);

  async function handleSubmit() {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return;

    let correct = 0;
    questions.forEach(q => { if (answers[q.id] === q.correct_option) correct++; });
    const pct = Math.round((correct / questions.length) * 100);

    await sb.from('huddle_quiz_attempts').upsert({
      huddle_id: huddleId,
      butler_id: session.user.id,
      answers,
      score: correct,
      total: questions.length,
      percentage: pct,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'huddle_id,butler_id' });

    setScore(pct);
    setSubmitted(true);
  }

  const q = questions[currentQ];
  const opts = q ? [{ key: 'a', label: q.option_a }, { key: 'b', label: q.option_b }, { key: 'c', label: q.option_c }, { key: 'd', label: q.option_d }] : [];

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted-fg)' }}>Loading quiz…</div>;
  if (!huddleId || !huddle) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>Huddle not found.</div>;
  if (questions.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>No quiz for this huddle.</div>;

  return (
    <>
      <Topbar title={`Quiz — ${huddle.team}`} subtitle={`${questions.length} questions`} />
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }} className="page-enter">
        <div className="sv-strip" />

        {alreadyDone && !submitted ? (
          <div className="sv-card" style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Already completed!</div>
            <div style={{ fontSize: 14, color: 'var(--muted-fg)', marginBottom: 20 }}>Your score: {score}%</div>
            <div style={{ width: 80, height: 80, borderRadius: '50%', border: `6px solid ${score >= 80 ? '#97C459' : score >= 60 ? '#9CCCFC' : '#E9A0A7'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, margin: '0 auto 24px' }}>{score}%</div>
            <button className="sv-btn" onClick={() => router.push('/huddle')}>← Back to huddles</button>
          </div>
        ) : submitted ? (
          <div className="sv-card" style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{score >= 80 ? '🎉' : score >= 60 ? '👏' : '📚'}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Quiz complete!</div>
            <div style={{ width: 90, height: 90, borderRadius: '50%', border: `7px solid ${score >= 80 ? '#97C459' : score >= 60 ? '#9CCCFC' : '#E9A0A7'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, margin: '16px auto 20px' }}>{score}%</div>
            <div style={{ fontSize: 14, color: 'var(--muted-fg)', marginBottom: 20 }}>
              {score >= 80 ? 'Excellent work!' : score >= 60 ? 'Good effort!' : 'Keep studying!'}
            </div>
            <button className="sv-btn sv-btn-primary" onClick={() => router.push('/huddle')}>← Back to huddles</button>
          </div>
        ) : (
          <div className="sv-card">
            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-fg)' }}>Question {currentQ + 1} of {questions.length}</div>
              <span className="badge badge-blue">{Object.keys(answers).length}/{questions.length} answered</span>
            </div>
            <div className="progress-track" style={{ marginBottom: 22 }}>
              <div className="progress-fill fill-blue" style={{ width: `${((currentQ) / questions.length) * 100}%` }} />
            </div>

            {/* Question */}
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, marginBottom: 20, color: 'var(--sv-dark)' }}>{q.question}</div>

            {/* Options */}
            {opts.map(opt => {
              const isSelected = answers[q.id] === opt.key;
              return (
                <div key={opt.key} className="quiz-opt" style={{ borderColor: isSelected ? '#9CCCFC' : undefined, background: isSelected ? 'rgba(156,204,252,0.08)' : undefined }}
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: isSelected ? '#9CCCFC' : 'var(--muted)', color: isSelected ? '#0C447C' : 'var(--muted-fg)' }}>
                    {opt.key.toUpperCase()}
                  </span>
                  {opt.label}
                </div>
              );
            })}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              {currentQ > 0 && <button className="sv-btn" onClick={() => setCurrentQ(c => c - 1)}>← Prev</button>}
              {currentQ < questions.length - 1 ? (
                <button className="sv-btn sv-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCurrentQ(c => c + 1)}>
                  Next →
                </button>
              ) : (
                <button className="sv-btn sv-btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={handleSubmit} disabled={Object.keys(answers).length < questions.length}>
                  Submit quiz
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
