'use client';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <div className="topbar">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--sv-dark)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
