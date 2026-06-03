'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, getRoleLabel, type AppUser } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const adminNav = [
  { section: 'Overview', items: [
    { href: '/dashboard', icon: '▣', label: 'Dashboard' },
  ]},
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
  { section: 'Overview', items: [
    { href: '/dashboard', icon: '▣', label: 'Dashboard' },
  ]},
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
  { section: 'Reports', items: [
    { href: '/reports', icon: '↗', label: 'Reports' },
  ]},
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
      {/* Brand */}
      <div style={{ padding: '20px 20px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#1B1D1F' }}>S</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 1.2 }}>STAYVISTA</div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.4 }}>Butler Operations</div>
          </div>
        </div>
      </div>

      {/* Nav items — only render once user is loaded */}
      <div style={{ flex: 1, paddingBottom: 8 }}>
        {!user ? (
          <div style={{ padding: '20px 16px', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Loading…</div>
        ) : (
          nav.map(section => (
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
          ))
        )}
      </div>

      {/* User footer */}
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #FED5A9, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1B1D1F', flexShrink: 0 }}>
              {user.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              {badge && (
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
        ) : (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Loading session…</div>
        )}
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

    // Load user immediately
    getCurrentUser().then(u => { setUser(u); setReady(true); });

    // Also listen for auth state changes (catches login/logout in other tabs)
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (session) {
        getCurrentUser().then(setUser);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [isAuthPage, pathname]);

  if (isAuthPage) return <>{children}</>;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar user={user} />
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Butler context banner */}
        {ready && user?.role === 'butler' && (
          <div style={{ background: 'rgba(156,204,252,0.08)', borderBottom: '0.5px solid rgba(156,204,252,0.15)', padding: '6px 20px', fontSize: 12, color: '#9CCCFC', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>👤</span> {user.name} · {user.squad ?? 'No squad assigned'}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
