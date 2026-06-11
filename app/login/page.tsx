'use client'
import { useState } from 'react'
import { getSupabase } from '@/lib/supabase'

// Hardcoded credential map — matches Supabase profiles
// Format: email -> { password, role, name }
const USERS: Record<string, { password: string; role: string; name: string }> = {
  'admin@stayvista.com':      { password: 'StayVista@2026', role: 'super_admin',  name: 'Aditi' },
  'sujal.uttekar@stayvista.com': { password: 'StayVista@2026', role: 'super_admin', name: 'Sujal' },
  'atish.tandkar@stayvista.com': { password: 'atish.tandkar@123', role: 'butler', name: 'Atish Tandkar' },
  'kalpesh.ther@stayvista.com':  { password: 'kalpesh.ther@123',  role: 'butler', name: 'Kalpesh Ther' },
  'kohinoor.shinde@stayvista.com': { password: 'kohinoor.shinde@123', role: 'butler', name: 'Kohinoor Shinde' },
  'manoj.valmiki@stayvista.com': { password: 'manoj.valmiki@123', role: 'butler', name: 'Manoj Valmiki' },
  'nimish@stayvista.com':        { password: 'nimish@123',        role: 'butler', name: 'Nimish' },
  'ravi.kumar@stayvista.com':    { password: 'ravi.kumar@123',    role: 'butler', name: 'Ravi Kumar' },
  'vinayak.kharade@stayvista.com': { password: 'vinayak.kharade@123', role: 'butler', name: 'Vinayak Kharade' },
  'vishal@stayvista.com':        { password: 'vishal@123',        role: 'butler', name: 'Vishal' },
  'butler@stayvista.com':        { password: 'butler@123',        role: 'butler', name: 'Butler' },
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const emailLower = email.toLowerCase().trim()
    const match = USERS[emailLower]

    // First try Supabase (with 5s timeout)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const result = await Promise.race([
        getSupabase().auth.signInWithPassword({ email: emailLower, password }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]) as any

      clearTimeout(timeout)

      if (result?.data?.session) {
        window.location.replace('/dashboard')
        return
      }

      if (result?.error && !result.error.message.includes('timeout')) {
        // Real auth error — fall through to local check
      }
    } catch {
      // Supabase timed out or failed — fall through to local check
    }

    // Fallback: local credential check
    if (!match) {
      setError('No account found with that email.')
      setLoading(false)
      return
    }

    if (match.password !== password) {
      setError('Incorrect password.')
      setLoading(false)
      return
    }

    // Store session locally so AppShell can read it
    const fakeProfile = {
      id: emailLower,
      name: match.name,
      email: emailLower,
      role: match.role,
      squad: null,
      property_id: null,
      phone: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: null,
    }
    localStorage.setItem('sv_local_session', JSON.stringify(fakeProfile))
    window.location.replace('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'fixed', top: -120, right: -120, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(156,204,252,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,160,167,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 20, padding: '44px 40px', boxShadow: '0 4px 40px rgba(0,0,0,0.07)', position: 'relative', zIndex: 1 }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg, #9CCCFC, #FED5A9, #E9A0A7)', borderRadius: 1, marginBottom: 36 }} />
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #9CCCFC, #E9A0A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 auto 14px' }}>S</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1B1D1F', letterSpacing: 1.5 }}>STAYVISTA</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Butler Operations Platform</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@stayvista.com" required autoComplete="email"
              style={{ width: '100%', padding: '11px 14px', background: '#F7F7F5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, color: '#1B1D1F', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password"
              style={{ width: '100%', padding: '11px 14px', background: '#F7F7F5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, color: '#1B1D1F', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ fontSize: 12, color: '#8B2020', background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.2)', borderRadius: 8, padding: '9px 12px', marginBottom: 12 }}>⚠ {error}</div>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 12, background: loading ? 'rgba(156,204,252,0.5)' : '#9CCCFC', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1B1D1F', cursor: loading ? 'wait' : 'pointer', marginTop: 8 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
