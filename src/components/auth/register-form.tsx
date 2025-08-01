"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import Link from "next/link"

export function RegisterForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<"user" | "coach">("user")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("🔄 REGISTER FORM: Starting registration process...")

    setLoading(true)
    setError("")

    try {
      console.log("🔄 REGISTER FORM: Attempting to sign up user:", email, "as", role)

      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role,
          },
        },
      })

      if (authError) {
        console.error("❌ REGISTER FORM: Auth error:", authError.message)
        setError(authError.message)
        return
      }

      if (!authData.user) {
        console.error("❌ REGISTER FORM: No user returned from signup")
        setError("Registration failed")
        return
      }

      console.log("✅ REGISTER FORM: User signed up:", authData.user.id)

      // Create user profile with upsert to handle potential duplicates
      console.log("🔄 REGISTER FORM: Creating user profile...")
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .upsert({
          id: authData.user.id,
          email: email,
          name: name,
          role: role,
        }, {
          onConflict: 'id'
        })
        .select()
        .single()

      if (profileError) {
        console.error("❌ REGISTER FORM: Profile creation error:", profileError.message)
        setError("Failed to create user profile: " + profileError.message)
        return
      }

      console.log("✅ REGISTER FORM: Profile created:", profile)

      // If email confirmation is required, show message
      if (!authData.session) {
        console.log("📧 REGISTER FORM: Email confirmation required")
        setError("Please check your email and click the confirmation link to complete registration.")
        return
      }

      // Redirect based on role
      const redirectUrl = role === "coach" ? "/coach/dashboard" : "/dashboard"
      console.log("🔄 REGISTER FORM: Redirecting to:", redirectUrl)

      // Use window.location.href for reliable redirect
      window.location.href = redirectUrl
    } catch (error) {
      console.error("❌ REGISTER FORM: Unexpected error:", error)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>Create a new account to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your full name"
            />
          </div>
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
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Account Type</Label>
            <Select value={role} onValueChange={(value: "user" | "coach") => setRole(value)} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User (Client)</SelectItem>
                <SelectItem value="coach">Coach (Trainer)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <div className={`text-sm ${error.includes("email") ? "text-blue-600" : "text-red-500"}`}>{error}</div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
