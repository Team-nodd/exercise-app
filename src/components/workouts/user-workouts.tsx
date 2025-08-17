"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, Dumbbell, Play, Target, Zap, CheckCircle2, Circle, Filter, TrendingUp } from 'lucide-react'
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { WorkoutWithDetails, Program } from "@/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AppLink } from "../ui/app-link"

interface UserWorkoutsProps {
  userId: string
}

export function UserWorkouts({ userId }: UserWorkoutsProps) {
  const [allWorkouts, setAllWorkouts] = useState<WorkoutWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [displayFilter, setDisplayFilter] = useState<"all" | "upcoming" | "completed">("all")
  const [selectedProgramId, setSelectedProgramId] = useState<string>("all")
  const supabase = createClient()

  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        // Fetch all workouts for the user, ordered by scheduled_date ascending
        const { data, error } = await supabase
          .from("workouts")
          .select(`
            *,
            program:programs(id, name)
          `)
          .eq("user_id", userId)
          .order("scheduled_date", { ascending: true }) // Order ascending as requested

        if (error) {
          console.error("Error fetching workouts:", error)
          return
        }

        setAllWorkouts(data as WorkoutWithDetails[])
      } catch (error) {
        console.error("Error fetching workouts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkouts()
  }, [userId, supabase])

  // Get unique programs from all fetched workouts
  const programs = useMemo(() => {
    const uniquePrograms = new Map<number, Pick<Program, 'id' | 'name'>>();
    allWorkouts.forEach(workout => {
      if (workout.program) {
        uniquePrograms.set(workout.program.id, workout.program);
      }
    });
    return Array.from(uniquePrograms.values());
  }, [allWorkouts]);

  // Filter workouts by selected program first
  const workoutsFilteredByProgram = useMemo(() => {
    if (selectedProgramId === "all") {
      return allWorkouts;
    }
    return allWorkouts.filter(workout => workout.program?.id?.toString() === selectedProgramId);
  }, [allWorkouts, selectedProgramId]);

  // Apply the display filter (All, Upcoming, Completed)
  const displayedWorkouts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    return workoutsFilteredByProgram.filter(workout => {
      if (displayFilter === "upcoming") {
        return !workout.completed && workout.scheduled_date && new Date(workout.scheduled_date) >= today;
      } else if (displayFilter === "completed") {
        return workout.completed;
      }
      return true; // "all" filter
    });
  }, [workoutsFilteredByProgram, displayFilter]);

  // Calculate stats based on workouts filtered by program (static for cards)
  const stats = useMemo(() => {
    const total = workoutsFilteredByProgram.length;
    const completed = workoutsFilteredByProgram.filter((w) => w.completed).length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = workoutsFilteredByProgram.filter(
      (w) => !w.completed && w.scheduled_date && new Date(w.scheduled_date) >= today,
    ).length;
    return { total, completed, upcoming };
  }, [workoutsFilteredByProgram]);

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
          "items-center justify-center w-10 h-10 rounded-full hidden sm:flex",
          completed
            ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
            : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        )}
      >
        <IconComponent className="h-5 w-5" />
      </div>
    )
  }

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
        </div>

        {/* Program Filter */}
        {programs.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">Filter by Program:</span>
            <Select
              onValueChange={setSelectedProgramId}
              value={selectedProgramId}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id.toString()}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Stats Cards - now clickable and smaller */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <Card
            className={cn(
              "cursor-pointer hover:shadow-md transition-all duration-200",
              "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800",
              displayFilter === "all" && "ring-2 ring-blue-500 dark:ring-blue-400"
            )}
            onClick={() => setDisplayFilter("all")}
          >
            <CardContent className="p-2 sm:p-3 text-center">
              <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
              <div className="text-xs sm:text-sm text-blue-600/80 dark:text-blue-400/80">Total</div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "cursor-pointer hover:shadow-md transition-all duration-200",
              "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800",
              displayFilter === "completed" && "ring-2 ring-green-500 dark:ring-green-400"
            )}
            onClick={() => setDisplayFilter("completed")}
          >
            <CardContent className="p-2 sm:p-3 text-center">
              <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
              <div className="text-xs sm:text-sm text-green-600/80 dark:text-green-400/80">Completed</div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "cursor-pointer hover:shadow-md transition-all duration-200",
              "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800",
              displayFilter === "upcoming" && "ring-2 ring-orange-500 dark:ring-orange-400"
            )}
            onClick={() => setDisplayFilter("upcoming")}
          >
            <CardContent className="p-2 sm:p-3 text-center">
              <div className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">{stats.upcoming}</div>
              <div className="text-xs sm:text-sm text-orange-600/80 dark:text-orange-400/80">Upcoming</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Workouts List */}
      {displayedWorkouts.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Dumbbell className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No workouts found</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-sm mx-auto">
              {displayFilter === "upcoming"
                ? "You don't have any upcoming workouts scheduled."
                : displayFilter === "completed"
                  ? "You haven't completed any workouts yet."
                  : "No workouts available with the selected filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedWorkouts.map((workout, index) => (
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
                        href={`/dashboard/workouts/${workout.id}`}
                        className={cn(
                          "text-xs sm:text-sm",
                          workout.completed
                            ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            : "bg-blue-600 hover:bg-blue-700 text-white",
                        )}
                      >
                        <AppLink href={`/dashboard/workouts/${workout.id}?from=workouts`}>
                          <Play className="h-3.5 w-3.5 mr-1.5" />
                          {workout.completed ? "View Details" : "Start Workout"}
                        </AppLink>
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
