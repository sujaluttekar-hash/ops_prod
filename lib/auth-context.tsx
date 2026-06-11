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

  async function fetchProfile(userId: string, email: string): Promise<Profile | null> {
    try {
      const sb = getSupabase()
      // Try by ID first
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) return data as Profile

      // Fallback: try by email
      const { data: byEmail } = await sb
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      return (byEmail as Profile) || null
    } catch {
      return null
    }
  }

  useEffect(() => {
    const sb = getSupabase()

    // Get initial session — set loading false immediately after session check
    sb.auth.getSession().then(async ({ data: { session } }: any) => {
      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }
      // Unblock UI immediately with session data, fetch profile in background
      setLoading(false)
      const profile = await fetchProfile(session.user.id, session.user.email ?? '')
      if (profile) setUser(profile)
    }).catch(() => {
      setLoading(false)
    })

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }
      setLoading(false)
      const profile = await fetchProfile(session.user.id, session.user.email ?? '')
      if (profile) setUser(profile)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const signOut = async () => {
    await getSupabase().auth.signOut()
    setUser(null)
    setLoading(false)
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
