'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getRoleLabel, type AppRole, type AppUser } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const adminNav = [
  { section: 'Overview', items: [{ href: '/dashboard', icon: '▣', label: 'Dashboard' }]},
  { section: 'Operations', items: [
    { href: '/delight',    icon: '♡', label: 'Guest delight' },
    { href: '/allocation', icon: '◧', label: 'Allocation' },
    { href: '/tasks',      icon: '✓', label: 'Tasks' },
    { href: '/roster',     icon: '▦', label: 'Roster' },
  ]},
  { section: 'Learning', items: [
    { href: '/huddle',   icon: '◎', label: 'Huddles' },
    { href: '/training', icon: '◈', label: 'Training' },
    { href: '/quiz',     icon: '?', label: 'Quizzes' },
  ]},
  { section: 'Admin', items: [
    { href: '/credentials', icon: '⊕', label: 'Credentials' },
    { href: '/reports',     icon: '↗', label: 'Reports' },
    { href: '/management',  icon: '⚙', label: 'User management' },
  ]},
];

const supervisorNav = [
  { section: 'Overview', items: [{ href: '/dashboard', icon: '▣', label: 'Dashboard' }]},
  { section: 'Operations', items: [
    { href: '/delight',    icon: '♡', label: 'Delight records' },
    { href: '/allocation', icon: '◧', label: 'Allocation' },
    { href: '/tasks',      icon: '✓', label: 'Tasks' },
    { href: '/roster',     icon: '▦', label: 'Roster' },
  ]},
  { section: 'Learning', items: [
    { href: '/huddle',   icon: '◎', label: 'Huddles' },
    { href: '/training', icon: '◈', label: 'Training' },
    { href: '/quiz',     icon: '?', label: 'Quizzes' },
  ]},
  { section: 'Reports', items: [{ href: '/reports', icon: '↗', label: 'Reports' }]},
];

const butlerNav = [
  { section: 'My work', items: [
    { href: '/dashboard', icon: '▣', label: 'Dashboard' },
    { href: '/delight',   icon: '♡', label: 'Log activity' },
    { href: '/submit',    icon: '↑', label: 'Submit task' },
  ]},
  { section: 'My learning', items: [
    { href: '/training', icon: '◈', label: 'My trainings' },
    { href: '/quiz',     icon: '?', label: 'My quizzes' },
    { href: '/huddle',   icon: '◎', label: 'Huddles' },
  ]},
  { section: 'Schedule', items: [
    { href: '/roster', icon: '▦', label: 'My roster' },
  ]},
];

function getNav(role: string) {
  if (role === 'super_admin') return adminNav;
  if (role === 'ops_manager') return supervisorNav;
  return butlerNav;
}

const roleBadgeStyle: Record<string, { bg: string; color: string }> = {
  super_admin: { bg: 'rgba(233,160,167,0.2)', color: '#E9A0A7' },
  ops_manager: { bg: 'rgba(254,213,169,0.2)', color: '#FED5A9' },
  butler:      { bg: 'rgba(156,204,252,0.15)', color: '#9CCCFC' },
  trainer:     { bg: 'rgba(151,196,89,0.15)', color: '#97C459' },
};

async function getSessionUser(): Promise<AppUser | null> {
  try {
    const sb = getSupabase();
    // Get the actual current session
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return null;

    const authUser = session.user;

    // Look up profile strictly by the session user's ID
    const { data: profile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profile) {
      return {
        id: authUser.id,
        name: profile.name,
        email: profile.email ?? authUser.email ?? '',
        role: profile.role as AppRole,
        squad: profile.squad,
        initials: profile.name.slice(0, 2).toUpperCase(),
      };
    }

    // Profile not found by ID — try by email and fix
    if (authUser.email) {
      const { data: byEmail } = await sb
        .from('profiles')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle();

      if (byEmail) {
        // Fix the ID mismatch silently
        await sb.from('profiles').update({ id: authUser.id }).eq('email', authUser.email);
        return {
          id: authUser.id,
          name: byEmail.name,
          email: byEmail.email ?? authUser.email,
          role: byEmail.role as AppRole,
          squad: byEmail.squad,
          initials: byEmail.name.slice(0, 2).toUpperCase(),
        };
      }
    }

    return null;
  } catch (e) {
    console.error('getSessionUser:', e);
    return null;
  }
}

function Sidebar({ user }: { user: AppUser | null }) {
  const pathname = usePathname();
  const nav = getNav(user?.role ?? 'butler');
  const badge = user ? (roleBadgeStyle[user.role] ?? roleBadgeStyle.butler) : null;

  async function handleLogout() {
    await getSupabase().auth.signOut();
    window.location.href = '/login';
  }

  return (
    <nav style={{ width: 228, background: '#141618', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', height: '100vh' }}>
      <div style={{ padding: '20px 20px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#1B1D1F' }}>S</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 1.2 }}>STAYVISTA</div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.4 }}>Butler Operations</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: 8 }}>
        {nav.map(section => (
          <div key={section.section}>
            <div className="section-label">{section.section}</div>
            {section.items.map(item => (
              <Link key={item.href} href={item.href}
                className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #FED5A9, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1B1D1F', flexShrink: 0 }}>
            {user?.initials ?? '??'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? '—'}
            </div>
            {badge && user && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: badge.bg, color: badge.color, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3, display: 'inline-block' }}>
                {getRoleLabel(user.role)}
              </span>
            )}
          </div>
          <button onClick={handleLogout} title="Sign out"
            style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            ⏻
          </button>
        </div>
      </div>
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/' || pathname === '/login';
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isAuthPage) { setReady(true); return; }

    // Verify session matches the user who just logged in
    getSessionUser().then(u => {
      const expectedUid = sessionStorage.getItem("sv_uid");
      if (expectedUid && u && u.id !== expectedUid) {
        // Session mismatch — force reload the correct user
        getSupabase().auth.getSession().then(({ data }) => {
          if (data.session?.user.id !== expectedUid) {
            window.location.href = "/login";
          }
        });
      }
      setUser(u);
      setReady(true);
    });

    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        window.location.href = '/login';
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        getSessionUser().then(setUser);
      }
    });

    return () => subscription.unsubscribe();
  }, [isAuthPage]);

  if (isAuthPage) return <>{children}</>;

  if (!ready) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#141618' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar user={user} />
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {user?.role === 'butler' && (
          <div style={{ background: 'rgba(156,204,252,0.08)', borderBottom: '0.5px solid rgba(156,204,252,0.15)', padding: '6px 20px', fontSize: 12, color: '#9CCCFC', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>👤</span> {user.name} · {user.squad ?? 'No squad assigned'}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
