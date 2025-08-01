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
    const getSession = async () => {
      console.log("=== AUTH PROVIDER: Getting session ===")
      const {
        data: { session },
      } = await supabase.auth.getSession()
      console.log("Session:", session?.user?.id)
      setUser(session?.user ?? null)

      if (session?.user) {
        console.log("Fetching profile for user:", session.user.id)
        const { data: profileData, error: profileError } = await supabase.from("users").select("*").eq("id", session.user.id).single()
        console.log("Profile data:", profileData, "Error:", profileError)
        setProfile(profileData)
      }

      setLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("=== AUTH PROVIDER: Auth state change ===", event, session?.user?.id)
      setUser(session?.user ?? null)

      if (session?.user) {
        console.log("Auth state change - fetching profile for user:", session.user.id)
        const { data: profileData, error: profileError } = await supabase.from("users").select("*").eq("id", session.user.id).single()
        console.log("Profile data on auth change:", profileData, "Error:", profileError)
        setProfile(profileData)
      } else {
        console.log("Auth state change - no session, clearing profile")
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
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
