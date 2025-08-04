"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("🔄 AUTH CALLBACK: Processing email confirmation...")
        
        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          searchParams.get('code') || ''
        )
        
        if (error) {
          console.error("❌ AUTH CALLBACK: Exchange error:", error)
          setStatus('error')
          setMessage(error.message)
          return
        }

        if (data.session) {
          console.log("✅ AUTH CALLBACK: Session confirmed, user:", data.session.user.id)
          
          setStatus('success')
          setMessage("Email confirmed successfully! Redirecting to your dashboard...")

          // Let the middleware handle the redirect
          setTimeout(() => {
            console.log("🔄 AUTH CALLBACK: Redirecting to dashboard (middleware will handle)...")
            router.push("/dashboard")
          }, 2000)
        } else {
          setStatus('error')
          setMessage("Invalid or expired confirmation link")
        }
      } catch (error) {
        console.error("❌ AUTH CALLBACK: Unexpected error:", error)
        setStatus('error')
        setMessage("An unexpected error occurred")
      }
    }

    handleAuthCallback()
  }, [supabase, router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
            {status === 'error' && <AlertCircle className="h-6 w-6 text-red-600" />}
            Email Confirmation
          </CardTitle>
          <CardDescription>
            {status === 'loading' && "Verifying your email address..."}
            {status === 'success' && "Your email has been confirmed"}
            {status === 'error' && "There was an issue confirming your email"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we verify your email address...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-green-600 dark:text-green-400 font-medium mb-2">
                Email Confirmed Successfully!
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                You will be redirected to your dashboard shortly...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                Confirmation Failed
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {message}
              </p>
              <div className="space-y-2">
                <Link href="/auth/register">
                  <Button className="w-full">Try Registering Again</Button>
                </Link>
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">Go to Login</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 