'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabase, getServiceSupabase } from '@/lib/supabase';

type NavItem = { label: string; href: string; icon: string };
type NavSection = { overview: NavItem[]; operations: NavItem[]; learning: NavItem[]; admin: NavItem[] };

const navByRole: Record<string, NavSection> = {
  super_admin: {
    overview: [{ label: 'Dashboard', href: '/dashboard', icon: '📊' }],
    operations: [
      { label: 'Allocation', href: '/allocation', icon: '📋' },
      { label: 'Guest delight', href: '/delight', icon: '🎁' },
      { label: 'Tasks', href: '/tasks', icon: '✓' },
      { label: 'Roster', href: '/roster', icon: '👥' },
      { label: 'Huddles', href: '/huddle', icon: '💬' },
      { label: 'Butler calendar', href: '/butler-calendar', icon: '🗓' },
    ],
    learning: [
      { label: 'Training', href: '/training', icon: '📚' },
      { label: 'Quizzes', href: '/quiz', icon: '❓' },
    ],
    admin: [
      { label: 'Credentials', href: '/credentials', icon: '🔐' },
      { label: 'MIS & Reports', href: '/reports', icon: '📈' },
      { label: 'Management', href: '/management', icon: '⚙' },
    ],
  },
  ops_manager: {
    overview: [{ label: 'Dashboard', href: '/dashboard', icon: '📊' }],
    operations: [
      { label: 'Allocation', href: '/allocation', icon: '📋' },
      { label: 'Guest delight', href: '/delight', icon: '🎁' },
      { label: 'Tasks', href: '/tasks', icon: '✓' },
      { label: 'Roster', href: '/roster', icon: '👥' },
      { label: 'Huddles', href: '/huddle', icon: '💬' },
      { label: 'Butler calendar', href: '/butler-calendar', icon: '🗓' },
    ],
    learning: [
      { label: 'Training', href: '/training', icon: '📚' },
      { label: 'Quizzes', href: '/quiz', icon: '❓' },
    ],
    admin: [{ label: 'MIS & Reports', href: '/reports', icon: '📈' }],
  },
  butler: {
    overview: [{ label: 'Dashboard', href: '/dashboard', icon: '📊' }],
    operations: [
      { label: 'Log activity', href: '/delight', icon: '🎁' },
      { label: 'Submit task', href: '/submit', icon: '✓' },
      { label: 'My roster', href: '/roster', icon: '👤' },
      { label: 'My calendar', href: '/butler-calendar', icon: '🗓' },
    ],
    learning: [
      { label: 'My trainings', href: '/training', icon: '📚' },
      { label: 'My quizzes', href: '/quiz', icon: '❓' },
      { label: 'Huddles', href: '/huddle', icon: '💬' },
    ],
    admin: [],
  },
  trainer: {
    overview: [{ label: 'Dashboard', href: '/dashboard', icon: '📊' }],
    operations: [],
    learning: [
      { label: 'Training', href: '/training', icon: '📚' },
      { label: 'Quizzes', href: '/quiz', icon: '❓' },
    ],
    admin: [],
  },
};

