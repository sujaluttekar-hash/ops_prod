'use client';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { fetchCredentials, getSupabase, getServiceSupabase, type Credential } from '@/lib/supabase';

const typeIcon: Record<string,string> = { wifi:'📶', device:'📺', key:'🔑', vendor:'🏢', login:'🔐' };
const typeBg: Record<string,string> = { wifi:'rgba(156,204,252,0.15)', device:'rgba(254,213,169,0.2)', key:'rgba(233,160,167,0.15)', vendor:'rgba(151,196,89,0.12)', login:'rgba(156,204,252,0.1)' };

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [accessLog, setAccessLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState<Record<string,boolean>>({});
  const [copied, setCopied] = useState<string|null>(null);

  useEffect(() => {
    async function load() {
      const [creds, log] = await Promise.all([
        fetchCredentials(),
        getServiceSupabase().from('credential_access_log').select('*, profiles(name), credentials(name)').order('accessed_at', { ascending: false }).limit(10),
      ]);
      setCredentials(creds);
      setAccessLog(log.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function handleCopy(id: string, value: string) {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <>
      <Topbar title="Credentials vault" subtitle="Admin-only · All access is logged"
        actions={<button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }}>+ Add credential</button>} />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(233,160,167,0.1)', border: '0.5px solid rgba(233,160,167,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <span><strong>Admin access only.</strong> All views, copies and edits are logged.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Stored credentials</div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              credentials.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No credentials stored yet.</div> :
              credentials.map(cred => (
                <div key={(cred as any).id} className="cred-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: typeBg[(cred as any).type] || 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {typeIcon[(cred as any).type] || '🔑'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{(cred as any).name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>{(cred as any).property} · Expires {(cred as any).expiry ?? 'No expiry'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{visible[(cred as any).id] ? (cred as any).value : '••••••••'}</span>
                    <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setVisible(v => ({ ...v, [(cred as any).id]: !v[(cred as any).id] }))}>
                      {visible[(cred as any).id] ? '🙈' : '👁'}
                    </button>
                    <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px', background: copied === (cred as any).id ? '#97C459' : undefined, color: copied === (cred as any).id ? '#2D5A0E' : undefined }}
                      onClick={() => handleCopy((cred as any).id, (cred as any).value)}>
                      {copied === (cred as any).id ? '✓' : '⎘'}
                    </button>
                  </div>
                </div>
              ))
            }
          </div>

          <div className="sv-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Access log</div>
              <span className="badge badge-blue">Last 10</span>
            </div>
            {loading ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>Loading…</div> :
              accessLog.length === 0 ? <div style={{ color: 'var(--muted-fg)', fontSize: 13 }}>No access recorded yet.</div> : (
              <table className="sv-table">
                <thead><tr><th>User</th><th>Credential</th><th>Action</th><th>Time</th></tr></thead>
                <tbody>
                  {accessLog.map((log, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{log.profiles?.name ?? '—'}</td>
                      <td style={{ color: 'var(--muted-fg)', fontSize: 12 }}>{log.credentials?.name ?? '—'}</td>
                      <td><span className={log.action === 'Viewed' ? 'badge badge-blue' : log.action === 'Copied' ? 'badge badge-green' : 'badge badge-amber'}>{log.action}</span></td>
                      <td style={{ color: 'var(--muted-fg)' }}>{new Date(log.accessed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
