"use client"

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Activity } from 'lucide-react'
import { trainerRoadClient, TrainerRoadAPIError } from '@/lib/trainerroad/client'
import { TrainerRoadAuthForm } from '@/components/trainerroad/auth-form'
import { TrainerRoadWorkoutList } from '@/components/trainerroad/workout-list'

export function TrainerRoadDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      setIsCheckingAuth(true)
      setAuthError(null)
      
      const isAuth = await trainerRoadClient.checkAuthStatus()
      setIsAuthenticated(isAuth)
      
      if (isAuth) {
        console.log('✅ TRAINERROAD: User is authenticated')
      } else {
        console.log('ℹ️ TRAINERROAD: User is not authenticated')
      }
    } catch (error) {
      console.error('❌ TRAINERROAD: Error checking auth status:', error)
      setAuthError('Failed to check authentication status')
      setIsAuthenticated(false)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
    setAuthError(null)
  }

  const handleAuthError = (error: string) => {
    setAuthError(error)
    setIsAuthenticated(false)
  }

  const handleSignOut = async () => {
    try {
      await trainerRoadClient.signOut()
      setIsAuthenticated(false)
      setAuthError(null)
    } catch (error) {
      console.error('❌ TRAINERROAD: Sign out error:', error)
      setAuthError('Failed to sign out')
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-lg">Checking TrainerRoad connection...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {authError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{authError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Connect to TrainerRoad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Connect your TrainerRoad account to sync your training activities and view your workout history.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  What you can do with TrainerRoad integration:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• View your recent TrainerRoad workouts</li>
                  <li>• See workout details including TSS, duration, and intensity</li>
                  <li>• Track your training progress and performance</li>
                  <li>• Sync data securely through our servers</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <TrainerRoadAuthForm 
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  Connected to TrainerRoad
                </h3>
                <p className="text-sm text-green-700 dark:text-green-200">
                  Your account is successfully connected and ready to sync data.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkAuthStatus}
                disabled={isCheckingAuth}
              >
                {isCheckingAuth ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workout List */}
      <TrainerRoadWorkoutList />
    </div>
  )
}
