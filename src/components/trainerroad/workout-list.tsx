"use client"

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Loader2, RefreshCw, Calendar, Clock, Zap, Activity } from 'lucide-react'
import { trainerRoadClient, TrainerRoadAPIError } from '@/lib/trainerroad/client'
import type { TrainerRoadWorkout } from '@/lib/trainerroad/types'

export function TrainerRoadWorkoutList() {
  const [workouts, setWorkouts] = useState<TrainerRoadWorkout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchWorkouts()
  }, [])

  const fetchWorkouts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      console.log('🔄 TRAINERROAD: Fetching recent workouts...')
      const activities = await trainerRoadClient.getRecentActivities(20)
      
      setWorkouts(activities)
      console.log(`✅ TRAINERROAD: Fetched ${activities.length} workouts`)

    } catch (error) {
      console.error('❌ TRAINERROAD: Error fetching workouts:', error)
      
      let errorMessage = 'Failed to fetch workouts'
      
      if (error instanceof TrainerRoadAPIError) {
        if (error.status === 401) {
          errorMessage = 'Session expired. Please disconnect and reconnect your TrainerRoad account.'
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchWorkouts(true)
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getIntensityColor = (intensityFactor: number): string => {
    if (intensityFactor >= 0.8) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    if (intensityFactor >= 0.7) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
    if (intensityFactor >= 0.6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
    return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
  }

  const getIntensityLabel = (intensityFactor: number): string => {
    if (intensityFactor >= 0.8) return 'Very Hard'
    if (intensityFactor >= 0.7) return 'Hard'
    if (intensityFactor >= 0.6) return 'Moderate'
    return 'Easy'
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Workouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Loading your TrainerRoad workouts...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Workouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Workout Library ({workouts.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {workouts.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No workouts found in the TrainerRoad library.</p>
            <p className="text-sm mt-2">Check your TrainerRoad connection or try refreshing!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => (
              <div
                key={workout.Id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                      {workout.WorkoutName }
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {workout.Progression?.Text || 'Training'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Level {workout.ProgressionLevel}
                      </div>
                    </div>
                  </div>
                  <Badge className={getIntensityColor(workout.IntensityFactor / 100)}>
                    {getIntensityLabel(workout.IntensityFactor / 100)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <Clock className="h-4 w-4" />
                      Duration
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {workout.Duration} min
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <Zap className="h-4 w-4" />
                      TSS
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {workout.Tss}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <Activity className="h-4 w-4" />
                      Energy
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {workout.Kj} kJ
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <Zap className="h-4 w-4" />
                      IF
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {(workout.IntensityFactor / 100).toFixed(2)}
                    </div>
                  </div>
                </div>

                {workout.WorkoutDescription && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <div 
                      className="text-sm text-blue-800 dark:text-blue-200"
                      dangerouslySetInnerHTML={{ __html: workout.WorkoutDescription }}
                    />
                  </div>
                )}

                {workout.GoalDescription && (
                  <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-1">Goal:</p>
                    <div 
                      className="text-sm text-green-700 dark:text-green-300"
                      dangerouslySetInnerHTML={{ __html: workout.GoalDescription }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
