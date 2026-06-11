'use client'
import { useState } from 'react'
import { getSupabase } from '@/lib/supabase'

export default function AuthDebugPage() {
  const [log, setLog] = useState<string[]>([])
  const [email, setEmail] = useState('butler@stayvista.com')
  const [password, setPassword] = useState('StayVista@2026')
  const [running, setRunning] = useState(false)

  function addLog(msg: string) {
    setLog(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0,8)} — ${msg}`])
  }

  async function runDiagnosis() {
    setLog([])
    setRunning(true)
    addLog('Starting auth diagnosis...')

    // Step 1: existing session
    try {
      const { data: { session }, error } = await getSupabase().auth.getSession()
      if (error) addLog(`❌ getSession error: ${error.message}`)
      else if (session) addLog(`✅ Existing session: ${session.user.email}`)
      else addLog('ℹ No existing session — clean state')
    } catch (e: any) { addLog(`❌ getSession threw: ${e.message}`) }

    // Step 2: signIn
    addLog(`Calling signInWithPassword for ${email}...`)
    try {
      const t = Date.now()
      const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })
      addLog(`signInWithPassword took ${Date.now() - t}ms`)

      if (error) {
        addLog(`❌ ERROR: ${error.message} | status: ${error.status}`)
        setRunning(false)
        return
      }

      if (!data?.session) {
        addLog('❌ No session in response')
        setRunning(false)
        return
      }

      addLog(`✅ Auth OK — user_id: ${data.session.user.id}`)
      addLog(`✅ email: ${data.session.user.email}`)
      addLog(`✅ token: ${data.session.access_token ? data.session.access_token.slice(0,20) + '...' : 'MISSING'}`)
      addLog(`✅ expires_in: ${data.session.expires_in}s`)

      // Step 3: profiles lookup
      addLog('Looking up profiles table...')
      const t2 = Date.now()
      const { data: profile, error: pErr } = await getSupabase()
        .from('profiles').select('id,name,email,role').eq('id', data.session.user.id).maybeSingle()
      addLog(`profiles query took ${Date.now() - t2}ms`)

      if (pErr) addLog(`❌ Profile error: ${pErr.message} (${pErr.code})`)
      else if (!profile) {
        addLog(`⚠ No profile for id=${data.session.user.id} — trying email...`)
        const { data: p2, error: e2 } = await getSupabase()
          .from('profiles').select('id,name,email,role').eq('email', data.session.user.email ?? '').maybeSingle()
        if (e2) addLog(`❌ Email fallback error: ${e2.message}`)
        else if (!p2) addLog(`❌ NO PROFILE FOUND — user exists in auth but not in profiles table`)
        else addLog(`✅ Profile by email: ${p2.name} / ${p2.role}`)
      } else {
        addLog(`✅ Profile: ${profile.name} / ${profile.role}`)
      }

      addLog('All checks done. Redirecting to dashboard in 2s...')
      setTimeout(() => { window.location.replace('/dashboard') }, 2000)
    } catch (e: any) {
      addLog(`❌ Exception: ${e.message}`)
      setRunning(false)
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 680, margin: '40px auto', fontFamily: 'monospace' }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Auth Diagnosis</div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>Tests each step of the login flow and shows exact results.</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        <button onClick={runDiagnosis} disabled={running} style={{ padding: '8px 16px', background: '#1B1D1F', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          {running ? 'Running…' : 'Run'}
        </button>
      </div>
      <div style={{ background: '#0f1117', color: '#9CCCFC', padding: 16, borderRadius: 8, minHeight: 280, fontSize: 12, lineHeight: 2 }}>
        {log.length === 0 && <span style={{ color: '#444' }}>Click Run to diagnose...</span>}
        {log.map((line, i) => (
          <div key={i} style={{ color: line.includes('❌') ? '#E9A0A7' : line.includes('✅') ? '#97C459' : line.includes('⚠') ? '#FED5A9' : '#9CCCFC' }}>{line}</div>
        ))}
      </div>
    </div>
  )
}
