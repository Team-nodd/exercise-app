"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, Dumbbell, Play, Target, Zap, CheckCircle2, Circle, Filter, TrendingUp } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { WorkoutWithDetails } from "@/types"

interface UserWorkoutsProps {
  userId: string
}

export function UserWorkouts({ userId }: UserWorkoutsProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all")
  const supabase = createClient()

  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        let query = supabase
          .from("workouts")
          .select(`
            *,
            program:programs(*)
          `)
          .eq("user_id", userId)
          .order("scheduled_date", { ascending: false })

        if (filter === "upcoming") {
          query = query.eq("completed", false).gte("scheduled_date", new Date().toISOString().split("T")[0])
        } else if (filter === "completed") {
          query = query.eq("completed", true)
        }

        const { data, error } = await query

        if (error) {
          console.error("Error fetching workouts:", error)
          return
        }

        setWorkouts(data as WorkoutWithDetails[])
      } catch (error) {
        console.error("Error fetching workouts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkouts()
  }, [userId, filter, supabase])

  const getWorkoutStats = () => {
    const total = workouts.length
    const completed = workouts.filter((w) => w.completed).length
    const upcoming = workouts.filter(
      (w) => !w.completed && w.scheduled_date && new Date(w.scheduled_date) >= new Date(),
    ).length

    return { total, completed, upcoming }
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

  const getWorkoutIcon = (type: string, completed: boolean) => {
    const IconComponent = type === "gym" ? Dumbbell : Clock
    return (
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full",
          completed
            ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
            : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        )}
      >
        <IconComponent className="h-5 w-5" />
      </div>
    )
  }

  const stats = getWorkoutStats()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Workouts</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track your fitness journey</p>
          </div>
          {/* <div className="hidden sm:flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">Filter</span>
          </div> */}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
              <div className="text-xs sm:text-sm text-blue-600/80 dark:text-blue-400/80">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
              <div className="text-xs sm:text-sm text-green-600/80 dark:text-green-400/80">Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.upcoming}</div>
              <div className="text-xs sm:text-sm text-orange-600/80 dark:text-orange-400/80">Upcoming</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {[
            { key: "all", label: "All", count: stats.total },
            { key: "upcoming", label: "Upcoming", count: stats.upcoming },
            { key: "completed", label: "Completed", count: stats.completed },
          ].map(({ key, label, count }) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(key as typeof filter)}
              className={cn(
                "flex-1 text-xs sm:text-sm transition-all duration-200",
                filter === key ? "bg-white text-black dark:text-white dark:bg-gray-700 shadow-sm" : "hover:bg-gray-200 hover:text-black dark:hover:text-white dark:hover:bg-gray-700",
              )}
            >
              {label}
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-xs",
                  filter === key
                    ? "bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
                )}
              >
                {count}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Workouts List */}
      {workouts.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Dumbbell className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No workouts found</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-sm mx-auto">
              {filter === "upcoming"
                ? "You don't have any upcoming workouts scheduled."
                : filter === "completed"
                  ? "You haven't completed any workouts yet."
                  : "No workouts available. Contact your coach to get started!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout, index) => (
            <Card
              key={workout.id}
              className={cn(
                "hover:shadow-md transition-all duration-200 border-l-4",
                workout.completed
                  ? "border-l-green-500 bg-green-50/30 dark:bg-green-900/5"
                  : "border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/5",
              )}
            >
              <CardContent className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-start gap-3 sm:gap-4">
                  {getWorkoutIcon(workout.workout_type, workout.completed)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                          {workout.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {workout.program?.name}
                        </p>
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
                          {workout.completed ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <Circle className="h-3 w-3 mr-1" />
                          )}
                          {workout.completed ? "Done" : "Pending"}
                        </Badge>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* Workout Details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="font-medium">{formatDate(workout.scheduled_date)}</span>
                        </div>

                        {workout.duration_minutes && (
                          <>
                            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{workout.duration_minutes}min</span>
                            </div>
                          </>
                        )}

                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          {workout.workout_type === "gym" ? "Strength" : "Cardio"}
                        </Badge>
                      </div>

                      {/* Cardio specific details */}
                      {workout.workout_type === "cardio" && (workout.intensity_type || workout.target_tss) && (
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          {workout.intensity_type && (
                            <div className="flex items-center gap-1.5">
                              <Zap className="h-3.5 w-3.5" />
                              <span className="capitalize">{workout.intensity_type}</span>
                            </div>
                          )}
                          {workout.target_tss && (
                            <div className="flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5" />
                              <span>TSS {workout.target_tss}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {workout.notes && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mt-3">
                          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {workout.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <Separator className="my-4" />

                    {/* Action Button */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Workout #{index + 1}</span>
                      </div>

                      <Button
                        asChild
                        size="sm"
                        className={cn(
                          "text-xs sm:text-sm",
                          workout.completed
                            ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            : "bg-blue-600 hover:bg-blue-700 text-white",
                        )}
                      >
                        <Link href={`/dashboard/workouts/${workout.id}`}>
                          <Play className="h-3.5 w-3.5 mr-1.5" />
                          {workout.completed ? "View Details" : "Start Workout"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
