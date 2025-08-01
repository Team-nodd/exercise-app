"use client"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("=== LOGIN DEBUG START ===")
      console.log("Attempting to sign in with:", { email })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log("Auth response:", { data, error })

      if (error) {
        console.error("Sign in error:", error)
        alert(`Login failed: ${error.message}`)
        toast(error.message)
        return
      }

      if (data.user) {
        console.log("User authenticated:", data.user.id)

        // Wait for auth state to propagate
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Check if user profile exists
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .single()

        console.log("Profile check:", { profile, profileError })

        if (profileError || !profile) {
          console.error("Profile not found, creating one...")

          // Create profile if it doesn't exist
          const { error: insertError } = await supabase.from("users").insert({
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || "User",
            email: data.user.email!,
            role: data.user.user_metadata?.role || "user",
          })

          if (insertError) {
            console.error("Failed to create profile:", insertError)
            toast("Failed to create user profile. Please try again.")
            return
          }

          // Refetch the profile
          const { data: newProfile } = await supabase.from("users").select("*").eq("id", data.user.id).single()

          console.log("Created profile:", newProfile)
        }

        toast("Logged in successfully!")

        // Use window.location for more reliable redirect
        console.log("Redirecting...")
        window.location.href = "/dashboard"
      }
    } catch (error) {
      console.error("Unexpected error during sign in:", error)
      toast("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
      console.log("=== LOGIN DEBUG END ===")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>
      <div className="text-center text-sm">
        {"Don't have an account? "}
        <Link href="/auth/register" className="text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </form>
  )
}
