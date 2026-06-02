'use client';
import { useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import { credentials, accessLog } from '@/lib/data';

const typeIcon: Record<string, string> = {
  wifi: '📶',
  device: '📺',
  key: '🔑',
  vendor: '🏢',
  login: '🔐',
};

const typeBg: Record<string, string> = {
  wifi: 'rgba(156,204,252,0.15)',
  device: 'rgba(254,213,169,0.2)',
  key: 'rgba(233,160,167,0.15)',
  vendor: 'rgba(151,196,89,0.12)',
  login: 'rgba(156,204,252,0.1)',
};

export default function CredentialsPage() {
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  function toggleVisibility(id: string) {
    setVisible(v => ({ ...v, [id]: !v[id] }));
  }

  function handleCopy(id: string, value: string) {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <>
      <Topbar
        title="Credentials vault"
        subtitle="Admin-only · All access is logged"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Add credential</button>}
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Warning banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(233,160,167,0.1)',
          border: '0.5px solid rgba(233,160,167,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          fontSize: 13,
        }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <span><strong>Credentials vault</strong> — Admin access only. All views, copies and edits are logged in the audit trail.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="metric-card blue">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total credentials</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{credentials.length}</div>
          </div>
          <div className="metric-card coral">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Expiring soon</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{credentials.filter(c => c.expiryWarning).length}</div>
            <div style={{ fontSize: 11, color: '#8B2020', marginTop: 4 }}>Action required</div>
          </div>
          <div className="metric-card green">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Accesses today</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{accessLog.length}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          {/* Vault */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Stored credentials</div>
            {credentials.map(cred => (
              <div key={cred.id} className="cred-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: typeBg[cred.type] || 'var(--muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                  }}>
                    {typeIcon[cred.type]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{cred.name}</div>
                    <div style={{ fontSize: 11, color: cred.expiryWarning ? '#8B2020' : 'var(--muted-fg)', marginTop: 2 }}>
                      {cred.property} · Expires {cred.expiry}
                      {cred.expiryWarning && ' ⚠'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: 1 }}>
                    {visible[cred.id] ? cred.value : '••••••••'}
                  </span>
                  <button
                    className="sv-btn"
                    style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={() => toggleVisibility(cred.id)}
                  >
                    {visible[cred.id] ? '🙈' : '👁'}
                  </button>
                  <button
                    className="sv-btn"
                    style={{
                      fontSize: 11, padding: '4px 8px',
                      background: copied === cred.id ? '#97C459' : undefined,
                      color: copied === cred.id ? '#2D5A0E' : undefined,
                    }}
                    onClick={() => handleCopy(cred.id, cred.value)}
                  >
                    {copied === cred.id ? '✓' : '⎘'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Access log */}
          <div className="sv-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Access log</div>
              <span className="badge badge-blue">Last 24h</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Credential</th>
                    <th>Action</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {accessLog.map((log, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{log.user}</td>
                      <td style={{ color: 'var(--muted-fg)', fontSize: 12 }}>{log.credential}</td>
                      <td>
                        <span className={
                          log.action === 'Viewed' ? 'badge badge-blue' :
                          log.action === 'Copied' ? 'badge badge-green' :
                          'badge badge-amber'
                        }>{log.action}</span>
                      </td>
                      <td style={{ color: 'var(--muted-fg)' }}>{log.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add credential form hint */}
            <div style={{ marginTop: 16, padding: 14, background: 'var(--muted)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Add new credential</div>
              <input className="sv-input" placeholder="Credential name" style={{ width: '100%', marginBottom: 8 }} />
              <input className="sv-input" placeholder="Value / password" type="password" style={{ width: '100%', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="sv-select" style={{ flex: 1 }}>
                  <option>Select property</option>
                  <option>Villa Serenity</option>
                  <option>Casa Azure</option>
                  <option>All</option>
                </select>
                <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
