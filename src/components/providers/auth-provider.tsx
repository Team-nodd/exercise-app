"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { User as AppUser } from "@/types"

interface AuthContextType {
  user: User | null
  profile: AppUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    const getSession = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("Session error:", sessionError)
          if (mounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        if (mounted) {
          setUser(session?.user ?? null)
        }

        if (session?.user && mounted) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .single()

            if (profileError) {
              console.error("Profile error:", profileError)
              if (mounted) {
                setProfile(null)
              }
            } else if (mounted) {
              setProfile(profileData)
            }
          } catch (error) {
            console.error("Profile fetch error:", error)
            if (mounted) {
              setProfile(null)
            }
          }
        } else if (mounted) {
          // Explicitly set profile to null when no user
          setProfile(null)
        }

        if (mounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error("Auth provider error:", error)
        if (mounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log("🔄 AUTH PROVIDER: Auth state change - event:", event, "user:", session?.user?.id)

      setUser(session?.user ?? null)

      if (session?.user) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (mounted) {
            if (profileError) {
              console.error("Profile error on auth change:", profileError)
              setProfile(null)
            } else {
              console.log("✅ AUTH PROVIDER: Profile loaded:", profileData?.name)
              setProfile(profileData)
            }
          }
        } catch (error) {
          console.error("Profile fetch error on auth change:", error)
          if (mounted) {
            setProfile(null)
          }
        }
      } else if (mounted) {
        console.log("🔄 AUTH PROVIDER: No session, clearing profile")
        setProfile(null)
      }

      // Always set loading to false after auth state change
      if (mounted) {
        console.log("✅ AUTH PROVIDER: Setting loading to false")
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    try {
      console.log("🔄 AUTH PROVIDER: Starting sign out...")
      
      // Clear local state immediately
      setUser(null)
      setProfile(null)
      setLoading(false)
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error("Sign out error:", error)
        throw error
      }
      
      window.location.href = '/'
      console.log("✅ AUTH PROVIDER: Sign out successful")
    } catch (error) {
      console.error("Sign out error:", error)
      throw error
    }
  }

  return <AuthContext.Provider value={{ user, profile, loading, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
