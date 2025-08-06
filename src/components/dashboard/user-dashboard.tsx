"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, Dumbbell, TrendingUp, Clock, RefreshCw, Target, Activity, Play, ArrowRight, CheckCircle, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from "next/link"
import { useDashboardData } from "@/lib/hooks/use-dashboard-data"
import { User } from "@/types"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface UserDashboardProps {
  user: User
}

export function UserDashboard({ user }: UserDashboardProps) {
  const { stats, upcomingWorkouts, loading, error, refetch } = useDashboardData({
    userId: user.id,
    isCoach: false,
  })

  const [currentDate, setCurrentDate] = useState(new Date())
  const [todaysWorkouts, setTodaysWorkouts] = useState<any[]>([])
  const [showWorkoutSelectionDialog, setShowWorkoutSelectionDialog] = useState(false)
  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<any[]>([])

  // Get today's workouts
  useEffect(() => {
    if (upcomingWorkouts.length > 0) {
      const today = new Date()
      const todayString = today.toDateString()
      const workoutsToday = upcomingWorkouts.filter(workout => {
        if (!workout.scheduled_date) return false
        const workoutDate = new Date(workout.scheduled_date)
        return workoutDate.toDateString() === todayString
      })
      setTodaysWorkouts(workoutsToday)
    }
  }, [upcomingWorkouts])

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

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getWorkoutsForDate = (date: Date) => {
    const dateString = date.toDateString()
    return upcomingWorkouts.filter(workout => {
      if (!workout.scheduled_date) return false
      const workoutDate = new Date(workout.scheduled_date)
      return workoutDate.toDateString() === dateString
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handleDayClick = (workouts: any[]) => {
    if (workouts.length === 1) {
      window.location.href = `/dashboard/workouts/${workouts[0].id}`
    } else if (workouts.length > 1) {
      setSelectedDayWorkouts(workouts)
      setShowWorkoutSelectionDialog(true)
    }
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const today = new Date()
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 sm:h-24"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const workoutsForDay = getWorkoutsForDate(date)
      const isToday = date.toDateString() === today.toDateString()
      const isPast = date < today && !isToday

      days.push(
        <div
          key={day}
          className={cn(
            "h-20 sm:h-24 p-1 border border-gray-100 dark:border-gray-800 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex flex-col",
            isToday && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
            isPast && "text-gray-400 dark:text-gray-600"
          )}
          onClick={() => handleDayClick(workoutsForDay)}
        >
          <div className="text-xs sm:text-sm font-medium">{day}</div>
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {workoutsForDay.map(workout => (
              <div
                key={workout.id}
                className={cn(
                  "text-xs font-medium px-1 py-0.5 rounded-sm truncate mb-0.5",
                  workout.completed ? "bg-green-200 text-green-800 dark:bg-green-700/50 dark:text-green-200" : "bg-blue-200 text-blue-800 dark:bg-blue-700/50 dark:text-blue-200"
                )}
              >
                {workout.name}
              </div>
            ))}
          </div>
        </div>
      )
    }

    return days
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
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:ml-15">
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                <div className="w-6 h-6 mx-auto mb-1 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Activity className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats?.activePrograms || 0}</div>
                <div className="text-xs text-green-600/80 dark:text-green-400/80">Active Workouts</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
                <div className="w-6 h-6 mx-auto mb-1 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats?.completedWorkouts || 0}</div>
                <div className="text-xs text-purple-600/80 dark:text-purple-400/80">Workouts Completed</div>
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
                <div className="text-xs text-orange-600/80 dark:text-orange-400/80">Upcoming Workouts</div>
              </div>
            </div>

            {/* Start Today's Workout Button */}
            {todaysWorkouts.length > 0 && (
              <div className="pt-2 border-t sm:ml-15">
                <Button asChild className="w-full sm:w-auto">
                  <Link href={`/dashboard/workouts/${todaysWorkouts[0].id}`}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Today&#39;s Workout
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 sm:text-lg">
              <Calendar className="h-5 w-5" />
              Workout Schedule
            </CardTitle>
            <div className="flex items-center ">
              <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[100px] text-center">
                {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="h-6 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions and Upcoming Workouts */}
      <div className=" sm:grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/workouts" className="block">
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
            </Link>

            <Link href="/dashboard/programs" className="block">
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
            </Link>

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
        <Card className="lg:col-span-2 mt-4 sm:mt-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 sm:text-lg">
                <Calendar className="h-5 w-5" />
                Upcoming Workouts
              </CardTitle>
              {upcomingWorkouts.length > 0 && (
                <Link href="/dashboard/workouts">
                  <Button variant="ghost" size="sm">
                    <span className="hidden sm:inline">View all</span>
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {upcomingWorkouts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No upcoming workouts</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                  Check your programs to see available workouts.
                </p>
                <Link href="/dashboard/programs">
                  <Button variant="outline">
                    <Target className="h-4 w-4 mr-2" />
                    Browse Programs
                  </Button>
                </Link>
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
                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate ">
                              {workout.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              <span className="hidden sm:inline">{workout.program?.name}</span>
                              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                              <span className="font-medium">{formatDate(workout.scheduled_date)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="hidden sm:flex text-xs">
                              Pending
                            </Badge>
                            <Button size="sm" asChild>
                              <Link href={`/dashboard/workouts/${workout.id}`}>
                                <Play className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Start</span>
                                <span className="sm:hidden">Go</span>
                              </Link>
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
                    <Link href="/dashboard/workouts">
                      <Button variant="ghost" size="sm">
                        <span className="text-sm">View {upcomingWorkouts.length - 5} more workouts</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workout Selection Dialog */}
      <Dialog open={showWorkoutSelectionDialog} onOpenChange={setShowWorkoutSelectionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Workout</DialogTitle>
            <DialogDescription>
              Multiple workouts are scheduled for this day. Please select one to view.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="grid gap-2 py-4">
              {selectedDayWorkouts.map(workout => (
                <Link
                  key={workout.id}
                  href={`/dashboard/workouts/${workout.id}`}
                  onClick={() => setShowWorkoutSelectionDialog(false)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                    workout.completed ? "bg-green-50 dark:bg-green-900/20" : "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  <span className="font-medium">{workout.name}</span>
                  <Badge variant="secondary" className={cn(
                    workout.completed ? "bg-green-200 text-green-800 dark:bg-green-700/50 dark:text-green-200" : "bg-blue-200 text-blue-800 dark:bg-blue-700/50 dark:text-blue-200"
                  )}>
                    {workout.completed ? 'Completed' : 'Scheduled'}
                  </Badge>
                </Link>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
