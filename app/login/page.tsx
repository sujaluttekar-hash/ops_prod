'use client'
import { useState } from 'react'

// Exact match to Supabase profiles table
const USERS: Record<string, { password: string; role: string; name: string; squad: string | null; id: string }> = {
  'admin@stayvista.com':         { id: 'd035c01f-6987-4e76-8ab7-a562235ed2c8', password: 'StayVista@2026', role: 'super_admin', name: 'Aditi',           squad: 'All'      },
  'sujal@stayvista.com':         { id: '8d5da751-3269-4d77-b837-45253a9435c5', password: 'sujal@123',      role: 'ops_manager', name: 'Sujal',           squad: 'All'      },
  'sujal.uttekar@stayvista.com': { id: 'd71e6f0f-916d-4fec-af8d-d14113f70ae4', password: 'StayVista@2026', role: 'butler',      name: 'Sujal Uttekar',   squad: null       },
  'atish@stayvista.com':         { id: 'fedb395e-476c-43d7-a76f-c87f8e508856', password: 'atish@123',      role: 'butler',      name: 'Atish Tandkar',   squad: 'Nashik'   },
  'kalpesh@stayvista.com':       { id: '30ebc89e-17fc-43db-b9a8-46398d24a1e3', password: 'kalpesh@123',    role: 'butler',      name: 'Kalpesh Ther',    squad: 'Alibaug'  },
  'kohinoor@stayvista.com':      { id: 'f3ad17de-169d-4832-93e9-6f3a1b30b1e2', password: 'kohinoor@123',   role: 'butler',      name: 'Kohinoor Shinde', squad: 'Karjat'   },
  'manoj@stayvista.com':         { id: '24e03c68-5cd0-47aa-a695-75850ac2a81d', password: 'manoj@123',      role: 'butler',      name: 'Manoj Valmiki',   squad: 'Lonavala' },
  'nimish@stayvista.com':        { id: '326c84fa-7c94-42a4-b7a2-6545f1398308', password: 'nimish@123',     role: 'butler',      name: 'Nimish',          squad: 'Alibaug'  },
  'butler@stayvista.com':        { id: '0835f144-513d-4107-968f-bb0c3ddbd6df', password: 'butler@123',     role: 'butler',      name: 'Ravi Kumar',      squad: 'Lonavala' },
  'vinayak@stayvista.com':       { id: '4b2cc4e7-876b-490a-a315-192c67424328', password: 'vinayak@123',    role: 'butler',      name: 'Vinayak Kharade', squad: 'Lonavala' },
  'vishal@stayvista.com':        { id: '4ab59e13-1d68-4607-bef8-b9fb013827ac', password: 'vishal@123',     role: 'butler',      name: 'Vishal',          squad: 'Karjat'   },
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!forgotEmail) return
    setForgotLoading(true)
    try {
      await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.toLowerCase().trim() }),
      })
    } catch {}
    setForgotSent(true)
    setForgotLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const key = email.toLowerCase().trim()

    // 1. Check hardcoded USERS first (fast, no network)
    const match = USERS[key]
    if (match) {
      if (match.password !== password) {
        setError('Incorrect password.')
        setLoading(false)
        return
      }
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
                <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1B1D1F', marginBottom: 8 }}>Check your email</div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
                  Your password has been sent to <strong>{forgotEmail}</strong> and your supervisor at <strong>sujal.uttekar@stayvista.com</strong>
                </div>
                <div style={{ background: '#F7F7F5', borderRadius: 10, padding: '12px 20px', fontSize: 12, color: '#6B7280', marginBottom: 24, lineHeight: 1.5 }}>
                  📱 If the email doesn't arrive in 2 minutes, check your spam folder or contact your supervisor directly.
                </div>
                <button onClick={() => { setForgotMode(false); setForgotSent(false); }}
                  style={{ width: '100%', padding: 12, background: '#9CCCFC', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1B1D1F', cursor: 'pointer' }}>
                  Back to login
                </button>
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
