"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, CheckCircle, AlertCircle } from "lucide-react"

interface EmailConfirmationProps {
  email: string
  onBack?: () => void
}

export function EmailConfirmation({ email, onBack }: EmailConfirmationProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const supabase = createClient()

  const handleResendConfirmation = async () => {
    setLoading(true)
    setError("")
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess("Confirmation email sent again! Please check your inbox.")
      }
    } catch (error) {
      setError("Failed to resend confirmation email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-green-600" />
          Check Your Email
        </CardTitle>
        <CardDescription>
          We have sent a confirmation link to your email address
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Email Sent</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                We have sent a confirmation link to <strong>{email}</strong>
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please check your email and click the confirmation link to activate your account.
          </p>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>• Check your spam folder if you don&apos;t see the email</p>
            <p>• The link will expire in 24 hours</p>
            <p>• You can request a new confirmation email below</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            {success}
          </div>
        )}

        <div className="space-y-3">
          <Button 
            onClick={handleResendConfirmation} 
            variant="outline" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? "Sending..." : "Resend Confirmation Email"}
          </Button>
          
          {onBack && (
            <Button 
              onClick={onBack} 
              variant="ghost" 
              className="w-full"
            >
              Back to Registration
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}