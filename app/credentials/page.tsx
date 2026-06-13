'use client';
import { useState, useEffect, useRef } from 'react';
import Topbar from '@/components/layout/Topbar';
import { getServiceSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { isSupervisor } from '@/lib/auth';

// ── App user accounts (from login page hardcoded list) ───────────────────────
const APP_ACCOUNTS = [
  { name: 'Aditi',           email: 'admin@stayvista.com',         password: 'StayVista@2026', role: 'super_admin', squad: 'All' },
  { name: 'Sujal',           email: 'sujal@stayvista.com',         password: 'sujal@123',      role: 'ops_manager', squad: 'All' },
  { name: 'Sujal Uttekar',   email: 'sujal.uttekar@stayvista.com', password: 'StayVista@2026', role: 'butler',      squad: null },
  { name: 'Atish Tandkar',   email: 'atish@stayvista.com',         password: 'atish@123',      role: 'butler',      squad: 'Nashik' },
  { name: 'Kalpesh Ther',    email: 'kalpesh@stayvista.com',       password: 'kalpesh@123',    role: 'butler',      squad: 'Alibaug' },
  { name: 'Kohinoor Shinde', email: 'kohinoor@stayvista.com',      password: 'kohinoor@123',   role: 'butler',      squad: 'Karjat' },
  { name: 'Manoj Valmiki',   email: 'manoj@stayvista.com',         password: 'manoj@123',      role: 'butler',      squad: 'Lonavala' },
  { name: 'Nimish',          email: 'nimish@stayvista.com',        password: 'nimish@123',     role: 'butler',      squad: 'Alibaug' },
  { name: 'Ravi Kumar',      email: 'butler@stayvista.com',        password: 'butler@123',     role: 'butler',      squad: 'Lonavala' },
  { name: 'Vinayak Kharade', email: 'vinayak@stayvista.com',       password: 'vinayak@123',    role: 'butler',      squad: 'Lonavala' },
  { name: 'Vishal',          email: 'vishal@stayvista.com',        password: 'vishal@123',     role: 'butler',      squad: 'Karjat' },
];

const ROLE_COLORS: Record<string,{bg:string;color:string;label:string}> = {
  super_admin: { bg: 'rgba(233,160,167,0.15)', color: '#8B2020', label: 'Admin' },
  ops_manager: { bg: 'rgba(156,204,252,0.15)', color: '#0C447C', label: 'Supervisor' },
  butler:      { bg: 'rgba(151,196,89,0.12)',  color: '#2D5A0E', label: 'Butler' },
};

// ── Add User Modal ────────────────────────────────────────────────────────────
function AddUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'butler', squad: 'Lonavala' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!form.name || !form.email || !form.password) { setError('Name, email and password are required.'); return; }
    setSaving(true);
    setError('');

    const uuid = crypto.randomUUID();

    // Save to profiles with password_hash so login can auth them
    const { error: err } = await getServiceSupabase().from('profiles').insert({
      id: uuid,
      name: form.name,
      email: form.email,
      role: form.role,
      squad: form.squad || null,
      is_active: true,
      password_hash: form.password,  // plain text for local auth
      created_at: new Date().toISOString(),
    });

    if (err) { setError(err.message); setSaving(false); return; }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Add new user</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted-fg)' }}>✕</button>
        </div>
        <div className="sv-strip" style={{ marginBottom: 18 }} />

        {error && <div style={{ background: 'rgba(233,160,167,0.15)', border: '1px solid #E9A0A7', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#8B2020', marginBottom: 14 }}>⚠ {error}</div>}

        {[
          { key: 'name', label: 'Full name *', placeholder: 'e.g. Ravi Kumar' },
          { key: 'email', label: 'Email *', placeholder: 'e.g. ravi@stayvista.com' },
          { key: 'password', label: 'Password *', placeholder: 'e.g. ravi@123' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>{f.label}</div>
            <input className="sv-input" style={{ width: '100%' }} placeholder={f.placeholder}
              value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Role</div>
            <select className="sv-select" style={{ width: '100%' }} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="butler">Butler</option>
              <option value="ops_manager">Supervisor</option>
              <option value="super_admin">Admin</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Squad</div>
            <select className="sv-select" style={{ width: '100%' }} value={form.squad} onChange={e => setForm(p => ({ ...p, squad: e.target.value }))}>
              {['Lonavala','Karjat','Nashik','Alibaug','All'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sv-btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="sv-btn sv-btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
            {saving ? 'Saving…' : '+ Add user'}
          </button>
        </div>

        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(151,196,89,0.08)', borderRadius: 8, fontSize: 11, color: '#2D5A0E', lineHeight: 1.5 }}>
          ✅ User will be saved to the database and can log in immediately with the email and password above.
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CredentialsPage() {
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [dbProfiles, setDbProfiles] = useState<any[]>([]);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<'accounts' | 'system'>('accounts');
  const [systemCreds, setSystemCreds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuper = user ? isSupervisor(user.role as any) : false;

  async function load() {
    setLoading(true);
    const sb = getServiceSupabase();
    const [profRes, credRes] = await Promise.all([
      sb.from('profiles').select('id,name,email,role,squad,is_active').order('name'),
      sb.from('credentials').select('*').order('name'),
    ]);
    setDbProfiles(profRes.data || []);
    setSystemCreds(credRes.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(email: string, currentStatus: boolean) {
    const db = dbProfiles.find(p => p.email === email);
    if (!db) { alert('Profile not found in DB.'); return; }
    const { error } = await getServiceSupabase().from('profiles').update({ is_active: !currentStatus }).eq('id', db.id);
    if (error) { alert('Error: ' + error.message); return; }
    await load();
  }

  function copy(key: string, val: string) {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  // Merge APP_ACCOUNTS with DB profiles
  const merged = APP_ACCOUNTS.map(a => {
    const db = dbProfiles.find(p => p.email === a.email);
    return { ...a, is_active: db?.is_active ?? true };
  });

  return (
    <>
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onSaved={load} />}

      <Topbar title="Credentials" subtitle="App accounts & system passwords"
        actions={isSuper ? (
          <button className="sv-btn sv-btn-primary" style={{ fontSize: 12 }} onClick={() => setShowAdd(true)}>+ Add user</button>
        ) : undefined}
      />

      <div style={{ padding: 24 }} className="page-enter">
        <div className="sv-strip" />

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[['accounts', '👤 App accounts'], ['system', '🔐 System credentials']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t as any)} className="sv-btn"
              style={{ fontSize: 12, background: tab === t ? '#1B1D1F' : undefined, color: tab === t ? '#fff' : undefined }}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'accounts' ? (
          /* App Accounts */
          <div className="sv-card" style={{ padding: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 12, color: 'var(--muted-fg)', fontWeight: 500 }}>
              {merged.length} accounts · Login URL: <code style={{ background: 'var(--muted)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>ops-prod.vercel.app/login</code>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="sv-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email / Username</th>
                    <th>Password</th>
                    <th>Role</th>
                    <th>Squad</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {merged.map((a, i) => {
                    const rc = ROLE_COLORS[a.role] || ROLE_COLORS.butler;
                    const pwKey = `pw_${i}`;
                    return (
                      <tr key={a.email}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="sv-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{a.name.slice(0,2).toUpperCase()}</div>
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{a.name}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <code style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{a.email}</code>
                            <button onClick={() => copy(`email_${i}`, a.email)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: copied === `email_${i}` ? '#2D5A0E' : 'var(--muted-fg)' }}>
                              {copied === `email_${i}` ? '✓' : '⎘'}
                            </button>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <code style={{ fontSize: 12, letterSpacing: visible[pwKey] ? 0 : 2, color: 'var(--sv-dark)' }}>
                              {visible[pwKey] ? a.password : '••••••••'}
                            </code>
                            <button onClick={() => setVisible(v => ({ ...v, [pwKey]: !v[pwKey] }))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--muted-fg)' }}>
                              {visible[pwKey] ? '🙈' : '👁'}
                            </button>
                            <button onClick={() => copy(pwKey, a.password)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: copied === pwKey ? '#2D5A0E' : 'var(--muted-fg)' }}>
                              {copied === pwKey ? '✓' : '⎘'}
                            </button>
                          </div>
                        </td>
                        <td><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: rc.bg, color: rc.color }}>{rc.label}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--muted-fg)' }}>{a.squad || '—'}</td>
                        <td>
                          <button
                            onClick={() => toggleActive(a.email, a.is_active)}
                            style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                              background: a.is_active ? 'rgba(151,196,89,0.15)' : 'rgba(233,160,167,0.15)',
                              color: a.is_active ? '#2D5A0E' : '#8B2020' }}>
                            {a.is_active ? '✅ Active' : '❌ Inactive'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* System Credentials */
          loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>Loading…</div> :
          systemCreds.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-fg)' }}>No system credentials added yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {systemCreds.map((c: any) => (
                <div key={c.id} className="sv-card">
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>{c.name}</div>
                  {Object.entries(c).filter(([k]) => !['id','name','created_at','type'].includes(k) && c[k]).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontSize: 13 }}>
                      <span style={{ color: 'var(--muted-fg)', textTransform: 'capitalize' }}>{k.replace(/_/g,' ')}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <code style={{ fontSize: 12 }}>{v as string}</code>
                        <button onClick={() => copy(`${c.id}_${k}`, v as string)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: copied === `${c.id}_${k}` ? '#2D5A0E' : 'var(--muted-fg)' }}>
                          {copied === `${c.id}_${k}` ? '✓' : '⎘'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );
}
