"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User, Session } from "@supabase/supabase-js"


interface Profile {
  id: string
  name: string
  email: string
  role: "coach" | "user"
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

interface AuthProviderProps {
  children: React.ReactNode
  initialSession?: Session | null
  initialProfile?: Profile | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)


export function AuthProvider({ children, initialSession, initialProfile }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  const [profile, setProfile] = useState<Profile | null>(initialProfile ?? null)
  const [loading, setLoading] = useState(true)
  const fetchingProfile = useRef<string | null>(null) // Track which user we're fetching profile for
  const profileCache = useRef<Map<string, Profile>>(new Map()) // Cache profiles
  const router = useRouter()

  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    // Check cache first
    const cached = profileCache.current.get(userId)
    if (cached) {
      console.log("📦 AUTH: Using cached profile for:", userId)
      return cached
    }

    // Prevent duplicate fetches for the same user
    if (fetchingProfile.current === userId) {
      console.log("⏳ AUTH: Profile fetch already in progress for:", userId)
      return null
    }

    try {
      fetchingProfile.current = userId
      console.log("🔄 AUTH: Fetching profile for user:", userId)

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Profile fetch timeout")), 5000) // Reduced to 5 seconds
      })

      const fetchPromise = supabase.from("users").select("id, name, email, role").eq("id", userId).single()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

      if (error) {
        console.error("❌ AUTH: Error fetching profile:", error)
        return null
      }

      console.log("✅ AUTH: Profile loaded successfully:", data?.name)
      const profileData = data as Profile

      // Cache the profile
      profileCache.current.set(userId, profileData)

      return profileData
    } catch (error) {
      console.error("❌ AUTH: Profile fetch failed:", error)
      return null
    } finally {
      fetchingProfile.current = null
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log("🔄 AUTH: Initializing auth...")

        // If we have an initial session, use it
        if (initialSession?.user) {
          console.log("🔄 AUTH: Using initial session for user:", initialSession.user.id)
          setUser(initialSession.user)
          if (initialProfile) setProfile(initialProfile)
          else {
            // Fallback fetch only if profile was not provided from the server
            const p = await fetchProfile(initialSession.user.id)
            if (p) setProfile(p)
          }
          if (mounted) setLoading(false)
          return
        }

        // Otherwise, get the current session
        console.log("🔄 AUTH: Getting current session...")
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          console.log("🔄 AUTH: Found session, fetching profile for:", session.user.id)
          setUser(session.user)
          const p = await fetchProfile(session.user.id)
          if (p) setProfile(p)
        } else {
          console.log("🔄 AUTH: No session found")
        }

        if (mounted) {
          setLoading(false)
          console.log("✅ AUTH: Initialization complete")
        }
      } catch (error) {
        console.error("❌ AUTH: Initialization error:", error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log("🔄 AUTH: Auth state change:", event, "User:", session?.user?.id || "none")

      // Skip profile fetch for certain events that don't require it
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        console.log("ℹ️ AUTH: Skipping profile fetch for event:", event)
        return
      }

      // Set loading only for relevant auth events
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED" ||
        event === "PASSWORD_RECOVERY" ||
        event === "MFA_CHALLENGE_VERIFIED"
      ) {
        setLoading(true)
      }

      setUser(session?.user ?? null)

      if (session?.user) {
        // Only fetch profile if we don't already have it or if it's a different user
        const currentProfile = profile
        const isSameUser = currentProfile?.id === session.user.id

        if (!isSameUser) {
          console.log("🔄 AUTH: Fetching profile for new user:", session.user.id)
          const profileData = await fetchProfile(session.user.id)
          if (mounted) {
            if (profileData) {
              setProfile(profileData)
            }
            setLoading(false)
          }
        } else {
          console.log("ℹ️ AUTH: Same user, keeping existing profile")
          if (mounted) {
            setLoading(false)
          }
        }
      } else {
        console.log("🔄 AUTH: No session, clearing profile")
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
  }, [initialSession, initialProfile, supabase])

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      // Clear cache and state
      profileCache.current.clear()
      setUser(null)
      setProfile(null)

      // SPA redirect to home
      router.push("/")
    } catch (error) {
      console.error("Sign out error:", error)
      setLoading(false)
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
