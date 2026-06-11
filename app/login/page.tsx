'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getSupabase().auth.getSession().then((res: any) => {
      if (res?.data?.session?.user) {
        router.replace('/dashboard')
      } else {
        setChecking(false)
      }
    }).catch(() => setChecking(false))
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: authError } = await getSupabase().auth.signInWithPassword({ email, password })
      if (authError) { setError(authError.message || 'Login failed. Check your credentials.'); setLoading(false); return }
      if (data?.session) { router.replace('/dashboard') }
      else { setError('No session returned. Please try again.'); setLoading(false) }
    } catch (err: any) { setError(err.message || 'Login failed'); setLoading(false) }
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(156,204,252,0.3)', borderTop: '2px solid #9CCCFC', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'fixed', top: -120, right: -120, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(156,204,252,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,160,167,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 20, padding: '44px 40px', boxShadow: '0 4px 40px rgba(0,0,0,0.07)', position: 'relative' }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg, #9CCCFC, #FED5A9, #E9A0A7)', borderRadius: 1, marginBottom: 36 }} />
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 auto 14px', boxShadow: '0 4px 16px rgba(156,204,252,0.35)' }}>S</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1B1D1F', letterSpacing: 1.5 }}>STAYVISTA</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Butler Operations Platform</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@stayvista.com" required
              style={{ width: '100%', padding: '11px 14px', background: '#F7F7F5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, color: '#1B1D1F', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
              style={{ width: '100%', padding: '11px 14px', background: '#F7F7F5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, color: '#1B1D1F', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ fontSize: 12, color: '#8B2020', background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.2)', borderRadius: 8, padding: '9px 12px', marginBottom: 12 }}>⚠ {error}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: loading ? 'rgba(156,204,252,0.6)' : '#9CCCFC', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1B1D1F', cursor: loading ? 'wait' : 'pointer', marginTop: 8 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
