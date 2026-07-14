'use client'
import { useState } from 'react'
import { APP_USERS as USERS } from '@/lib/config'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [foundPassword, setFoundPassword] = useState('')
  const [foundName, setFoundName] = useState('')

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!forgotEmail) return
    setForgotLoading(true)
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.toLowerCase().trim() }),
      })
      const data = await res.json()
      if (data.password) setFoundPassword(data.password)
      if (data.name) setFoundName(data.name)
    } catch {}
    setForgotSent(true)
    setForgotLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const key = email.toLowerCase().trim()

    // 1. Check hardcoded USERS first (fast)
    const match = USERS[key]
    if (match) {
      if (match.password !== password) {
        setError('Incorrect password.')
        setLoading(false)
        return
      }
      // Check is_active in DB — hardcoded users can be deactivated via credentials tab
      try {
        const activeRes = await fetch(
          `https://ryuxwnbrdsjwzwdimynd.supabase.co/rest/v1/profiles?id=eq.${match.id}&select=is_active`,
          {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA',
            }
          }
        )
        const rows = await activeRes.json()
        if (Array.isArray(rows) && rows.length > 0 && rows[0].is_active === false) {
          setError('This account has been deactivated. Contact your admin.')
          setLoading(false)
          return
        }
      } catch {} // If DB check fails, allow login (fail-open for reliability)

      localStorage.setItem('sv_local_session', JSON.stringify({
        id: match.id, name: match.name, email: key,
        role: match.role, squad: match.squad,
        property_id: null, phone: null, is_active: true,
        created_at: new Date().toISOString(), updated_at: null,
      }))
      window.location.replace('/dashboard')
      return
    }

    // 2. Not in hardcoded list — check Supabase profiles table (for newly added users)
    try {
      const res = await fetch(
        `https://ryuxwnbrdsjwzwdimynd.supabase.co/rest/v1/profiles?email=eq.${encodeURIComponent(key)}&is_active=eq.true&select=id,name,email,role,squad,password_hash`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dXh3bmJyZHNqd3p3ZGlteW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5OTE1OCwiZXhwIjoyMDk1OTc1MTU4fQ.oMKEwSjxX8JodtjuhKcA_UhzTKoASAdYeOhf-azkEgA',
          }
        }
      )
      const users = await res.json()
      if (!Array.isArray(users) || users.length === 0) {
        setError('No account found for this email.')
        setLoading(false)
        return
      }
      const dbUser = users[0]
      // Check password (stored as plain text in password_hash column for local auth)
      if (dbUser.password_hash !== password) {
        setError('Incorrect password.')
        setLoading(false)
        return
      }
      localStorage.setItem('sv_local_session', JSON.stringify({
        id: dbUser.id, name: dbUser.name, email: key,
        role: dbUser.role, squad: dbUser.squad,
        property_id: null, phone: null, is_active: true,
        created_at: new Date().toISOString(), updated_at: null,
      }))
      window.location.replace('/dashboard')
    } catch {
      setError('Login failed. Please try again.')
      setLoading(false)
    }
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
        {/* Forgot password overlay */}
        {forgotMode && (
          <div style={{ position: 'absolute', inset: 0, background: '#fff', borderRadius: 20, padding: '44px 40px', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 2, background: 'linear-gradient(90deg, #9CCCFC, #FED5A9, #E9A0A7)', borderRadius: 1, marginBottom: 32 }} />
            {!forgotSent ? (
              <>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1B1D1F', marginBottom: 6 }}>Forgot password?</div>
                  <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>Enter your work email. Your password will be sent to you and to your supervisor.</div>
                </div>
                <form onSubmit={handleForgot}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Work email</label>
                  <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    placeholder="your@stayvista.com" required autoFocus
                    style={{ width: '100%', padding: '11px 14px', background: '#F7F7F5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, color: '#1B1D1F', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
                  <button type="submit" disabled={forgotLoading}
                    style={{ width: '100%', padding: 12, background: forgotLoading ? 'rgba(156,204,252,0.5)' : '#9CCCFC', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1B1D1F', cursor: forgotLoading ? 'wait' : 'pointer', marginBottom: 10 }}>
                    {forgotLoading ? 'Sending…' : 'Send my password'}
                  </button>
                  <button type="button" onClick={() => setForgotMode(false)}
                    style={{ width: '100%', padding: 11, background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, color: '#6B7280', cursor: 'pointer' }}>
                    Back to login
                  </button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                {foundPassword ? (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#1B1D1F', marginBottom: 4 }}>Hi {foundName}!</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>Here are your login credentials:</div>
                    <div style={{ width: '100%', background: '#F7F7F5', borderRadius: 12, padding: '18px 20px', marginBottom: 20, textAlign: 'left' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 }}>Email</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1B1D1F', marginBottom: 14 }}>{forgotEmail}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 }}>Password</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#1B1D1F', fontFamily: 'monospace', background: '#fff', padding: '10px 14px', borderRadius: 8, border: '2px solid #9CCCFC', letterSpacing: 2 }}>{foundPassword}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 20 }}>📋 Screenshot this screen to save your password</div>
                    <button onClick={() => { setForgotMode(false); setForgotSent(false); setFoundPassword(''); setFoundName(''); setEmail(forgotEmail); }}
                      style={{ width: '100%', padding: 12, background: '#9CCCFC', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#1B1D1F', cursor: 'pointer' }}>
                      Login now →
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>❓</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1B1D1F', marginBottom: 8 }}>Email not found</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 1.5 }}>No account found for <strong>{forgotEmail}</strong>. Contact your supervisor.</div>
                    <button onClick={() => { setForgotMode(false); setForgotSent(false); }}
                      style={{ width: '100%', padding: 12, background: '#F7F7F5', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1B1D1F', cursor: 'pointer' }}>
                      Back to login
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@stayvista.com" required autoComplete="email"
              style={{ width: '100%', padding: '11px 14px', background: '#F7F7F5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, color: '#1B1D1F', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password"
              style={{ width: '100%', padding: '11px 14px', background: '#F7F7F5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, color: '#1B1D1F', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 4 }}>
            <button type="button" onClick={() => { setForgotMode(true); setForgotEmail(email); setForgotSent(false); }}
              style={{ background: 'none', border: 'none', fontSize: 12, color: '#9CCCFC', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
              Forgot password?
            </button>
          </div>
          {error && (
            <div style={{ fontSize: 12, color: '#8B2020', background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.2)', borderRadius: 8, padding: '9px 12px', marginBottom: 12 }}>
              ⚠ {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 12, background: loading ? 'rgba(156,204,252,0.5)' : '#9CCCFC', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1B1D1F', cursor: loading ? 'wait' : 'pointer', marginTop: 8 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