// ── NotificationBell component ────────────────────────────────
function NotificationBell({ userId }: { userId: string }) {
  const [notifs, setNotifs] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    getServiceSupabase()
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }: any) => setNotifs(data || []))

    // Poll every 30s
    const interval = setInterval(() => {
      getServiceSupabase()
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }: any) => setNotifs(data || []))
    }, 30000)
    return () => clearInterval(interval)
  }, [userId])

  async function markAllRead() {
    await getServiceSupabase()
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    setNotifs([])
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', marginBottom: 6 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>🔔 Notifications</span>
        {notifs.length > 0 && (
          <span style={{ background: '#E9A0A7', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
            {notifs.length > 9 ? '9+' : notifs.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#1e2228', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, marginBottom: 6, maxHeight: 280, overflowY: 'auto', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Notifications</span>
            {notifs.length > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 10, color: '#9CCCFC', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div style={{ padding: '20px 14px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>No new notifications</div>
          ) : notifs.map((n: any) => (
            <div key={n.id} style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{n.message}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isLoginPage = pathname === '/login';

  // Redirect to login only once loading is done and no user found
  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      window.location.href = '/login';
    }
  }, [loading, user, isLoginPage]);

  // Always render login page as-is
  if (isLoginPage) return <>{children}</>;

  // While loading OR no user: render children without sidebar
  // This means dashboard content starts loading immediately, no spinner gate
  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F7F5' }}>
        {children}
      </div>
    );
  }

  const nav = navByRole[user.role] || navByRole.butler;
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const roleLabel = { super_admin: 'Admin', ops_manager: 'Supervisor', trainer: 'Trainer', butler: 'Butler' }[user.role] || 'Butler';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F7F5' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#141618', position: 'fixed', left: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', zIndex: 50, overflowY: 'auto' }}>
        <div style={{ padding: '20px 12px 12px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingLeft: 4 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>S</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>STAYVISTA</div>
              <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Butler Ops</div>
            </div>
          </div>

          {nav.overview.map(item => (
            <Link key={item.href} href={item.href}>
              <div style={{ padding: '8px 10px', marginBottom: 2, borderRadius: 7, background: isActive(item.href) ? 'rgba(156,204,252,0.18)' : 'transparent', borderLeft: isActive(item.href) ? '2px solid #9CCCFC' : '2px solid transparent', color: isActive(item.href) ? '#9CCCFC' : 'rgba(255,255,255,0.65)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, fontWeight: isActive(item.href) ? 600 : 400 }}>
                <span>{item.icon}</span>{item.label}
              </div>
            </Link>
          ))}

          {nav.operations.length > 0 && <>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 16, paddingLeft: 12 }}>Operations</div>
            {nav.operations.map(item => (
              <Link key={item.href} href={item.href}>
                <div style={{ padding: '8px 10px', marginBottom: 2, borderRadius: 7, background: isActive(item.href) ? 'rgba(156,204,252,0.18)' : 'transparent', borderLeft: isActive(item.href) ? '2px solid #9CCCFC' : '2px solid transparent', color: isActive(item.href) ? '#9CCCFC' : 'rgba(255,255,255,0.65)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, fontWeight: isActive(item.href) ? 600 : 400 }}>
                  <span>{item.icon}</span>{item.label}
                </div>
              </Link>
            ))}
          </>}

          {nav.learning.length > 0 && <>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 16, paddingLeft: 12 }}>Learning</div>
            {nav.learning.map(item => (
              <Link key={item.href} href={item.href}>
                <div style={{ padding: '8px 10px', marginBottom: 2, borderRadius: 7, background: isActive(item.href) ? 'rgba(156,204,252,0.18)' : 'transparent', borderLeft: isActive(item.href) ? '2px solid #9CCCFC' : '2px solid transparent', color: isActive(item.href) ? '#9CCCFC' : 'rgba(255,255,255,0.65)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, fontWeight: isActive(item.href) ? 600 : 400 }}>
                  <span>{item.icon}</span>{item.label}
                </div>
              </Link>
            ))}
          </>}

          {nav.admin.length > 0 && <>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 16, paddingLeft: 12 }}>Admin</div>
            {nav.admin.map(item => (
              <Link key={item.href} href={item.href}>
                <div style={{ padding: '8px 10px', marginBottom: 2, borderRadius: 7, background: isActive(item.href) ? 'rgba(156,204,252,0.18)' : 'transparent', borderLeft: isActive(item.href) ? '2px solid #9CCCFC' : '2px solid transparent', color: isActive(item.href) ? '#9CCCFC' : 'rgba(255,255,255,0.65)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, fontWeight: isActive(item.href) ? 600 : 400 }}>
                  <span>{item.icon}</span>{item.label}
                </div>
              </Link>
            ))}
          </>}
        </div>

        <div style={{ padding: '12px', borderTop: '0.5px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(user.name || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{roleLabel}</div>
            </div>
          </div>
          <NotificationBell userId={user.id} />
          <button onClick={() => { localStorage.removeItem('sv_local_session'); window.location.replace('/login'); }}
            style={{ width: '100%', padding: '7px 0', background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', marginTop: 6 }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ marginLeft: 220, flex: 1, minWidth: 0, background: '#F7F7F5', color: '#1B1D1F' }}>
        {children}
      </div>
    </div>
  );
}
