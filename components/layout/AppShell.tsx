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
    { href: '/training',   icon: '◈', label: 'My trainings' },
    { href: '/quiz',       icon: '?', label: 'My quizzes' },
    { href: '/huddle',     icon: '◎', label: 'Huddles' },
    { href: '/huddle-quiz',icon: '📝', label: 'Take quiz' },
  ]},
  { section: 'Schedule', items: [
    { href: '/roster', icon: '▦', label: 'My roster' },
  ]},
];

// Bottom nav for mobile (most used items per role)
const mobileBottomNav: Record<string, { href: string; icon: string; label: string }[]> = {
  super_admin: [
    { href: '/dashboard',  icon: '▣', label: 'Home' },
    { href: '/delight',    icon: '♡', label: 'Delight' },
    { href: '/allocation', icon: '◧', label: 'Allocation' },
    { href: '/huddle',     icon: '◎', label: 'Huddles' },
    { href: '/reports',    icon: '↗', label: 'Reports' },
  ],
  ops_manager: [
    { href: '/dashboard',  icon: '▣', label: 'Home' },
    { href: '/delight',    icon: '♡', label: 'Delight' },
    { href: '/allocation', icon: '◧', label: 'Allocation' },
    { href: '/huddle',     icon: '◎', label: 'Huddles' },
    { href: '/reports',    icon: '↗', label: 'Reports' },
  ],
  butler: [
    { href: '/dashboard',  icon: '▣', label: 'Home' },
    { href: '/delight',    icon: '♡', label: 'Log' },
    { href: '/submit',     icon: '↑', label: 'Submit' },
    { href: '/huddle',     icon: '◎', label: 'Huddles' },
    { href: '/roster',     icon: '▦', label: 'Roster' },
  ],
};

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
    const stored = typeof window !== 'undefined' ? localStorage.getItem('sv_profile') : null;
    if (stored) return JSON.parse(stored);
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return null;
    const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (!profile && session.user.email) {
      const { data: byEmail } = await sb.from('profiles').select('*').eq('email', session.user.email).maybeSingle();
      if (byEmail) return { id: session.user.id, name: byEmail.name, email: byEmail.email ?? session.user.email ?? '', role: byEmail.role as AppRole, squad: byEmail.squad, initials: byEmail.name.slice(0,2).toUpperCase() };
    }
    if (!profile) return null;
    return { id: session.user.id, name: profile.name, email: profile.email ?? session.user.email ?? '', role: profile.role as AppRole, squad: profile.squad, initials: profile.name.slice(0,2).toUpperCase() };
  } catch { return null; }
}

function DesktopSidebar({ user, open, onClose }: { user: AppUser | null; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const nav = getNav(user?.role ?? 'butler');
  const badge = user ? (roleBadgeStyle[user.role] ?? roleBadgeStyle.butler) : null;

  async function handleLogout() {
    localStorage.removeItem('sv_profile');
    await getSupabase().auth.signOut();
    window.location.href = '/login';
  }

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 39, display: 'none' }}
          className="mobile-overlay" />
      )}
      <nav style={{
        width: 228, background: '#141618',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0, overflowY: 'auto', height: '100vh',
        position: 'relative', zIndex: 40,
      }}>
        <div style={{ padding: '20px 20px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#1B1D1F' }}>S</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 1.2 }}>STAYVISTA</div>
              <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.4 }}>Butler Operations</div>
            </div>
            <button onClick={onClose} className="sidebar-close-btn" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 18, cursor: 'pointer', display: 'none' }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, paddingBottom: 8 }}>
          {nav.map(section => (
            <div key={section.section}>
              <div className="section-label">{section.section}</div>
              {section.items.map(item => (
                <Link key={item.href} href={item.href}
                  className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                  style={{ textDecoration: 'none' }}
                  onClick={onClose}>
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
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? '—'}</div>
              {badge && user && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: badge.bg, color: badge.color, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3, display: 'inline-block' }}>
                  {getRoleLabel(user.role)}
                </span>
              )}
            </div>
            <button onClick={handleLogout} title="Sign out" style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>⏻</button>
          </div>
        </div>
      </nav>
    </>
  );
}

