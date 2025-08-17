"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Dumbbell, TrendingUp, Clock, RefreshCw, Target, Activity, Play, ArrowRight, CheckCircle, Zap, Filter } from 'lucide-react'
import { useDashboardData } from "@/lib/hooks/use-dashboard-data"
import { User, WorkoutWithDetails, DashboardStats, Program } from "@/types"
import dynamic from "next/dynamic"
const SharedCalendar = dynamic(() => import("../ui/shared-calendar").then(m => m.SharedCalendar), {
  ssr: false,
  loading: () => <div className="h-64 w-full rounded-md border flex items-center justify-center text-sm text-muted-foreground">Loading calendar…</div>
})
import { AppLink } from "../ui/app-link"
import { createClient } from "@/lib/supabase/client"

interface UserDashboardProps {
  user: User
  initialStats?: DashboardStats
  initialWorkouts?: WorkoutWithDetails[]
}

export function UserDashboard({ user, initialStats, initialWorkouts }: UserDashboardProps) {
  const supabase = createClient()
  const { stats, upcomingWorkouts, loading, error, refetch, refetchQuietly } = useDashboardData({
    userId: user.id,
    isCoach: false,
    initialStats,
    initialUpcomingWorkouts: initialWorkouts,
  })

  const [todaysWorkouts, setTodaysWorkouts] = useState<WorkoutWithDetails[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<string>("all")
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([])

  // Listen for broadcast updates for instant UI without full refetch
  useEffect(() => {
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('workouts')
      bc.onmessage = (event) => {
        const msg = event.data as any
        if (!msg || msg.type !== 'updated') return
        setWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...(msg.changes || {}) } : w)))
      }
    } catch {
      const handler = (e: StorageEvent) => {
        if (e.key !== 'workout-updated' || !e.newValue) return
        try {
          const msg = JSON.parse(e.newValue)
          if (!msg || msg.type !== 'updated') return
          setWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...(msg.changes || {}) } : w)))
        } catch {}
      }
      window.addEventListener('storage', handler)
      return () => window.removeEventListener('storage', handler)
    }
    return () => { try { bc && bc.close() } catch {} }
  }, [])

  // Cross-device broadcast: reflect updates from other devices/sessions instantly (also helps PWA)
  useEffect(() => {
    const channel = supabase
      .channel('workouts-live')
      .on('broadcast', { event: 'workout-updated' }, (payload: any) => {
        const msg = (payload && (payload.payload || payload)) as any
        if (!msg || msg.type !== 'updated') return
        if (msg.userId && msg.userId !== user.id) return
        setWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...(msg.changes || {}) } : w)))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, user.id])

  // When window regains focus (common on mobile/PWA after navigating back), refresh quietly
  useEffect(() => {
    const onFocus = () => { if (refetchQuietly) refetchQuietly() }
    if (typeof window !== 'undefined') window.addEventListener('focus', onFocus)
    return () => { if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus) }
  }, [refetchQuietly])

  // Get unique programs from upcomingWorkouts and memoize them
  const programs = useMemo(() => {
    return upcomingWorkouts?.reduce((acc: Program[], workout: WorkoutWithDetails) => {
      if (workout.program && !acc.find(p => p.id === workout.program.id)) {
        acc.push(workout.program)
      }
      return acc
    }, []) || []
  }, [upcomingWorkouts]);

  // Filter workouts based on selected program
  const filteredWorkouts = useMemo(() => {
    return selectedProgramId === "all" 
      ? upcomingWorkouts || []
      : (upcomingWorkouts || []).filter(workout => workout.program?.id === Number(selectedProgramId))
  }, [selectedProgramId, upcomingWorkouts]);

  // Update workouts state when filtered workouts change (merge, don't overwrite)
  useEffect(() => {
    setWorkouts((prev) => {
      if (prev.length === 0) return filteredWorkouts
      const byId = new Map(prev.map((w) => [w.id, w]))
      for (const w of filteredWorkouts) {
        const existing = byId.get(w.id)
        // Prefer existing (locally updated/broadcast) values over stale backend ones
        byId.set(w.id, existing ? { ...w, ...existing } : w)
      }
      return Array.from(byId.values())
    })
  }, [filteredWorkouts])

  // Get today's workouts
  useEffect(() => {
    if (filteredWorkouts.length > 0) {
      const today = new Date()
      const todayString = today.toDateString()
      const workoutsToday = filteredWorkouts.filter(workout => {
        if (!workout.scheduled_date) return false
        const workoutDate = new Date(workout.scheduled_date)
        return workoutDate.toDateString() === todayString
      })
      setTodaysWorkouts(workoutsToday)
    } else {
      setTodaysWorkouts([])
    }
  }, [filteredWorkouts])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No date set"
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow"
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const handleWorkoutUpdate = (updatedWorkouts: WorkoutWithDetails[]) => {
    setWorkouts(updatedWorkouts)
    // Background sync without triggering loading state
    if (refetchQuietly) {
      refetchQuietly()
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Dashboard</h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Welcome Header with Stats */}
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            {/* Greeting Section */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {getGreeting()}, {user.name}!
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Ready to crush your fitness goals today?
                </p>
              </div>
            </div>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:ml-16">
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                <div className="w-6 h-6 mx-auto mb-1 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Activity className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats?.activePrograms || 0}</div>
                <div className="text-xs text-green-600/80 dark:text-green-400/80">Active Programs</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
                <div className="w-6 h-6 mx-auto mb-1 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats?.completedWorkouts || 0}</div>
                <div className="text-xs text-purple-600/80 dark:text-purple-400/80">Completed</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                <div className="w-6 h-6 mx-auto mb-1 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Target className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats?.totalPrograms || 0}</div>
                <div className="text-xs text-blue-600/80 dark:text-blue-400/80">Total Programs</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-center">
                <div className="w-6 h-6 mx-auto mb-1 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <Clock className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats?.upcomingWorkouts || 0}</div>
                <div className="text-xs text-orange-600/80 dark:text-orange-400/80">Upcoming</div>
              </div>
            </div>
            {/* Start Today's Workout Button */}
            {todaysWorkouts.length > 0 && (
              <div className="pt-2 border-t sm:ml-16">
                <Button asChild className="w-full sm:w-auto">
                  <AppLink href={`/dashboard/workouts/${todaysWorkouts[0].id}`}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Today&#39;s Workout
                  </AppLink>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Program Filter */}
      {programs.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map(program => (
                    <SelectItem key={program.id} value={String(program.id)}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      <div className="mb-6">
        <SharedCalendar
          workouts={workouts}
          onWorkoutUpdate={handleWorkoutUpdate}
          userRole="user"
          userId={user.id}
        />
      </div>

      {/* Quick Actions and Upcoming Workouts */}
      <div className="sm:grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AppLink href="/dashboard/workouts" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Dumbbell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">View Workouts</p>
                    <p className="text-xs text-muted-foreground">See all your workouts</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </AppLink>
            <AppLink href="/dashboard/programs" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">My Programs</p>
                    <p className="text-xs text-muted-foreground">Manage your programs</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </AppLink>
            <Separator />
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Keep it up!</span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                You are making great progress on your fitness journey.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Workouts */}
        <Card className="lg:col-span-2 mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 sm:text-lg">
                <Calendar className="h-5 w-5" />
                Upcoming Workouts
              </CardTitle>
              {upcomingWorkouts && upcomingWorkouts.length > 0 && (
                <AppLink href="/dashboard/workouts">
                  <Button variant="ghost" size="sm">
                    <span className="hidden sm:inline">View all</span>
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </AppLink>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!upcomingWorkouts || upcomingWorkouts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No workouts yet</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Your coach hasn&#39; t added any workouts to this program yet.
                </p>
                <AppLink href="/dashboard/programs">
                  <Button variant="outline">
                    <Target className="h-4 w-4 mr-2" />
                    Browse Programs
                  </Button>
                </AppLink>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingWorkouts.slice(0, 5).map((workout, index) => (
                  <div key={workout.id}>
                    <div className="flex items-center gap-3 p-3 px-0 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                              {workout.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              <span className="hidden sm:inline">{workout.program?.name || 'No Program'}</span>
                              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                              <span className="font-medium">{formatDate(workout.scheduled_date)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="hidden sm:flex text-xs">
                              Pending
                            </Badge>
                            <Button size="sm" asChild>
                              <AppLink href={`/dashboard/workouts/${workout.id}`}>
                                <Play className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Start</span>
                                <span className="sm:hidden">Go</span>
                              </AppLink>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < upcomingWorkouts.slice(0, 5).length - 1 && <Separator />}
                  </div>
                ))}
                {upcomingWorkouts.length > 5 && (
                  <div className="text-center pt-3 border-t">
                    <AppLink href="/dashboard/workouts">
                      <Button variant="ghost" size="sm">
                        <span className="text-sm">View {upcomingWorkouts.length - 5} more workouts</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </AppLink>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
