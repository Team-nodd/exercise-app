"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function RegisterForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<"user" | "coach">("user")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
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
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError("Registration failed")
        return
      }

      // Create user profile
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
        setError("Failed to create user profile: " + profileError.message)
        return
      }

      // If email confirmation is required, show message
      if (!authData.session) {
        setError("Please check your email and click the confirmation link to complete registration.")
        return
      }

      // Redirect based on role
      const redirectUrl = role === "coach" ? "/coach/dashboard" : "/dashboard"
      window.location.href = redirectUrl
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
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
          className="h-11"
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
          minLength={6}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Account Type</Label>
        <Select value={role} onValueChange={(value: "user" | "coach") => setRole(value)} disabled={loading}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select account type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User (Client)</SelectItem>
            <SelectItem value="coach">Coach (Trainer)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && (
        <div className={`text-sm ${error.includes("email") ? "text-blue-600" : "text-red-500"}`}>
          {error}
        </div>
      )}
      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? "Creating account..." : "Sign Up"}
      </Button>
    </form>
  )
}
