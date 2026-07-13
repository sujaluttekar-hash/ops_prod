'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getServiceSupabase } from '@/lib/supabase';
import { useButlerLocation } from '@/lib/use-butler-location';

type NavItem = { label: string; href: string; icon: string };
type NavSection = { overview: NavItem[]; operations: NavItem[]; learning: NavItem[]; admin: NavItem[] };

const navByRole: Record<string, NavSection> = {
  super_admin: {
    overview: [{ label: 'Dashboard', href: '/dashboard', icon: '📊' }],
    operations: [
      { label: 'Daily roster', href: '/allocation', icon: '📋' },
      { label: 'Task', href: '/delight', icon: '🎁' },
      { label: 'Photo gallery', href: '/gallery', icon: '📸' },
      { label: 'Audit', href: '/tasks', icon: '✓' },
      { label: 'Cases', href: '/incidents', icon: '🆘' },
      { label: 'Attendance', href: '/attendance', icon: '📅' },
      { label: 'Huddles', href: '/huddle', icon: '💬' },
      { label: 'Butler calendar', href: '/butler-calendar', icon: '🗓' },
      { label: 'Property map', href: '/map', icon: '🗺' },
    ],
    learning: [
      { label: 'Training', href: '/training', icon: '📚' },
    ],
    admin: [
      { label: 'Credentials', href: '/credentials', icon: '🔐' },
      { label: 'MIS & Reports', href: '/reports', icon: '📈' },
      { label: 'Butler performance', href: '/performance', icon: '🏆' },
      { label: 'Help & Guide', href: '/guide', icon: '📖' },
      { label: 'Management', href: '/management', icon: '⚙' },
    ],
  },
  ops_manager: {
    overview: [{ label: 'Dashboard', href: '/dashboard', icon: '📊' }],
    operations: [
      { label: 'Daily roster', href: '/allocation', icon: '📋' },
      { label: 'Task', href: '/delight', icon: '🎁' },
      { label: 'Photo gallery', href: '/gallery', icon: '📸' },
      { label: 'Audit', href: '/tasks', icon: '✓' },
      { label: 'Cases', href: '/incidents', icon: '🆘' },
      { label: 'Attendance', href: '/attendance', icon: '📅' },
      { label: 'Huddles', href: '/huddle', icon: '💬' },
      { label: 'Butler calendar', href: '/butler-calendar', icon: '🗓' },
      { label: 'Property map', href: '/map', icon: '🗺' },
    ],
    learning: [
      { label: 'Training', href: '/training', icon: '📚' },
    ],
    admin: [{ label: 'MIS & Reports', href: '/reports', icon: '📈' }],
  },
  butler: {
    overview: [{ label: 'Dashboard', href: '/dashboard', icon: '📊' }],
    operations: [
      { label: 'Task', href: '/delight', icon: '🎁' },
      { label: 'Submit task', href: '/submit', icon: '✓' },
      { label: 'Audit', href: '/tasks', icon: '📋' },
      { label: 'Cases', href: '/incidents', icon: '🆘' },
      { label: 'Attendance', href: '/attendance', icon: '📅' },
      { label: 'My calendar', href: '/butler-calendar', icon: '🗓' },
      { label: 'Property map', href: '/map', icon: '🗺' },
    ],
    learning: [
      { label: 'My trainings', href: '/training', icon: '📚' },
      { label: 'Help & Guide', href: '/guide', icon: '📖' },
      { label: 'Huddles', href: '/huddle', icon: '💬' },
    ],
    admin: [],
  },
  trainer: {
    overview: [{ label: 'Dashboard', href: '/dashboard', icon: '📊' }],
    operations: [],
    learning: [
      { label: 'Training', href: '/training', icon: '📚' },
    ],
    admin: [],
  },
};

