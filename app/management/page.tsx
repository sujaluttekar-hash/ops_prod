'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { BUTLERS } from '@/lib/data';
import type { SessionUser } from '@/lib/session';

type ButlerAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  property: string;
  active: boolean;
  createdAt: string;
};

type AuditEntry = {
  action: string;
  target: string;
  by: string;
  at: string;
};

const PROPERTIES = ['Villa Serenity', 'Casa Azure', 'The Hillside', 'Villa Bloom', 'Casa Paradiso'];

const SEED: ButlerAccount[] = BUTLERS.map(b => ({
  id: b.id,
  firstName: b.name.split(' ')[0],
  lastName: b.name.split(' ').slice(1).join(' ') || '',
  email: `${b.name.split(' ')[0].toLowerCase()}@stayvista.com`,
  property: b.property,
  active: true,
  createdAt: '2026-01-01',
}));

export default function ManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accounts, setAccounts] = useState<ButlerAccount[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', property: '', password: '' });
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('sv_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setUser(u);
        if (u.role !== 'admin') router.replace('/dashboard');
      } catch {}
    } else {
      router.replace('/login');
    }
    const stored = localStorage.getItem('sv_accounts');
    setAccounts(stored ? JSON.parse(stored) : SEED);
    const storedAudit = localStorage.getItem('sv_audit');
    setAudit(storedAudit ? JSON.parse(storedAudit) : []);
  }, [router]);

  function save(newAccounts: ButlerAccount[], newAudit: AuditEntry[]) {
    setAccounts(newAccounts);
    setAudit(newAudit);
    localStorage.setItem('sv_accounts', JSON.stringify(newAccounts));
    localStorage.setItem('sv_audit', JSON.stringify(newAudit));
  }

  function addAudit(action: string, target: string, newAudit: AuditEntry[]) {
    const now = new Date();
    const ts = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    return [{ action, target, by: user?.name || 'Admin', at: ts }, ...newAudit].slice(0, 50);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.property) { setFormError('First name, email, and property are required'); return; }
    const newAccount: ButlerAccount = {
      id: `b${Date.now()}`,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      property: form.property,
      active: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const newAudit = addAudit('Added', `${form.firstName} ${form.lastName} (${form.email})`, audit);
    save([...accounts, newAccount], newAudit);
    setForm({ firstName: '', lastName: '', email: '', property: '', password: '' });
    setShowAdd(false);
    setFormError('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleRemove(id: string) {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    const newAccounts = accounts.filter(a => a.id !== id);
    const newAudit = addAudit('Removed', `${acc.firstName} ${acc.lastName} (${acc.email})`, audit);
    save(newAccounts, newAudit);
    setConfirmRemove(null);
  }

  function handleToggle(id: string) {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    const newAccounts = accounts.map(a => a.id === id ? { ...a, active: !a.active } : a);
    const newAudit = addAudit(acc.active ? 'Deactivated' : 'Reactivated', `${acc.firstName} ${acc.lastName}`, audit);
    save(newAccounts, newAudit);
  }

  return (
    <>
      <Topbar
        title="Management"
        subtitle="Admin only — account administration"
        actions={
          <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowAdd(true)}>
            + Add butler
          </button>
        }
      />
      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Guard banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(156,204,252,0.08)', border: '0.5px solid rgba(156,204,252,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
          <span style={{ fontSize: 20 }}>🛡</span>
          <span>Admin-only pane. All changes are logged with timestamp and admin ID.</span>
          {saved && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>✓ Saved</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div className="metric-card blue"><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Total butlers</div><div style={{ fontSize: 32, fontWeight: 700 }}>{accounts.length}</div></div>
          <div className="metric-card green"><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Active</div><div style={{ fontSize: 32, fontWeight: 700 }}>{accounts.filter(a => a.active).length}</div></div>
          <div className="metric-card coral"><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Inactive</div><div style={{ fontSize: 32, fontWeight: 700 }}>{accounts.filter(a => !a.active).length}</div></div>
          <div className="metric-card peach"><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Audit entries</div><div style={{ fontSize: 32, fontWeight: 700 }}>{audit.length}</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          {/* Accounts table */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Butler accounts</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Property</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(acc => (
                    <tr key={acc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="sv-avatar" style={{ opacity: acc.active ? 1 : 0.4 }}>
                            {(acc.firstName[0] || '') + (acc.lastName[0] || '')}
                          </div>
                          <span style={{ fontWeight: 500, opacity: acc.active ? 1 : 0.5 }}>{acc.firstName} {acc.lastName}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted-fg)', fontSize: 12 }}>{acc.email}</td>
                      <td style={{ color: 'var(--muted-fg)', fontSize: 12 }}>{acc.property}</td>
                      <td>
                        <span className={acc.active ? 'badge badge-green' : 'badge badge-gray'}>
                          {acc.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleToggle(acc.id)}>
                            {acc.active ? 'Deactivate' : 'Reactivate'}
                          </button>
                          <button className="sv-btn" style={{ fontSize: 11, padding: '4px 8px', color: '#8B2020', borderColor: '#E9A0A7' }} onClick={() => setConfirmRemove(acc.id)}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit trail */}
          <div className="sv-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Audit trail</div>
            {audit.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted-fg)', textAlign: 'center', padding: '20px 0' }}>No changes yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="sv-table">
                  <thead><tr><th>Action</th><th>Target</th><th>By</th><th>Time</th></tr></thead>
                  <tbody>
                    {audit.slice(0, 20).map((entry, i) => (
                      <tr key={i}>
                        <td><span className={entry.action === 'Added' ? 'badge badge-green' : entry.action === 'Removed' ? 'badge badge-red' : 'badge badge-amber'}>{entry.action}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{entry.target}</td>
                        <td style={{ fontSize: 12 }}>{entry.by}</td>
                        <td style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{entry.at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Submission viewer — admin sees all butler submissions */}
        <div className="sv-card" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Butler task submissions</div>
          <SubmissionsViewer />
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div className="sv-card" style={{ width: '100%', maxWidth: 440 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Add new butler account</div>
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>First name *</label>
                  <input className="sv-input" style={{ width: '100%' }} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Last name</label>
                  <input className="sv-input" style={{ width: '100%' }} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Email *</label>
                <input type="email" className="sv-input" style={{ width: '100%' }} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Property *</label>
                <select className="sv-select" style={{ width: '100%' }} value={form.property} onChange={e => setForm(f => ({ ...f, property: e.target.value }))} required>
                  <option value="">Select property</option>
                  {PROPERTIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted-fg)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Temporary password</label>
                <input type="password" className="sv-input" style={{ width: '100%' }} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="butler123" />
              </div>
              {formError && <div style={{ fontSize: 12, color: '#8B2020', marginBottom: 10, background: 'rgba(226,75,74,0.08)', padding: '8px 12px', borderRadius: 8 }}>{formError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="sv-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowAdd(false); setFormError(''); }}>Cancel</button>
                <button type="submit" className="sv-btn sv-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Add butler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm remove modal */}
      {confirmRemove && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div className="sv-card" style={{ width: '100%', maxWidth: 380, textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Remove account?</div>
            <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginBottom: 24 }}>
              This action will be logged. The butler will no longer be able to log in.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="sv-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmRemove(null)}>Cancel</button>
              <button className="sv-btn sv-btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#8B2020', borderColor: '#8B2020' }} onClick={() => handleRemove(confirmRemove)}>Confirm remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SubmissionsViewer() {
  const [subs, setSubs] = useState<any[]>([]);

  useEffect(() => {
    // Merge seed + localStorage submissions
    const { initialSubmissions } = require('@/lib/data');
    const stored = JSON.parse(localStorage.getItem('sv_submissions') || '[]');
    setSubs([...stored, ...initialSubmissions]);
  }, []);

  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? subs : subs.filter(s => s.taskType === filter);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['All', 'Arrival selfie', 'Guest welcome', 'Table layout', 'Exit selfie'].map(f => (
          <button key={f} className="sv-btn" onClick={() => setFilter(f)}
            style={{ fontSize: 11, padding: '5px 10px', background: filter === f ? '#1B1D1F' : undefined, color: filter === f ? '#fff' : undefined, borderColor: filter === f ? '#1B1D1F' : undefined }}>
            {f}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="sv-table">
          <thead>
            <tr>
              <th>Butler</th>
              <th>Task type</th>
              <th>Property</th>
              <th>Date of service</th>
              <th>Submitted at</th>
              <th>Photo</th>
              <th>Notes</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted-fg)', padding: 24 }}>No submissions yet</td></tr>
            )}
            {filtered.map((s: any) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.butlerName}</td>
                <td>{s.taskType}</td>
                <td style={{ color: 'var(--muted-fg)' }}>{s.property}</td>
                <td style={{ color: 'var(--muted-fg)' }}>{s.dateOfService}</td>
                <td style={{ color: 'var(--muted-fg)', fontSize: 12 }}>{s.submittedAt}</td>
                <td>{s.photoLabel ? <span className="badge badge-blue">📷 Yes</span> : <span style={{ color: 'var(--muted-fg)', fontSize: 12 }}>—</span>}</td>
                <td style={{ color: 'var(--muted-fg)', fontSize: 12, maxWidth: 180 }}>{s.notes || '—'}</td>
                <td><span className={s.status === 'approved' ? 'badge badge-green' : 'badge badge-amber'}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
