"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User, Session } from "@supabase/supabase-js"
import type { User as AppUser } from "@/types"

interface AuthContextType {
  user: User | null
  profile: AppUser | null
  loading: boolean
  signOut: () => Promise<void>
}

interface AuthProviderProps {
  children: React.ReactNode
  initialSession?: Session | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(!initialSession?.user)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    const getSession = async () => {
      console.log("🔄 AUTH PROVIDER: Getting initial session...")
      
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        console.log("🔍 AUTH PROVIDER: Client session result:", { 
          hasSession: !!session, 
          userId: session?.user?.id, 
          error: sessionError?.message 
        })

        if (sessionError) {
          console.error("❌ AUTH PROVIDER: Session error:", sessionError)
          if (mounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        console.log("✅ AUTH PROVIDER: Initial session loaded:", session?.user?.id || "No user")

        if (mounted) {
          setUser(session?.user ?? null)
        }

        if (session?.user && mounted) {
          console.log("🔄 AUTH PROVIDER: Fetching initial profile for user:", session.user.id)
          
          try {
            const { data: profileData, error: profileError } = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .single()

            console.log("🔍 AUTH PROVIDER: Initial profile fetch result:", { 
              hasProfile: !!profileData, 
              profileName: profileData?.name, 
              error: profileError?.message 
            })

            if (mounted) {
              if (profileError) {
                console.error("❌ AUTH PROVIDER: Initial profile error:", profileError)
                setProfile(null)
              } else {
                console.log("✅ AUTH PROVIDER: Initial profile loaded:", profileData?.name)
                setProfile(profileData)
              }
              setLoading(false)
            }
          } catch (error) {
            console.error("❌ AUTH PROVIDER: Initial profile fetch error:", error)
            if (mounted) {
              setProfile(null)
              setLoading(false)
            }
          }
        } else if (mounted) {
          console.log("🔄 AUTH PROVIDER: No initial session, setting loading to false")
          setProfile(null)
          setLoading(false)
        }
      } catch (error) {
        console.error("❌ AUTH PROVIDER: Auth provider error:", error)
        if (mounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    // If we have an initial session, use it and fetch the profile
    if (initialSession?.user) {
      console.log("✅ AUTH PROVIDER: Using initial session for user:", initialSession.user.id)
      setUser(initialSession.user)
      
      // Fetch profile for the initial session
      const fetchInitialProfile = async () => {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", initialSession.user.id)
            .single()

          if (mounted) {
            if (profileError) {
              console.error("❌ AUTH PROVIDER: Initial profile error:", profileError)
              setProfile(null)
            } else {
              console.log("✅ AUTH PROVIDER: Initial profile loaded:", profileData?.name)
              setProfile(profileData)
            }
            setLoading(false)
          }
        } catch (error) {
          console.error("❌ AUTH PROVIDER: Initial profile fetch error:", error)
          if (mounted) {
            setProfile(null)
            setLoading(false)
          }
        }
      }
      
      fetchInitialProfile()
    } else {
      // No initial session, get it from the client
      getSession()
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log("🔄 AUTH PROVIDER: Auth state change - event:", event, "user:", session?.user?.id, "currentUser:", user?.id, "currentProfile:", profile?.name)

      // Only set loading to true for specific events that require data fetching
      // Don't set loading for TOKEN_REFRESHED or other non-critical events
      const shouldSetLoading = ['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)
      
      if (shouldSetLoading) {
        console.log("⏳ AUTH PROVIDER: Setting loading to true for event:", event)
        setLoading(true)
      } else {
        console.log("ℹ️ AUTH PROVIDER: Skipping loading state for event:", event)
      }

      setUser(session?.user ?? null)

      if (session?.user) {
        console.log("🔄 AUTH PROVIDER: Fetching profile for user:", session.user.id)
        
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single()

          console.log("🔍 AUTH PROVIDER: Profile fetch result:", { 
            hasProfile: !!profileData, 
            profileName: profileData?.name, 
            error: profileError?.message 
          })

          if (mounted) {
            if (profileError) {
              console.error("❌ AUTH PROVIDER: Profile error on auth change:", profileError)
              setProfile(null)
              setLoading(false)
            } else {
              console.log("✅ AUTH PROVIDER: Profile loaded successfully:", profileData?.name)
              setProfile(profileData)
              setLoading(false)
            }
          }
        } catch (error) {
          console.error("❌ AUTH PROVIDER: Profile fetch error on auth change:", error)
          if (mounted) {
            setProfile(null)
            setLoading(false)
          }
        }
      } else {
        console.log("🔄 AUTH PROVIDER: No session, clearing profile and user")
        if (mounted) {
          setProfile(null)
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, initialSession])

  // Refresh the page if ?code is present in the URL (after email confirmation)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("code")) {
        setTimeout(() => {
          url.searchParams.delete("code");
          window.location.replace(url.pathname + url.search);
        }, 1000); // 1 second delay
      }
    }
  }, []);

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
