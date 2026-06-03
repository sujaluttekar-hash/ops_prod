'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authError } = await signIn(email, password);
    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
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
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@stayvista.com"
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }} required />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }} required />
          </div>
          {error && <div style={{ fontSize: 12, color: '#E9A0A7', marginBottom: 8 }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 11, background: loading ? 'rgba(156,204,252,0.4)' : '#9CCCFC', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1B1D1F', cursor: loading ? 'wait' : 'pointer', marginTop: 8 }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
          Sign in with your StayVista email address
        </div>
      </div>
    </div>
  );
}
