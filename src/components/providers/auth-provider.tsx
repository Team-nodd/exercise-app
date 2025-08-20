"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
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
  const pathname = usePathname()

  const supabase = useMemo(() => createClient(), [])

  const getProfileFromLocalStorage = (userId: string): Profile | null => {
    try {
      const raw = localStorage.getItem(`exercise-app-profile:${userId}`)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Profile
      return parsed || null
    } catch {
      return null
    }
  }

  const saveProfileToLocalStorage = (userId: string, profile: Profile) => {
    try {
      localStorage.setItem(`exercise-app-profile:${userId}`, JSON.stringify(profile))
    } catch {
      // ignore quota errors
    }
  }

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    // Check cache first
    const cached = profileCache.current.get(userId)
    if (cached) {

      return cached
    }

    // Check localStorage cache to support offline startup
    const local = getProfileFromLocalStorage(userId)
    if (local) {
      profileCache.current.set(userId, local)

      return local
    }

    // Prevent duplicate fetches for the same user
    if (fetchingProfile.current === userId) {

      return null
    }

    try {
      fetchingProfile.current = userId


      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Profile fetch timeout")), 5000) // Reduced to 5 seconds
      })

      const fetchPromise = supabase.from("users").select("id, name, email, role").eq("id", userId).single()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

      if (error) {
        console.error("❌ AUTH: Error fetching profile:", error)
        // Fall back to localStorage if available
        const fallback = getProfileFromLocalStorage(userId)
        return fallback
      }


      const profileData = data as Profile

      // Cache the profile
      profileCache.current.set(userId, profileData)
      saveProfileToLocalStorage(userId, profileData)

      return profileData
    } catch (error) {
      console.error("❌ AUTH: Profile fetch failed:", error)
      // Fall back to localStorage if available
      const fallback = getProfileFromLocalStorage(userId)
      return fallback
    } finally {
      fetchingProfile.current = null
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {


        // If we have an initial session, use it
        if (initialSession?.user) {

          setUser(initialSession.user)
          if (initialProfile) {
            setProfile(initialProfile)
            setLoading(false)
          } else {
            // Fallback fetch only if profile was not provided from the server
            const p = await fetchProfile(initialSession.user.id)
            if (mounted) {
              if (p) setProfile(p)
              setLoading(false)
            }
          }
        } else {
          // No initial session, check for existing session
          const { data: { session } } = await supabase.auth.getSession()
          if (mounted) {
            if (session?.user) {

              setUser(session.user)
              const p = await fetchProfile(session.user.id)
              if (p) setProfile(p)
            }
            setLoading(false)
          }
        }
      } catch (error) {
        console.error("❌ AUTH: Initialization error:", error)
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {

        setLoading(false)
      }
    }, 10000) // 10 second timeout

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {


      // Skip profile fetch for certain events that don't require it
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {

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
          const profileData = await fetchProfile(session.user.id)
          if (mounted) {
            if (profileData) {
              setProfile(profileData)
            }
            setLoading(false)
          }
        } else {

          if (mounted) {
            setLoading(false)
          }
        }
      } else {
        
        if (mounted) {
          setProfile(null)
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [initialSession, initialProfile, supabase])

  // Client-side guard: redirect unauthenticated users from protected routes
  useEffect(() => {
    if (loading) return // Don't redirect while loading
    
    const publicRoutes = ["/", "/auth/login", "/auth/register", "/offline", "/auth/callback"]
    const isPublic = publicRoutes.includes(pathname)
    
    if (!user && !isPublic) {

      router.replace("/auth/login")
    }
  }, [loading, user, pathname, router])

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      // Clear cache and state
      profileCache.current.clear()
      try {
        if (user?.id) localStorage.removeItem(`exercise-app-profile:${user.id}`)
      } catch {}
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
