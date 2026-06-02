'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SessionUser } from '@/lib/session';

const adminNav = [
  { section: 'Overview',    items: [{ href: '/dashboard',    icon: '▣', label: 'Dashboard'         }] },
  { section: 'Operations',  items: [
    { href: '/delight',     icon: '♡', label: 'Guest delight'    },
    { href: '/tasks',       icon: '✓', label: 'Tasks'            },
    { href: '/roster',      icon: '▦', label: 'Roster'           },
  ]},
  { section: 'Learning',    items: [
    { href: '/huddle',      icon: '◎', label: 'Huddles'          },
    { href: '/training',    icon: '◈', label: 'Training'         },
    { href: '/quiz',        icon: '?', label: 'Quizzes'          },
  ]},
  { section: 'Admin',       items: [
    { href: '/credentials', icon: '⊕', label: 'Credentials'      },
    { href: '/reports',     icon: '↗', label: 'Reports'          },
    { href: '/management',  icon: '⚙', label: 'Management'       },
  ]},
];

const butlerNav = [
  { section: 'My work',     items: [
    { href: '/dashboard',   icon: '▣', label: 'Dashboard'        },
    { href: '/submit',      icon: '↑', label: 'Submit task'      },
    { href: '/delight',     icon: '♡', label: 'Guest delight'    },
    { href: '/roster',      icon: '▦', label: 'My roster'        },
  ]},
  { section: 'Learning',    items: [
    { href: '/huddle',      icon: '◎', label: 'Huddles'          },
    { href: '/training',    icon: '◈', label: 'Training'         },
    { href: '/quiz',        icon: '?', label: 'Quizzes'          },
  ]},
];

function Sidebar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const nav = user?.role === 'butler' ? butlerNav : adminNav;

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
              <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #FED5A9, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1B1D1F', flexShrink: 0 }}>
          {user?.initials || 'AD'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Aditi Sharma'}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{user?.role === 'butler' ? 'Butler' : 'Super Admin'}</div>
        </div>
        <Link href="/" onClick={() => { if (typeof window !== 'undefined') { localStorage.removeItem('sv_user'); } }} style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>⏻</Link>
      </div>
    </nav>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/' || pathname === '/login';
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('sv_user');
    if (raw) { try { setUser(JSON.parse(raw)); } catch {} }
  }, [pathname]);

  if (isAuthPage) return <>{children}</>;
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar user={user} />
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet" />
        <title>StayVista — Butler Operations</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
