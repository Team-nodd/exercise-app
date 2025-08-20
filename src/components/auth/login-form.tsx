"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useGlobalLoading } from "@/components/providers/loading-provider"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const supabase = createClient()
  const { loading, setLoading } = useGlobalLoading()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError("Login failed - no user data received")
        setLoading(false)
        return
      }

      // Get user profile to determine redirect
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single()

      if (profileError) {
        // If profile doesn't exist, create it
        const { data: newProfile, error: createError } = await supabase
          .from("users")
          .insert({
            id: authData.user.id,
            email: authData.user.email!,
            name: authData.user.user_metadata?.full_name || authData.user.email!.split("@")[0],
            role: "user",
          })
          .select()
          .single()

        if (createError) {
          setError("Failed to create user profile")
          setLoading(false)
          return
        }

        // Use replace instead of push to prevent back navigation to login
        router.replace("/dashboard")
        return
      }

      // Redirect based on role - use replace to prevent back navigation
      const redirectUrl = profile.role === "coach" ? "/coach/dashboard" : "/dashboard"
      console.log("🔄 LOGIN: Redirecting to:", redirectUrl)
      router.replace(redirectUrl)
    } catch (error) {
      console.error("Login error:", error)
      setError("An unexpected error occurred")
      setLoading(false)
    }
    // Don't setLoading(false) here, let the global loading reset on route change
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="px-0">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your email"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your password"
              className="h-11"
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
