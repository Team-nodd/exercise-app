"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import Link from "next/link"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("🔄 LOGIN FORM: Starting login process...")

    setLoading(true)
    setError("")

    try {
      console.log("🔄 LOGIN FORM: Attempting to sign in user:", email)

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error("❌ LOGIN FORM: Auth error:", authError.message)
        setError(authError.message)
        return
      }

      console.log("✅ LOGIN FORM: Authentication successful for user:", authData.user?.id)

      // Get user profile to determine redirect
      console.log("🔄 LOGIN FORM: Fetching user profile...")
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single()

      if (profileError) {
        console.error("❌ LOGIN FORM: Profile fetch error:", profileError.message)

        // If profile doesn't exist, create it
        console.log("🔄 LOGIN FORM: Creating missing profile...")
        const { data: newProfile, error: createError } = await supabase
          .from("users")
          .insert({
            id: authData.user.id,
            email: authData.user.email!,
            name: authData.user.user_metadata?.full_name || authData.user.email!.split("@")[0],
            role: "user", // Default role
          })
          .select()
          .single()

        if (createError) {
          console.error("❌ LOGIN FORM: Profile creation error:", createError.message)
          setError("Failed to create user profile")
          return
        }

        console.log("✅ LOGIN FORM: Profile created:", newProfile)

        // Redirect to user dashboard
        console.log("🔄 LOGIN FORM: Redirecting to user dashboard...")
        window.location.href = "/dashboard"
        return
      }

      console.log("✅ LOGIN FORM: Profile found:", profile.name, profile.role)

      // Redirect based on role
      const redirectUrl = profile.role === "coach" ? "/coach/dashboard" : "/dashboard"
      console.log("🔄 LOGIN FORM: Redirecting to:", redirectUrl)

      // Use window.location.href for reliable redirect
      window.location.href = redirectUrl
    } catch (error) {
      console.error("❌ LOGIN FORM: Unexpected error:", error)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent>
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
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Don not have an account?{" "}
          <Link href="/auth/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
