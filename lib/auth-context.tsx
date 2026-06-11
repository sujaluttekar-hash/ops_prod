'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase } from './supabase';

export type Profile = {
  id: string; name: string | null; email: string;
  role: 'super_admin' | 'ops_manager' | 'butler' | 'trainer';
  squad: string | null; property_id: string | null; phone: string | null;
  is_active: boolean; created_at: string; updated_at: string | null;
}

type AuthContextType = { user: Profile | null; loading: boolean; signOut: () => Promise<void> }
const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      // 1. Try local session first (works even when Supabase is unreachable)
      try {
        const local = localStorage.getItem('sv_local_session')
        if (local) {
          const profile = JSON.parse(local) as Profile
          setUser(profile)
          setLoading(false)
          // Also try to get real Supabase session in background
          trySupabase(profile)
          return
        }
      } catch {}

      // 2. Try Supabase session with timeout
      await trySupabaseOnly()
    }

    async function trySupabase(localProfile: Profile) {
      try {
        const sb = getSupabase()
        const { data: { session } } = await Promise.race([
          sb.auth.getSession(),
          new Promise<any>((_, r) => setTimeout(() => r(new Error('timeout')), 4000))
        ]) as any
        if (session?.user?.id) {
          const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
          if (data) {
            setUser(data as Profile)
            localStorage.setItem('sv_local_session', JSON.stringify(data))
          }
        }
      } catch {}
    }

    async function trySupabaseOnly() {
      try {
        const sb = getSupabase()
        const result = await Promise.race([
          sb.auth.getSession(),
          new Promise<any>((_, r) => setTimeout(() => r(new Error('timeout')), 4000))
        ]) as any

        if (result?.data?.session?.user?.id) {
          const { data } = await sb.from('profiles').select('*')
            .eq('id', result.data.session.user.id).maybeSingle()
          if (data) {
            setUser(data as Profile)
            localStorage.setItem('sv_local_session', JSON.stringify(data))
          }
        }
      } catch {}
      setLoading(false)
    }

    init()

    // Listen for real Supabase auth changes
    try {
      const sb = getSupabase()
      const { data: { subscription } } = sb.auth.onAuthStateChange(async (event: any, session: any) => {
        // Only act on Supabase SIGNED_OUT event - don't clear local session just because
        // Supabase has no session (we use localStorage-based auth, not Supabase auth)
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('sv_local_session')
          setUser(null)
          setLoading(false)
          return
        }
        if (!session?.user) return // ignore — local session still valid
        try {
          const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
          if (data) {
            setUser(data as Profile)
            localStorage.setItem('sv_local_session', JSON.stringify(data))
          }
        } catch {}
        setLoading(false)
      })
      return () => subscription?.unsubscribe()
    } catch {}
  }, [])

  const signOut = async () => {
    localStorage.removeItem('sv_local_session')
    try { await getSupabase().auth.signOut() } catch {}
    setUser(null)
    setLoading(false)
    window.location.replace('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
