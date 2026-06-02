'use client';
import { useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import { quizLeaderboard, quizQuestions } from '@/lib/data';

export default function QuizPage() {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizDone, setQuizDone] = useState(false);

  const q = quizQuestions[currentQ];

  function handleSelect(i: number) {
    if (submitted) return;
    setSelected(i);
  }

  function handleNext() {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    const correct = selected === q.correct;
    if (correct) setScore(s => s + 1);
    setAnswers(newAnswers);

    if (currentQ < quizQuestions.length - 1) {
      setCurrentQ(c => c + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setQuizDone(true);
    }
  }

  function handleSubmit() {
    if (selected === null) return;
    setSubmitted(true);
  }

  function handleReset() {
    setCurrentQ(0);
    setSelected(null);
    setSubmitted(false);
    setScore(0);
    setAnswers([]);
    setQuizDone(false);
  }

  const rankEmoji = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;

  return (
    <>
      <Topbar
        title="Training quizzes"
        subtitle="F&B service standards · June 2026"
        actions={<button className="sv-btn" style={{ fontSize: 12 }}>All quizzes</button>}
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Quiz panel */}
          <div className="sv-card">
            {quizDone ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>
                  {score === quizQuestions.length ? '🎉' : score >= quizQuestions.length / 2 ? '👏' : '📚'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                  Quiz complete!
                </div>
                <div style={{ fontSize: 14, color: 'var(--muted-fg)', marginBottom: 20 }}>
                  You scored {score} out of {quizQuestions.length}
                </div>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%',
                  border: `6px solid ${score >= 2 ? '#97C459' : '#E9A0A7'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 700,
                  margin: '0 auto 24px',
                }}>
                  {Math.round((score / quizQuestions.length) * 100)}%
                </div>
                <button className="sv-btn sv-btn-primary" onClick={handleReset} style={{ fontSize: 13 }}>
                  Retake quiz
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Active quiz — F&B service standards</div>
                  <span className="badge badge-blue">Q{currentQ + 1}/{quizQuestions.length}</span>
                </div>

                {/* Progress */}
                <div className="progress-track" style={{ marginBottom: 16 }}>
                  <div className="progress-fill fill-blue" style={{ width: `${((currentQ) / quizQuestions.length) * 100}%` }} />
                </div>

                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sv-dark)', marginBottom: 18, lineHeight: 1.5 }}>
                  {q.question}
                </div>

                {q.options.map((opt, i) => {
                  const isSelected = selected === i;
                  const isCorrect = submitted && i === q.correct;
                  const isWrong = submitted && isSelected && i !== q.correct;
                  return (
                    <div
                      key={i}
                      className={`quiz-opt ${isSelected && !submitted ? 'selected' : ''} ${isCorrect ? 'correct' : ''}`}
                      style={isWrong ? { borderColor: '#E9A0A7', background: 'rgba(233,160,167,0.08)' } : {}}
                      onClick={() => handleSelect(i)}
                    >
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                        background: isCorrect ? '#97C459' : isWrong ? '#E9A0A7' : isSelected ? '#9CCCFC' : 'var(--muted)',
                        color: isCorrect ? '#2D5A0E' : isWrong ? '#7A2D42' : isSelected ? '#0C447C' : 'var(--muted-fg)',
                      }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </div>
                  );
                })}

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  {!submitted ? (
                    <button
                      className="sv-btn sv-btn-primary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                      onClick={handleSubmit}
                      disabled={selected === null}
                    >
                      Submit answer
                    </button>
                  ) : (
                    <button
                      className="sv-btn sv-btn-primary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                      onClick={handleNext}
                    >
                      {currentQ < quizQuestions.length - 1 ? 'Next question →' : 'See results'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Leaderboard */}
          <div className="sv-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Leaderboard</div>
              <span className="badge badge-blue">F&B quiz</span>
            </div>
            {quizLeaderboard.map((entry) => (
              <div key={entry.rank} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                <div style={{ width: 28, textAlign: 'center', fontSize: 14, flexShrink: 0 }}>
                  {typeof rankEmoji(entry.rank) === 'string' && entry.rank <= 3
                    ? rankEmoji(entry.rank)
                    : <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-fg)' }}>{entry.rank}</span>
                  }
                </div>
                <div className="sv-avatar">{entry.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>
                    {entry.status === 'done' ? `Completed in ${entry.time}` : 'In progress'}
                  </div>
                </div>
                <div style={{
                  fontSize: 17, fontWeight: 700,
                  color: entry.status === 'pending' ? 'var(--muted-fg)' : entry.score >= 90 ? '#2D5A0E' : 'var(--sv-dark)',
                }}>
                  {entry.status === 'pending' ? '—' : `${entry.score}%`}
                </div>
              </div>
            ))}

            {/* Quiz stats */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Quiz statistics</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Avg score', value: '90%' },
                  { label: 'Completed', value: '4/6' },
                  { label: 'Avg time', value: '11 min' },
                  { label: 'Top scorer', value: 'Ravi K.' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--muted)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted-fg)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
