import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { UserProfile, UserRole } from '../types/database'

const DEMO_USERS: Record<string, UserProfile> = {
  'radhika@raptee.com': {
    id: 'demo-radhika-001',
    email: 'radhika@raptee.com',
    full_name: 'Radhika S',
    role: 'cce',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  'sanmitha@raptee.com': {
    id: 'demo-sanmitha-002',
    email: 'sanmitha@raptee.com',
    full_name: 'Sanmitha V',
    role: 'field_intelligence',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  'admin@raptee.com': {
    id: 'demo-admin-003',
    email: 'admin@raptee.com',
    full_name: 'Admin User',
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
}

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  isDemoMode: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured)

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.warn('Profile not found in Supabase:', error.message)
        return null
      }
      return data as UserProfile
    } catch (err) {
      console.warn('Failed to fetch profile:', err)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user && isSupabaseConfigured) {
      const p = await fetchProfile(user.id)
      if (p) setProfile(p)
    }
  }

  useEffect(() => {
    let isMounted = true

    // Safety timeout: Ensure loading is never permanently stuck
    const timer = setTimeout(() => {
      if (isMounted) setLoading(false)
    }, 1500)

    const initAuth = async () => {
      // 1. Check local demo session first if not configured
      if (!isSupabaseConfigured) {
        try {
          const cached = localStorage.getItem('raptee_demo_user')
          if (cached) {
            const p: UserProfile = JSON.parse(cached)
            if (isMounted) {
              setProfile(p)
              setUser({ id: p.id, email: p.email } as User)
            }
          }
        } catch (e) {
          console.warn('Demo session restore error:', e)
        }
        if (isMounted) setLoading(false)
        return
      }

      // 2. Real Supabase Auth
      try {
        const { data: { session: s }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (isMounted) {
          setSession(s)
          setUser(s?.user ?? null)
          if (s?.user) {
            const p = await fetchProfile(s.user.id)
            setProfile(p)
          }
        }
      } catch (err) {
        console.warn('Supabase getSession failed, falling back to demo mode:', err)
        setIsDemoMode(true)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes if real Supabase is configured
    let subscription: { unsubscribe: () => void } | null = null
    if (isSupabaseConfigured) {
      try {
        const { data } = supabase.auth.onAuthStateChange(async (_event, s) => {
          if (!isMounted) return
          setSession(s)
          setUser(s?.user ?? null)
          if (s?.user) {
            const p = await fetchProfile(s.user.id)
            setProfile(p)
          } else {
            setProfile(null)
          }
          setLoading(false)
        })
        subscription = data.subscription
      } catch (err) {
        console.warn('Auth state subscription failed:', err)
      }
    }

    return () => {
      isMounted = false
      clearTimeout(timer)
      subscription?.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    // If not configured with a live Supabase instance, authenticate via demo users
    if (!isSupabaseConfigured || isDemoMode) {
      const lower = email.trim().toLowerCase()
      const demoProfile = DEMO_USERS[lower] || {
        id: `demo-${Date.now()}`,
        email: lower,
        full_name: lower.split('@')[0],
        role: 'cce' as UserRole,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setProfile(demoProfile)
      setUser({ id: demoProfile.id, email: demoProfile.email } as User)
      localStorage.setItem('raptee_demo_user', JSON.stringify(demoProfile))
      return { error: null }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error }

      if (data.user) {
        let p = await fetchProfile(data.user.id)
        if (!p) {
          // Fallback profile if row hasn't been created yet
          p = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.email?.split('@')[0] || 'Raptee User',
            role: 'cce',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        }
        setProfile(p)
        setUser(data.user)
      }
      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut()
      } catch {}
    }
    localStorage.removeItem('raptee_demo_user')
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isDemoMode,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