function NotificationBell({ userId }: { userId: string }) {
  const [notifs, setNotifs] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    const fetch = () => getServiceSupabase()
      .from('notifications').select('*').eq('user_id', userId).eq('read', false)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }: any) => setNotifs(data || []))
    fetch()
    const t = setInterval(fetch, 30000)
    return () => clearInterval(t)
  }, [userId])

  async function markAllRead() {
    await getServiceSupabase().from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifs([]); setOpen(false)
  }

  return (
    <div style={{ position: 'relative', marginBottom: 6 }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>🔔 Notifications</span>
        {notifs.length > 0 && <span style={{ background: '#E9A0A7', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{notifs.length > 9 ? '9+' : notifs.length}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#1e2228', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, marginBottom: 6, maxHeight: 280, overflowY: 'auto', zIndex: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Notifications</span>
            {notifs.length > 0 && <button onClick={markAllRead} style={{ fontSize: 10, color: '#9CCCFC', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>}
          </div>
          {notifs.length === 0
            ? <div style={{ padding: '20px 14px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>No new notifications</div>
            : notifs.map((n: any) => (
              <div key={n.id} style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{n.body || n.message || n.title}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function SidebarContent({ user, nav, isActive, roleLabel, onNavClick }: any) {
  return (
    <>
      <div style={{ padding: '20px 12px 12px', flex: 1, overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingLeft: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>S</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>STAYVISTA</div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Butler Ops</div>
          </div>
        </div>

        {/* Nav items */}
        {[
          { items: nav.overview, label: null },
          { items: nav.operations, label: 'Operations' },
          { items: nav.learning, label: 'Learning' },
          { items: nav.admin, label: 'Admin' },
        ].map(({ items, label }) => items.length > 0 && (
          <div key={label || 'overview'}>
            {label && <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 16, paddingLeft: 12 }}>{label}</div>}
            {items.map((item: NavItem) => (
              <Link key={item.href} href={item.href} onClick={onNavClick}>
                <div style={{ padding: '10px 12px', marginBottom: 2, borderRadius: 8, background: isActive(item.href) ? 'rgba(156,204,252,0.18)' : 'transparent', borderLeft: isActive(item.href) ? '2px solid #9CCCFC' : '2px solid transparent', color: isActive(item.href) ? '#9CCCFC' : 'rgba(255,255,255,0.65)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontWeight: isActive(item.href) ? 600 : 400 }}>
                  <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '0.5px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {(user.name || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{roleLabel}</div>
          </div>
        </div>
        <NotificationBell userId={user.id} />
        <button
          onClick={() => { localStorage.removeItem('sv_local_session'); window.location.replace('/login'); }}
          style={{ width: '100%', padding: '8px 0', background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', marginTop: 6 }}>
          Sign out
        </button>
      </div>
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0);
  useButlerLocation(user?.role === 'butler' ? user as any : null); // ONLY butlers

  // Fetch unread notification count for topbar badge
  useEffect(() => {
    if (!user?.id) return
    const fetchCount = () => getServiceSupabase()
      .from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('read', false)
      .then(({ count }: any) => setUnreadCount(count || 0))
    fetchCount()
    const t = setInterval(fetchCount, 30000)
    return () => clearInterval(t)
  }, [user?.id])
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!loading && !user && !isLoginPage) window.location.href = '/login';
  }, [loading, user, isLoginPage]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (isLoginPage) return <>{children}</>;
  if (loading || !user) return <div style={{ minHeight: '100vh', background: '#F7F7F5' }}>{children}</div>;

  const nav = navByRole[user.role] || navByRole.butler;
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const roleLabel = { super_admin: 'Admin', ops_manager: 'Supervisor', trainer: 'Trainer', butler: 'Butler' }[user.role] || 'Butler';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F7F5' }}>

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div style={{ width: 220, background: '#141618', position: 'fixed', left: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', zIndex: 50, overflowY: 'auto' }} className="desktop-sidebar">
        <SidebarContent user={user} nav={nav} isActive={isActive} roleLabel={roleLabel} onNavClick={() => {}} />
      </div>

      {/* ── Mobile header ── */}
      <div style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: '#141618', zIndex: 100, alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }} className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>S</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>STAYVISTA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unreadCount > 0 && !mobileOpen && (
            <div style={{ background: '#E9A0A7', color: '#fff', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              🔔 {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 98, display: 'none' }} className="mobile-overlay" />
      )}

      {/* ── Mobile drawer ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 280, background: '#141618', zIndex: 99, display: 'flex', flexDirection: 'column', transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease', overflowY: 'auto' }} className="mobile-drawer">
        <SidebarContent user={user} nav={nav} isActive={isActive} roleLabel={roleLabel} onNavClick={() => setMobileOpen(false)} />
      </div>

      {/* ── Main content ── */}
      <div style={{ marginLeft: 220, flex: 1, minWidth: 0, background: '#F7F7F5', color: '#1B1D1F' }} className="main-content">
        {children}
      </div>

      {/* ── Responsive styles ── */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          .mobile-overlay { display: block !important; }
          .main-content { margin-left: 0 !important; padding-top: 56px; }
        }
        @media (min-width: 769px) {
          .mobile-header { display: none !important; }
          .mobile-drawer { transform: translateX(-100%) !important; }
        }
      `}</style>
    </div>
  );
}
