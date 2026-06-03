'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getSupabase } from '@/lib/supabase';

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [q, a] = await Promise.all([
        getSupabase().from('quizzes').select('*, trainings(name)').order('created_at', { ascending: false }),
        getSupabase().from('quiz_attempts').select('*, profiles(name), quizzes(title)').order('completed_at', { ascending: false }).limit(20),
      ]);
      setQuizzes(q.data ?? []);
      setAttempts(a.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <Topbar title="Training quizzes" subtitle="Scores and leaderboard"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Create quiz</button>} />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total quizzes', value: quizzes.length, cls: 'blue' },
            { label: 'Total attempts', value: attempts.length, cls: 'green' },
            { label: 'Avg score', value: attempts.length > 0 ? `${Math.round(attempts.reduce((a,b) => a + (b.score/b.total*100), 0) / attempts.length)}%` : '—', cls: 'peach' },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.cls}`}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Quizzes</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              quizzes.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No quizzes created yet. Create a quiz after a training session.</div> :
              quizzes.map(q => (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{q.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{q.trainings?.name ?? '—'} · {q.total_questions} questions</div>
                  </div>
                  <button className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '5px 10px' }}>Take quiz</button>
                </div>
              ))
            }
          </div>

          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Recent attempts</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              attempts.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No quiz attempts yet.</div> :
              attempts.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                  <div className="sv-avatar">{(a.profiles?.name ?? '??').slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{a.profiles?.name ?? '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{a.quizzes?.title ?? '—'}</div>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: a.score/a.total >= 0.8 ? '#2D5A0E' : '#8B2020' }}>
                    {Math.round(a.score/a.total*100)}%
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </>
  );
}
