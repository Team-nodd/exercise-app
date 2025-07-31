"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  // const { toast } = useToast()
  const supabase = createClient()

  // Test Supabase connection
  const testConnection = async () => {
    try {
      console.log("Testing Supabase connection...")
      const { data, error } = await supabase.from('users').select('count').limit(1)
      console.log("Connection test result:", { data, error })
      return !error
    } catch (err) {
      console.error("Connection test failed:", err)
      return false
    }
  }

  // Resend verification email
  const resendVerificationEmail = async () => {
    setResendLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })
      
      if (error) {
        setError(`Failed to resend verification email: ${error.message}`)
      } else {
        setError("Verification email sent! Please check your inbox.")
      }
    } catch (err) {
      setError("Failed to resend verification email. Please try again.")
    } finally {
      setResendLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log("=== LOGIN DEBUG START ===")
      console.log("Attempting to sign in with:", { email })
      console.log("Starting authentication...")
      
      // Check environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      console.log("Environment check:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlLength: supabaseUrl?.length,
        keyLength: supabaseKey?.length
      })
      
      if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase environment variables")
        setError("Configuration error. Please contact support.")
        setLoading(false)
        return
      }
      
      // Check if Supabase client is properly configured
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log("Supabase client:", supabase)
      
      console.log("About to test connection...")
      
      // Test connection first
      const isConnected = await testConnection()
      console.log("Connection test result:", isConnected)
      
      if (!isConnected) {
        console.error("Supabase connection failed")
        setError("Connection error. Please try again.")
        setLoading(false)
        return
      }
      
      console.log("About to call signInWithPassword...")
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log("Authentication response received:", { data, error })

      if (error) {
        console.error("Sign in error:", error)
        
        if (error.message === "Email not confirmed") {
          setError("Please verify your email address before signing in. Check your inbox for a verification link.")
        } else {
          setError(error.message)
        }
        
        setLoading(false)
        return
      }

      console.log("Sign in successful:", data.user?.id)
      console.log("Redirecting to dashboard...")

      // Simple redirect approach
      window.location.href = "/dashboard"
    } catch (error) {
      console.error("Unexpected error during sign in:", error)
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    } finally {
      console.log("=== LOGIN DEBUG END ===")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm border rounded-md bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-400">
          {error}
          {error.includes("verify your email") && (
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resendVerificationEmail}
                disabled={resendLoading}
                className="w-full"
              >
                {resendLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resend Verification Email
              </Button>
            </div>
          )}
        </div>
      )}
      
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
