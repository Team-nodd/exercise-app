"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Plus, Dumbbell, Clock, ArrowLeft, Copy, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import type { ProgramWithDetails, WorkoutWithDetails } from "@/types"

interface ProgramDetailProps {
  program: ProgramWithDetails
}

export function ProgramDetail({ program }: ProgramDetailProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [duplicatingWorkout, setDuplicatingWorkout] = useState<number | null>(null)
  const supabase = createClient()
  // const { toast } = useToast()

  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        const { data, error } = await supabase
          .from("workouts")
          .select(`
            *,
            program:programs(*)
          `)
          .eq("program_id", program.id)
          .order("order_in_program", { ascending: true })

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
  }, [program.id, supabase])

  const duplicateWorkout = async (workoutId: number) => {
    setDuplicatingWorkout(workoutId)

    try {
      console.log("🔄 Starting workout duplication for workout:", workoutId)

      // Get the original workout with its exercises
      const { data: originalWorkout, error: workoutError } = await supabase
        .from("workouts")
        .select(`
          *,
          workout_exercises(*)
        `)
        .eq("id", workoutId)
        .single()

      if (workoutError) {
        console.error("❌ Error fetching original workout:", workoutError)
        toast( "Failed to fetch workout data")
        return
      }

      console.log("✅ Original workout fetched:", originalWorkout)

      // Create the duplicate workout
      const duplicateWorkoutData = {
        program_id: originalWorkout.program_id,
        user_id: originalWorkout.user_id,
        name: `${originalWorkout.name} (Copy)`,
        workout_type: originalWorkout.workout_type,
        scheduled_date: null, // Don't copy the scheduled date
        notes: originalWorkout.notes,
        intensity_type: originalWorkout.intensity_type,
        duration_minutes: originalWorkout.duration_minutes,
        target_tss: originalWorkout.target_tss,
        target_ftp: originalWorkout.target_ftp,
        completed: false, // New workout should not be completed
        completed_at: null,
        order_in_program: workouts.length + 1, // Add to the end
      }

      const { data: newWorkout, error: createError } = await supabase
        .from("workouts")
        .insert(duplicateWorkoutData)
        .select()
        .single()

      if (createError) {
        console.error("❌ Error creating duplicate workout:", createError)
        toast("Failed to create duplicate workout")
        return
      }

      console.log("✅ Duplicate workout created:", newWorkout)

      // If it's a gym workout, duplicate the exercises
      if (originalWorkout.workout_type === "gym" && originalWorkout.workout_exercises?.length > 0) {
        console.log("🔄 Duplicating workout exercises...")

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const duplicateExercises = originalWorkout.workout_exercises.map((exercise: any) => ({
          workout_id: newWorkout.id,
          exercise_id: exercise.exercise_id,
          order_in_workout: exercise.order_in_workout,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          rest_seconds: exercise.rest_seconds,
          volume_level: exercise.volume_level,
          completed: false, // New exercises should not be completed
          completed_at: null,
        }))

        const { error: exercisesError } = await supabase.from("workout_exercises").insert(duplicateExercises)

        if (exercisesError) {
          console.error("❌ Error duplicating workout exercises:", exercisesError)
          toast("Workout duplicated but failed to copy exercises")
        } else {
          console.log("✅ Workout exercises duplicated successfully")
        }
      }

      // Refresh the workouts list
      const { data: updatedWorkouts, error: refreshError } = await supabase
        .from("workouts")
        .select(`
          *,
          program:programs(*)
        `)
        .eq("program_id", program.id)
        .order("order_in_program", { ascending: true })

      if (!refreshError) {
        setWorkouts(updatedWorkouts as WorkoutWithDetails[])
      }

      toast( "Workout duplicated successfully!")

      console.log("✅ Workout duplication completed successfully")
    } catch (error) {
      console.error("❌ Unexpected error during workout duplication:", error)
      toast("An unexpected error occurred")
    } finally {
      setDuplicatingWorkout(null)
    }
  }

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/coach/programs"
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Programs
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{program.name}</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">{program.description}</p>
          </div>
          <Badge className={getStatusColor(program.status)}>
            {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Program Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Program Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{program.user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {program.start_date ? new Date(program.start_date).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">
                  {program.end_date ? new Date(program.end_date).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workouts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Workouts</CardTitle>
              <CardDescription>Manage the workouts in this program</CardDescription>
            </div>
            <Button asChild>
              <Link href={`/coach/programs/${program.id}/workouts/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Workout
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading workouts...</div>
          ) : workouts.length === 0 ? (
            <div className="text-center py-8">
              <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No workouts yet</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Start building this program by adding workouts.</p>
              <Button asChild>
                <Link href={`/coach/programs/${program.id}/workouts/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Workout
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {workouts.map((workout, index) => (
                <div key={workout.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{workout.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {workout.workout_type === "gym" ? (
                            <Dumbbell className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {workout.workout_type === "gym" ? "Gym Workout" : "Cardio Session"}
                        </span>
                        {workout.scheduled_date && <span>{new Date(workout.scheduled_date).toLocaleDateString()}</span>}
                        {workout.duration_minutes && <span>{workout.duration_minutes} min</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={workout.completed ? "default" : "secondary"}>
                      {workout.completed ? "Completed" : "Pending"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateWorkout(workout.id)}
                      disabled={duplicatingWorkout === workout.id}
                    >
                      {duplicatingWorkout === workout.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {duplicatingWorkout === workout.id ? "Duplicating..." : "Duplicate"}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/coach/programs/${program.id}/workouts/${workout.id}`}>Edit</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