function MobileBottomNav({ user }: { user: AppUser | null }) {
  const pathname = usePathname();
  const items = mobileBottomNav[user?.role ?? 'butler'] ?? mobileBottomNav.butler;
  return (
    <nav className="mobile-bottom-nav">
      {items.map(item => (
        <Link key={item.href} href={item.href} style={{ textDecoration: 'none', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '8px 4px' }}>
          <span style={{ fontSize: 18, color: pathname === item.href ? '#9CCCFC' : 'rgba(255,255,255,0.45)', transition: 'color 0.15s' }}>{item.icon}</span>
          <span style={{ fontSize: 9, fontWeight: pathname === item.href ? 700 : 400, color: pathname === item.href ? '#9CCCFC' : 'rgba(255,255,255,0.45)', letterSpacing: 0.3 }}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileTopbar({ user, onMenuOpen }: { user: AppUser | null; onMenuOpen: () => void }) {
  async function handleLogout() {
    localStorage.removeItem('sv_profile');
    await getSupabase().auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="mobile-topbar">
      <button onClick={onMenuOpen} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--sv-dark)', padding: '4px 8px' }}>☰</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#1B1D1F' }}>S</div>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>STAYVISTA</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #FED5A9, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#1B1D1F', cursor: 'pointer' }} onClick={handleLogout} title="Sign out">
          {user?.initials ?? '??'}
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/' || pathname === '/login';
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isAuthPage) { setReady(true); return; }
    getSessionUser().then(u => { setUser(u); setReady(true); });
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { localStorage.removeItem('sv_profile'); setUser(null); window.location.href = '/login'; }
      else if (event === 'SIGNED_IN') { getSessionUser().then(setUser); }
    });
    return () => subscription.unsubscribe();
  }, [isAuthPage]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (isAuthPage) return <>{children}</>;
  if (!ready) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#141618' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading…</div>
    </div>
  );

  return (
    <>
      <style>{`
        .mobile-bottom-nav { display: none; }
        .mobile-topbar { display: none; }
        .mobile-overlay { display: none !important; }
        .desktop-sidebar { display: flex; }

        @media (max-width: 768px) {
          .desktop-sidebar {
            position: fixed !important;
            top: 0; left: 0; bottom: 0;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
            z-index: 50 !important;
          }
          .desktop-sidebar.open {
            transform: translateX(0);
          }
          .mobile-overlay {
            display: block !important;
          }
          .mobile-bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: #141618;
            border-top: 0.5px solid rgba(255,255,255,0.08);
            z-index: 40;
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
          .mobile-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: white;
            border-bottom: 0.5px solid rgba(0,0,0,0.07);
            position: sticky;
            top: 0;
            z-index: 30;
          }
          .sidebar-close-btn {
            display: block !important;
          }
          .main-content {
            padding-bottom: 80px !important;
          }
        }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Overlay */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 45 }} />
        )}

        {/* Desktop sidebar */}
        <div className={`desktop-sidebar${sidebarOpen ? ' open' : ''}`} style={{ height: '100vh', flexShrink: 0 }}>
          <DesktopSidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Mobile topbar */}
          <MobileTopbar user={user} onMenuOpen={() => setSidebarOpen(true)} />

          {/* Butler context banner */}
          {user?.role === 'butler' && (
            <div style={{ background: 'rgba(156,204,252,0.08)', borderBottom: '0.5px solid rgba(156,204,252,0.15)', padding: '6px 20px', fontSize: 12, color: '#9CCCFC', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span>👤</span> {user.name} · {user.squad ?? 'No squad assigned'}
            </div>
          )}

          <div className="main-content" style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav user={user} />
    </>
  );
}
