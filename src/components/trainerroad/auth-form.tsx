"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { trainerRoadClient, TrainerRoadAPIError } from '@/lib/trainerroad/client'

interface TrainerRoadAuthFormProps {
  onAuthSuccess?: () => void
  onAuthError?: (error: string) => void
}

export function TrainerRoadAuthForm({ onAuthSuccess, onAuthError }: TrainerRoadAuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      console.log('🔄 TRAINERROAD AUTH: Starting direct backend authentication to TrainerRoad...')
      
      // Authenticate directly through our backend which makes the request to TrainerRoad
      const result = await trainerRoadClient.authenticate({
        email: email.trim(),
        password,
      })

      if (result.success) {
        setSuccess(true)
        setPassword('') // Clear password for security
        console.log('✅ TRAINERROAD AUTH: Direct authentication successful')
        onAuthSuccess?.()
      } else {
        setError(result.message || 'Authentication failed')
        onAuthError?.(result.message || 'Authentication failed')
      }

    } catch (error) {
      console.error('❌ TRAINERROAD AUTH: Authentication error:', error)
      
      let errorMessage = 'Authentication failed'
      
      if (error instanceof TrainerRoadAPIError) {
        // Use the actual error message from the backend/TrainerRoad
        errorMessage = error.message
        
        // Only add generic messages if we don't have a specific one
        if (!errorMessage || errorMessage === 'Authentication failed') {
          if (error.status === 401) {
            errorMessage = 'Invalid email or password. Please check your TrainerRoad credentials.'
          } else if (error.status === 429) {
            errorMessage = 'Too many login attempts. Please wait a few minutes and try again.'
          } else if (error.status === 400) {
            errorMessage = 'Please refresh the page and try again.'
          } else {
            errorMessage = 'Authentication failed. Please try again.'
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setError(errorMessage)
      onAuthError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await trainerRoadClient.signOut()
      setSuccess(false)
      setEmail('')
      setPassword('')
      console.log('✅ TRAINERROAD AUTH: Signed out successfully')
    } catch (error) {
      console.error('❌ TRAINERROAD AUTH: Sign out error:', error)
      setError('Failed to sign out')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            TrainerRoad Connected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Successfully connected to TrainerRoad. You can now sync your activities.
          </p>
          <Button 
            onClick={handleSignOut} 
            variant="outline" 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing out...
              </>
            ) : (
              'Sign Out'
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connect TrainerRoad</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">TrainerRoad Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">TrainerRoad Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your TrainerRoad password"
              disabled={isLoading}
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isLoading || !email || !password}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect to TrainerRoad'
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Your credentials are used only to authenticate with TrainerRoad and are not stored.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
