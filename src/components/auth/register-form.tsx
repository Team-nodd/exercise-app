"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"user" | "coach">("user")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  // const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("=== REGISTRATION DEBUG START ===")
      console.log("Registering user:", { name, email, role })

      // First, sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      })

      console.log("Auth signup result:", { authData, authError })

      if (authError) {
        console.error("Auth error:", authError)
        // toast({
        //   title: "Error",
        //   description: authError.message,
        //   variant: "destructive",
        // })
        return
      }

      if (authData.user) {
        console.log("User created, now creating profile...")

        // Wait a moment for the auth session to be established
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Insert user profile into our users table
        const { error: profileError } = await supabase.from("users").insert({
          id: authData.user.id,
          name,
          email,
          role,
        })

        console.log("Profile creation result:", { profileError })

        if (profileError) {
          console.error("Profile creation error:", profileError)

          // More detailed error handling
          if (profileError.code === "42501") {
            // toast({
            //   title: "Database Error",
            //   description: "Unable to create user profile due to security policies. Please contact support.",
            //   variant: "destructive",
            // })
          } else {
            // toast({
            //   title: "Error",
            //   description: `Failed to create user profile: ${profileError.message}`,
            //   variant: "destructive",
            // })
          }
          return
        }

        console.log("Profile created successfully!")

        // toast({
        //   title: "Success",
        //   description: "Account created successfully! You can now sign in.",
        // })

        // Use window.location for more reliable redirect
        window.location.href = "/auth/login"
      }
    } catch (error) {
      console.error("Registration error:", error)
      // toast({
      //   title: "Error",
      //   description: "An unexpected error occurred. Please try again.",
      //   variant: "destructive",
      // })
    } finally {
      setLoading(false)
      console.log("=== REGISTRATION DEBUG END ===")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
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
          minLength={6}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Account Type</Label>
        <Select value={role} onValueChange={(value: "user" | "coach") => setRole(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select account type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User (Athlete)</SelectItem>
            <SelectItem value="coach">Coach (Trainer)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Account
      </Button>
      <div className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </form>
  )
}
