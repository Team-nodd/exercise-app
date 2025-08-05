"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, User, Clock, Dumbbell, Target, CheckCircle, Circle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { ProgramWithDetails, WorkoutWithDetails } from "@/types"

interface UserProgramDetailProps {
  program: ProgramWithDetails
}

export function UserProgramDetail({ program }: UserProgramDetailProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>(program.workouts || [])
  const [loading, setLoading] = useState(false)
  // const { toast } = useToast()
  const supabase = createClient()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const calculateProgress = () => {
    if (workouts.length === 0) return 0
    const completedWorkouts = workouts.filter((w) => w.completed).length
    return Math.round((completedWorkouts / workouts.length) * 100)
  }

  const toggleWorkoutCompletion = async (workoutId: string, completed: boolean) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from("workouts")
        .update({
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null,
        })
        .eq("id", workoutId)

      if (error) throw error

      // Update local state
      setWorkouts((prev) =>
        prev.map((w) =>
          String(w.id) === String(workoutId)
            ? { ...w, completed: !completed, completed_at: !completed ? new Date().toISOString() : null }
            : w,
        ),
      )

      toast( `Workout marked as ${!completed ? "completed" : "incomplete"}`)
    } catch (error) {
      console.error("Error updating workout:", error)
      toast("Failed to update workout status")
    } finally {
      setLoading(false)
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/programs" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Programs
            </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{program.name}</h1>
            <p className="text-gray-600 dark:text-gray-300">{program.description || "No description provided"}</p>
          </div>
          <Badge className={getStatusColor(program.status)}>
            {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Program Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Coach</p>
                <p className="font-semibold">{program.coach.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Workouts</p>
                <p className="font-semibold">{totalWorkouts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Completed</p>
                <p className="font-semibold">{completedWorkouts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Progress</p>
                <p className="font-semibold">{progress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {totalWorkouts > 0 && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Overall Progress</h3>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {completedWorkouts}/{totalWorkouts} workouts completed
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Program Details and Workouts */}
      <Tabs defaultValue="workouts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
          <TabsTrigger value="details">Program Details</TabsTrigger>
        </TabsList>

        <TabsContent value="workouts" className="space-y-6">
          {totalWorkouts === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No workouts yet</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Your coach has not added any workouts to this program yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {date === "Unscheduled"
                        ? "Unscheduled Workouts"
                        : new Date(date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {groupedWorkouts[date].map((workout) => (
                        <div
                          key={workout.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleWorkoutCompletion(String(workout.id), workout.completed)}
                              disabled={loading}
                              className="p-1"
                            >
                              {workout.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400" />
                              )}
                            </Button>

                            <div>
                              <h4 className="font-semibold">{workout.name}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                                {/* Type and duration are not available on WorkoutWithDetails, so we omit them */}
                                {workout.completed && workout.completed_at && (
                                  <span className="text-green-600">
                                    Completed {new Date(workout.completed_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {workout.notes && <p className="text-sm text-gray-500 mt-1">{workout.notes}</p>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/workouts/${workout.id}`}>View Details</Link>
                            </Button>
                          </div>
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
              <CardTitle>Program Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Start Date</label>
                  <p className="text-sm">
                    {program.start_date ? new Date(program.start_date).toLocaleDateString() : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300">End Date</label>
                  <p className="text-sm">
                    {program.end_date ? new Date(program.end_date).toLocaleDateString() : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Created</label>
                  <p className="text-sm">{new Date(program.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(program.status)}>
                      {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {program.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Description</label>
                  <p className="text-sm mt-1">{program.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
