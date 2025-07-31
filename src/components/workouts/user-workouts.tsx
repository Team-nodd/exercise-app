"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Dumbbell, Play } from "lucide-react"
import Link from "next/link"
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading workouts...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">My Workouts</h1>

        {/* Filter Buttons */}
        <div className="flex space-x-2">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All Workouts
          </Button>
          <Button variant={filter === "upcoming" ? "default" : "outline"} onClick={() => setFilter("upcoming")}>
            Upcoming
          </Button>
          <Button variant={filter === "completed" ? "default" : "outline"} onClick={() => setFilter("completed")}>
            Completed
          </Button>
        </div>
      </div>

      {workouts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No workouts found</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {filter === "upcoming"
                ? "You don't have any upcoming workouts scheduled."
                : filter === "completed"
                  ? "You haven't completed any workouts yet."
                  : "No workouts available. Contact your coach to get started!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {workouts.map((workout) => (
            <Card key={workout.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {workout.workout_type === "gym" ? (
                        <Dumbbell className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                      {workout.name}
                    </CardTitle>
                    <CardDescription>Program: {workout.program?.name}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={workout.completed ? "default" : "secondary"}>
                      {workout.completed ? "Completed" : "Pending"}
                    </Badge>
                    <Badge variant="outline">{workout.workout_type === "gym" ? "Gym" : "Cardio"}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {workout.scheduled_date ? new Date(workout.scheduled_date).toLocaleDateString() : "No date set"}
                    </div>
                    {workout.duration_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {workout.duration_minutes} minutes
                      </div>
                    )}
                  </div>

                  {workout.notes && <p className="text-sm text-gray-600 dark:text-gray-300">{workout.notes}</p>}

                  {workout.workout_type === "cardio" && (
                    <div className="flex gap-4 text-sm">
                      {workout.intensity_type && (
                        <span className="text-gray-600 dark:text-gray-300">Intensity: {workout.intensity_type}</span>
                      )}
                      {workout.target_tss && (
                        <span className="text-gray-600 dark:text-gray-300">Target TSS: {workout.target_tss}</span>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button asChild>
                      <Link href={`/dashboard/workouts/${workout.id}`}>
                        <Play className="h-4 w-4 mr-2" />
                        {workout.completed ? "View Details" : "Start Workout"}
                      </Link>
                    </Button>
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
