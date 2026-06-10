'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase';

type NavItem = { label: string; href: string; icon: string };

const navByRole: Record<string, { overview: NavItem[]; operations: NavItem[]; learning: NavItem[]; admin: NavItem[] }> = {
  super_admin: {
    overview: [{ label: 'Dashboard', href: '/dashboard', icon: '📊' }],
    operations: [
      { label: 'Allocation', href: '/allocation', icon: '📋' },
      { label: 'Guest delight', href: '/delight', icon: '🎁' },
      { label: 'Tasks', href: '/tasks', icon: '✓' },
      { label: 'Roster', href: '/roster', icon: '👥' },
      { label: 'Huddles', href: '/huddle', icon: '💬' },
    ],
    learning: [
      { label: 'Training', href: '/training', icon: '📚' },
      { label: 'Quizzes', href: '/quiz', icon: '❓' },
    ],
    admin: [
      { label: 'Credentials', href: '/credentials', icon: '🔐' },
      { label: 'Reports', href: '/reports', icon: '📈' },
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
    ],
    learning: [
      { label: 'Training', href: '/training', icon: '📚' },
      { label: 'Quizzes', href: '/quiz', icon: '❓' },
    ],
    admin: [],
  },
  butler: {
    overview: [{ label: 'Dashboard', href: '/dashboard', icon: '📊' }],
    operations: [
      { label: 'Log activity', href: '/delight', icon: '🎁' },
      { label: 'Submit task', href: '/submit', icon: '✓' },
      { label: 'My roster', href: '/roster', icon: '👤' },
    ],
    learning: [
      { label: 'My trainings', href: '/training', icon: '📚' },
      { label: 'My quizzes', href: '/quiz', icon: '❓' },
      { label: 'Huddles', href: '/huddle', icon: '💬' },
    ],
    admin: [],
  },
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1117', color: '#fff' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  const nav = navByRole[user.role] || navByRole.butler;
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1117', color: '#fff' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#161b22', borderRight: '0.5px solid rgba(255,255,255,0.1)', overflowY: 'auto', position: 'fixed', left: 0, top: 0, bottom: 0 }}>
        <div style={{ padding: '16px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, paddingLeft: 8 }}>StayVista</div>

          {nav.overview.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6e7681', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 16, paddingLeft: 8 }}>Overview</div>
              {nav.overview.map(item => (
                <Link key={item.href} href={item.href}>
                  <div style={{
                    padding: '8px 10px', marginBottom: 4, borderRadius: 6,
                    background: isActive(item.href) ? 'rgba(88,166,255,0.15)' : 'transparent',
                    borderLeft: isActive(item.href) ? '2px solid #58a6ff' : '2px solid transparent',
                    color: isActive(item.href) ? '#58a6ff' : '#c9d1d9',
                    fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <span>{item.icon}</span> {item.label}
                  </div>
                </Link>
              ))}
            </>
          )}

          {nav.operations.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6e7681', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 16, paddingLeft: 8 }}>Operations</div>
              {nav.operations.map(item => (
                <Link key={item.href} href={item.href}>
                  <div style={{
                    padding: '8px 10px', marginBottom: 4, borderRadius: 6,
                    background: isActive(item.href) ? 'rgba(88,166,255,0.15)' : 'transparent',
                    borderLeft: isActive(item.href) ? '2px solid #58a6ff' : '2px solid transparent',
                    color: isActive(item.href) ? '#58a6ff' : '#c9d1d9',
                    fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <span>{item.icon}</span> {item.label}
                  </div>
                </Link>
              ))}
            </>
          )}

          {nav.learning.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6e7681', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 16, paddingLeft: 8 }}>Learning</div>
              {nav.learning.map(item => (
                <Link key={item.href} href={item.href}>
                  <div style={{
                    padding: '8px 10px', marginBottom: 4, borderRadius: 6,
                    background: isActive(item.href) ? 'rgba(88,166,255,0.15)' : 'transparent',
                    borderLeft: isActive(item.href) ? '2px solid #58a6ff' : '2px solid transparent',
                    color: isActive(item.href) ? '#58a6ff' : '#c9d1d9',
                    fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <span>{item.icon}</span> {item.label}
                  </div>
                </Link>
              ))}
            </>
          )}

          {nav.admin.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6e7681', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 16, paddingLeft: 8 }}>Admin</div>
              {nav.admin.map(item => (
                <Link key={item.href} href={item.href}>
                  <div style={{
                    padding: '8px 10px', marginBottom: 4, borderRadius: 6,
                    background: isActive(item.href) ? 'rgba(88,166,255,0.15)' : 'transparent',
                    borderLeft: isActive(item.href) ? '2px solid #58a6ff' : '2px solid transparent',
                    color: isActive(item.href) ? '#58a6ff' : '#c9d1d9',
                    fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <span>{item.icon}</span> {item.label}
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: '16px 12px', borderTop: '0.5px solid rgba(255,255,255,0.1)', background: '#0d1117' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.role === 'super_admin' ? 'Super Admin' : user.role === 'ops_manager' ? 'Supervisor' : 'Butler'}
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              const { useAuth: getAuth } = await import('@/lib/auth-context');
              // This is handled by AuthContext now
              window.location.href = '/login';
            }}
            style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.1)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#c9d1d9', fontSize: 12, cursor: 'pointer' }}>
            ⏻ Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 220, width: 'calc(100% - 220px)' }}>
        {children}
      </div>
    </div>
  );
}
