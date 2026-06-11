'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase } from './supabase';

export type Profile = {
  id: string
  name: string | null
  email: string
  role: 'super_admin' | 'ops_manager' | 'butler' | 'trainer'
  squad: string | null
  property_id: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

type AuthContextType = {
  user: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const sb = getSupabase()
        const { data: { session } } = await sb.auth.getSession()
        
        if (!session?.user?.id) {
          setUser(null)
          setLoading(false)
          return
        }

        // Fetch profile by auth ID
        const { data: profile } = await sb
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          setUser(profile as Profile)
        } else {
          // Fallback to email lookup
          const { data: profileByEmail } = await sb
            .from('profiles')
            .select('*')
            .eq('email', session.user.email)
            .single()
          setUser(profileByEmail as Profile || null)
        }
      } catch (err) {
        console.error('Auth load error:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    // Listen for auth changes
    const sb = getSupabase()
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!session?.user?.id) {
        setUser(null)
        return
      }

      const { data: profile } = await sb
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      setUser(profile as Profile || null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const signOut = async () => {
    const sb = getSupabase()
    await sb.auth.signOut()
    setUser(null)
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
