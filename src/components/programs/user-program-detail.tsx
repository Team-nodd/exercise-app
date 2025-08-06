"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Calendar, User, Clock, Dumbbell, Target, CheckCircle, Circle, ArrowLeft, Play, Activity, TrendingUp, Info } from 'lucide-react'
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { ProgramWithDetails, WorkoutWithDetails } from "@/types"

interface UserProgramDetailProps {
  program: ProgramWithDetails
}

export function UserProgramDetail({ program }: UserProgramDetailProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>(program.workouts || [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "paused":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const calculateProgress = () => {
    if (workouts.length === 0) return 0
    const completedWorkouts = workouts.filter((w) => w.completed).length
    return Math.round((completedWorkouts / workouts.length) * 100)
  }

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

  const progress = calculateProgress()
  const totalWorkouts = workouts.length
  const completedWorkouts = workouts.filter((w) => w.completed).length
  const upcomingWorkouts = workouts.filter((w) => !w.completed && w.scheduled_date).length

  // Group workouts by date
  const groupedWorkouts = workouts.reduce(
    (groups, workout) => {
      const date = workout.scheduled_date ? new Date(workout.scheduled_date).toDateString() : "Unscheduled"
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(workout)
      return groups
    },
    {} as Record<string, WorkoutWithDetails[]>,
  )

  // Sort dates
  const sortedDates = Object.keys(groupedWorkouts).sort((a, b) => {
    if (a === "Unscheduled") return 1
    if (b === "Unscheduled") return -1
    return new Date(a).getTime() - new Date(b).getTime()
  })

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Navigation */}
      <Link
        href="/dashboard/programs"
        className="flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Programs
      </Link>

      {/* Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "hidden sm:flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0",
                program.status === "active"
                  ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                  : program.status === "completed"
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
              )}
            >
              <Target className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">{program.name}</h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3">
                    {program.description || "No description provided"}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4" />
                    <span>Coach: {program.coach.name}</span>
                  </div>
                </div>

                <Badge className={cn("flex items-center gap-1", getStatusColor(program.status))}>
                  {program.status === "active" && <Activity className="h-3 w-3" />}
                  {program.status === "completed" && <CheckCircle className="h-3 w-3" />}
                  {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{totalWorkouts}</div>
            <div className="text-xs sm:text-sm text-blue-600/80 dark:text-blue-400/80">Total</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{completedWorkouts}</div>
            <div className="text-xs sm:text-sm text-green-600/80 dark:text-green-400/80">Completed</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400">{upcomingWorkouts}</div>
            <div className="text-xs sm:text-sm text-orange-600/80 dark:text-orange-400/80">Upcoming</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{progress}%</div>
            <div className="text-xs sm:text-sm text-purple-600/80 dark:text-purple-400/80">Progress</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {totalWorkouts > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-lg font-semibold">Overall Progress</h3>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                {completedWorkouts}/{totalWorkouts} workouts
              </span>
            </div>
            <Progress value={progress} className="h-2 sm:h-3" />
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="workouts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="workouts" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">Workouts</span>
            <span className="sm:hidden">Workouts</span>
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
            <span className="sm:hidden">Details</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workouts" className="space-y-4">
          {totalWorkouts === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Dumbbell className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No workouts yet</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Your coach has not added any workouts to this program yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedDates.map((date) => (
                <Card key={date}>
                  <CardHeader className="">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                      {date === "Unscheduled"
                        ? "Unscheduled Workouts"
                        : new Date(date).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {groupedWorkouts[date].map((workout, index) => (
                        <div key={workout.id}>
                          <div className="flex items-center gap-3 p-3 py-1 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                                    {workout.name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                    <span className="capitalize">
                                      {workout.workout_type === "gym" ? "Strength" : "Cardio"}
                                    </span>
                                    {workout.scheduled_date && (
                                      <>
                                        <span>•</span>
                                        <span>{formatDate(workout.scheduled_date)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge
                                    variant={workout.completed ? "default" : "secondary"}
                                    className={cn(
                                      "text-xs",
                                      workout.completed
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                                    )}
                                  >
                                    {workout.completed ? "Done" : "Pending"}
                                  </Badge>
                                  <Button variant="outline" size="sm" asChild>
                                    <Link href={`/dashboard/workouts/${workout.id}`}>
                                      <Play className="h-3 w-3 mr-1" />
                                      <span className="hidden sm:inline">{workout.completed ? "View" : "Start"}</span>
                                      <span className="sm:hidden">Go</span>
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < groupedWorkouts[date].length - 1 && <Separator className="mt-1" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Program Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Start Date</label>
                  <p className="text-sm font-semibold">
                    {program.start_date ? new Date(program.start_date).toLocaleDateString() : "Not set"}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">End Date</label>
                  <p className="text-sm font-semibold">
                    {program.end_date ? new Date(program.end_date).toLocaleDateString() : "Not set"}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Created</label>
                  <p className="text-sm font-semibold">{new Date(program.created_at).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                  <div>
                    <Badge className={getStatusColor(program.status)}>
                      {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {program.description && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-2">Description</label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{program.description}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
