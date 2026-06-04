'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchDashboardStats, fetchProfiles, fetchTrainings, type Profile, type Training } from '@/lib/supabase';
import { getCurrentUser, isAdmin, isSupervisor, type AppUser } from '@/lib/auth';
import { getStatusBadge, getStatusLabel } from '@/lib/utils';
import { getSupabase } from '@/lib/supabase';

// ── Admin / Supervisor dashboard ──────────────────────────────
function AdminDashboard({ user }: { user: AppUser }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({ delights: [], tasks: [], upcomingHuddles: [] });
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchProfiles()]).then(([s, p]) => {
      setStats(s); setProfiles(p); setLoading(false);
    });
  }, []);

  const delightDone = stats.delights.filter((d: any) => d.status === 'completed').length;
  const delightTotal = stats.delights.length;
  const taskDone = stats.tasks.filter((t: any) => t.status === 'completed').length;
  const taskTotal = stats.tasks.length;

  return (
    <div style={{ padding: 24 }} className="page-enter">
      <div className="sv-strip" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="metric-card blue">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total butlers</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : profiles.filter(p => p.role === 'butler').length}</div>
        </div>
        <div className="metric-card green">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Tasks</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : taskTotal}</div>
          <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>{taskDone} done · {taskTotal - taskDone} pending</div>
        </div>
        <div className="metric-card peach">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Guest delights</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : <>{delightDone}<span style={{ fontSize: 16, fontWeight: 400, color: 'var(--muted-fg)' }}>/{delightTotal}</span></>}</div>
          {!loading && delightTotal > 0 && <div className="progress-track" style={{ marginTop: 8 }}><div className="progress-fill fill-peach" style={{ width: `${Math.round(delightDone/delightTotal*100)}%` }} /></div>}
        </div>
        <div className="metric-card coral">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Upcoming huddles</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{loading ? '…' : stats.upcomingHuddles.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Butler roster</div>
          {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
            profiles.filter(p => p.role === 'butler').length === 0
              ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No butlers yet. Add via SQL or user management.</div>
              : profiles.filter(p => p.role === 'butler').map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                  <div className="sv-avatar">{p.name.slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{p.squad ?? '—'}</div>
                  </div>
                  <span className="badge badge-green">Active</span>
                </div>
              ))
          }
        </div>

        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Upcoming huddles</div>
          {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
            stats.upcomingHuddles.length === 0
              ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No upcoming huddles. Schedule one in Huddles.</div>
              : stats.upcomingHuddles.slice(0, 3).map((h: any) => {
                const d = new Date(h.huddle_date);
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 14, background: 'var(--muted)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div className="huddle-date">
                      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase' }}>{d.toLocaleString('default', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{h.team}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>{h.time} · {h.participants_expected} expected</div>
                      <div style={{ marginTop: 6 }}><span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span></div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}

// ── Butler dashboard ──────────────────────────────────────────
function ButlerDashboard({ user }: { user: AppUser }) {
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [huddles, setHuddles] = useState<any[]>([]);
  const [myDelights, setMyDelights] = useState<any[]>([]);
  const [pendingQuizzes, setPendingQuizzes] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      const [t, n, h, d, hq, ha] = await Promise.all([
        fetchTrainings(),
        sb.from('notifications').select('*').eq('user_id', user.id).eq('read', false).order('created_at', { ascending: false }),
        sb.from('huddles').select('*').gte('huddle_date', new Date().toISOString().split('T')[0]).order('huddle_date').limit(3),
        sb.from('guest_delights').select('*').eq('your_name', user.name).order('booking_date', { ascending: false }).limit(5),
        sb.from('huddle_quiz_questions').select('huddle_id'),
        sb.from('huddle_quiz_attempts').select('huddle_id').eq('butler_id', user.id),
      ]);
      setTrainings(t);
      setNotifications(n.data ?? []);
      // Add pending quiz notifications
      const doneHuddleIds = new Set((ha.data ?? []).map((a: any) => a.huddle_id));
      const quizHuddleIds = new Set((hq.data ?? []).map((q: any) => q.huddle_id));
      const pendingQuizzes = (h.data ?? []).filter((hd: any) => quizHuddleIds.has(hd.id) && !doneHuddleIds.has(hd.id));
      setPendingQuizzes(pendingQuizzes);
      setHuddles(h.data ?? []);
      setMyDelights(d.data ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <div style={{ padding: 24 }} className="page-enter">
      <div className="sv-strip" />

      {/* Welcome banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(156,204,252,0.12), rgba(233,160,167,0.08))', border: '0.5px solid rgba(156,204,252,0.2)', borderRadius: 14, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#1B1D1F', flexShrink: 0 }}>
          {user.initials}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Welcome, {user.name.split(' ')[0]} 👋</div>
          <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 3 }}>Squad: {user.squad ?? '—'} · Butler</div>
        </div>
        {notifications.length > 0 && (
          <div style={{ marginLeft: 'auto', background: '#E9A0A7', color: '#7A2D42', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
            🔔 {notifications.length} new
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Notifications */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
            Notifications {notifications.length > 0 && <span className="badge badge-coral" style={{ marginLeft: 6 }}>{notifications.length} new</span>}
          </div>
          {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
            notifications.length === 0 && pendingQuizzes.length === 0
              ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>You're all caught up! No new notifications.</div>
              : <>
                {pendingQuizzes.map((h: any) => (
                  <div key={h.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)', alignItems: 'center' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📝</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Quiz pending: {h.team}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{new Date(h.huddle_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <a href={`/huddle-quiz?huddle=${h.id}`} className="sv-btn sv-btn-primary" style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none' }}>Take quiz</a>
                  </div>
                ))}
                {notifications.map(n => (
                  <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>
                      {n.type === 'huddle' ? '◎' : n.type === 'training' ? '◈' : n.type === 'task' ? '✓' : '🔔'}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{n.body}</div>
                    </div>
                  </div>
                ))}
              </>
          }
        </div>

        {/* Assigned trainings */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Assigned trainings</div>
          {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
            trainings.length === 0
              ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No trainings assigned yet.</div>
              : trainings.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>◈</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>
                      {t.training_date ? new Date(t.training_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBC'}
                      {t.has_quiz && ' · Quiz included'}
                    </div>
                  </div>
                  <span className={getStatusBadge(t.status)}>{getStatusLabel(t.status)}</span>
                </div>
              ))
          }
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Upcoming huddles */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Upcoming huddles</div>
          {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
            huddles.length === 0
              ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No huddles scheduled yet.</div>
              : huddles.map((h: any) => {
                const d = new Date(h.huddle_date);
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 14, background: 'var(--muted)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div className="huddle-date">
                      <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase' }}>{d.toLocaleString('default', { month: 'short' })}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{h.team}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>{h.time}</div>
                      <div style={{ marginTop: 6 }}><span className={getStatusBadge(h.status)}>{getStatusLabel(h.status)}</span></div>
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* My recent activity */}
        <div className="sv-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>My recent activity</div>
          {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
            myDelights.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>♡</div>
                  <div style={{ fontSize: 13, color: 'var(--muted-fg)' }}>No activity logged yet.</div>
                  <a href="/delight" style={{ display: 'inline-block', marginTop: 12, padding: '8px 16px', background: '#1B1D1F', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                    Log activity
                  </a>
                </div>
              )
              : myDelights.map((d: any) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{d.villa_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>
                      {d.booking_type} · {d.booking_date ? new Date(d.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </div>
                  </div>
                  <span className={getStatusBadge(d.status)}>{getStatusLabel(d.status)}</span>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then(u => { setUser(u); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted-fg)', fontSize: 14 }}>
      Loading…
    </div>
  );

  const title = user?.role === 'butler' ? 'My dashboard' : 'Operations dashboard';
  const subtitle = user ? `${user.name} · ${user.role === 'super_admin' ? 'Admin' : user.role === 'ops_manager' ? 'Supervisor' : 'Butler'}` : '';

  return (
    <>
      <Topbar title={title} subtitle={subtitle}
        actions={
          user && isSupervisor(user.role)
            ? <a href="/huddle" className="sv-btn sv-btn-primary" style={{ fontSize: 12, textDecoration: 'none' }}>+ New huddle</a>
            : user?.role === 'butler'
            ? <a href="/delight" className="sv-btn sv-btn-primary" style={{ fontSize: 12, textDecoration: 'none' }}>+ Log activity</a>
            : null
        }
      />
      {user && (isAdmin(user.role) || user.role === 'ops_manager')
        ? <AdminDashboard user={user} />
        : user
        ? <ButlerDashboard user={user} />
        : <div style={{ padding: 24, color: 'var(--muted-fg)' }}>Could not load user profile.</div>
      }
    </>
  );
}
