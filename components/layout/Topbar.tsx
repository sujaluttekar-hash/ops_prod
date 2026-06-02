'use client';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <div className="topbar">
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--sv-dark)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="badge badge-green" style={{ gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2D5A0E', display: 'inline-block' }} />
          Live
        </div>
        <button className="sv-btn" style={{ fontSize: 12, padding: '6px 12px' }}>
          🔔 3
        </button>
        {actions}
      </div>
    </div>
  );
}
