'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SESSIONS } from '@/lib/session';
import { BUTLERS } from '@/lib/data';

const ACCOUNTS = [
  { label: 'Admin (Aditi)', key: 'admin', email: 'aditi@stayvista.com', password: 'admin123' },
  ...BUTLERS.map(b => ({ label: b.name, key: b.id, email: `${b.name.split(' ')[0].toLowerCase()}@stayvista.com`, password: 'butler123' })),
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function login(key: string) {
    const user = SESSIONS[key];
    if (!user) return;
    localStorage.setItem('sv_user', JSON.stringify(user));
    router.push('/dashboard');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const match = ACCOUNTS.find(a => a.email === email && a.password === password);
    setTimeout(() => {
      if (match) {
        login(match.key);
      } else {
        setError('Invalid email or password');
        setLoading(false);
      }
    }, 500);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#141618', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(156,204,252,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -80, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,160,167,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '40px 36px', position: 'relative' }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg, #9CCCFC, #FED5A9, #E9A0A7)', borderRadius: 1, marginBottom: 32 }} />

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#1B1D1F', margin: '0 auto 14px' }}>S</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: 1.5 }}>STAYVISTA</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Butler Operations Platform</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="aditi@stayvista.com"
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 14, color: '#fff', outline: 'none' }} required />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 14, color: '#fff', outline: 'none' }} required />
          </div>
          {error && <div style={{ fontSize: 12, color: '#E9A0A7', marginBottom: 8 }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 11, background: loading ? 'rgba(156,204,252,0.4)' : '#9CCCFC', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1B1D1F', cursor: loading ? 'wait' : 'pointer', marginTop: 8 }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Quick login */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 10, textAlign: 'center' }}>Quick login</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ACCOUNTS.map(acc => (
              <button key={acc.key} onClick={() => login(acc.key)}
                style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10, color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>
                {acc.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 8 }}>Admin: admin123 · Butler: butler123</div>
        </div>
      </div>
    </div>
  );
}
