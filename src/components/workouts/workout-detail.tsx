/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CheckCircle, Circle, Clock, Dumbbell, Target, Weight, Timer, Save, AlertCircle } from "lucide-react"
import type { WorkoutWithDetails, WorkoutExerciseWithDetails } from "@/types"

interface WorkoutDetailProps {
  workoutId: string
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function WorkoutDetail({ workoutId }: WorkoutDetailProps) {
  const [workout, setWorkout] = useState<WorkoutWithDetails | null>(null)
  const [exercises, setExercises] = useState<WorkoutExerciseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({})
  const [hasPendingChanges, setHasPendingChanges] = useState(false)


  const supabase = createClient()

  // Debounce pending updates
  const debouncedUpdates = useDebounce(pendingUpdates, 1000)

  const fetchWorkoutData = useCallback(async () => {
    try {
      // Fetch workout details
      const { data: workoutData, error: workoutError } = await supabase
        .from("workouts")
        .select(`
          *,
          program:programs(*)
        `)
        .eq("id", workoutId)
        .single()

      if (workoutError) {
        console.error("Error fetching workout:", workoutError)
        toast( "Failed to load workout details")
        return
      }

      setWorkout(workoutData as WorkoutWithDetails)

      // Fetch workout exercises if it's a gym workout
      if (workoutData.workout_type === "gym") {
        const { data: exercisesData, error: exercisesError } = await supabase
          .from("workout_exercises")
          .select(`
            *,
            exercise:exercises(*)
          `)
          .eq("workout_id", workoutId)
          .order("order_in_workout", { ascending: true })

        if (exercisesError) {
          console.error("Error fetching exercises:", exercisesError)
          toast( "Failed to load workout exercises")
          return
        }

        setExercises(exercisesData as WorkoutExerciseWithDetails[])
      }
    } catch (error) {
      console.error("Error fetching workout data:", error)
      toast( "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [workoutId, supabase, toast])

  useEffect(() => {
    fetchWorkoutData()
  }, [fetchWorkoutData])

  // Auto-save when debounced updates change
  useEffect(() => {
    if (Object.keys(debouncedUpdates).length > 0) {
      saveUpdates()
    }
  }, [debouncedUpdates])

  const saveUpdates = async () => {
    if (Object.keys(pendingUpdates).length === 0) return

    setSaving(true)
    try {
      const updates = Object.entries(pendingUpdates).map(([exerciseId, changes]) => ({
        id: exerciseId,
        ...changes,
      }))

      for (const update of updates) {
        const { id, ...updateData } = update
        const { error } = await supabase.from("workout_exercises").update(updateData).eq("id", id)

        if (error) {
          console.error("Error updating exercise:", error)
          toast( "Failed to save changes")
          return
        }
      }

      setPendingUpdates({})
      setHasPendingChanges(false)
      toast("Changes saved successfully")
    } catch (error) {
      console.error("Error saving updates:", error)
      toast( "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const updateExerciseField = (exerciseId: string, field: string, value: any) => {
    // Update local state immediately for responsive UI
    setExercises((prev) => prev.map((ex) => (Number(ex.id) === Number(exerciseId) ? { ...ex, [field]: value } : ex)))

    // Add to pending updates
    setPendingUpdates((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [field]: value,
      },
    }))
    setHasPendingChanges(true)
  }

  const toggleExerciseCompletion = async (exerciseId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("workout_exercises")
        .update({
          completed,
          // Remove completed_at since it doesn't exist in the schema
        })
        .eq("id", exerciseId)

      if (error) {
        console.error("Error updating completion:", error)
        toast("Failed to update completion status")
        return
      }

      // Update local state
      setExercises((prev) =>
        prev.map((ex) =>
          Number(ex.id) === Number(exerciseId)
            ? {
                ...ex,
                completed,
                // Remove completed_at from local state update
              }
            : ex,
        ),
      )

      toast(completed ? "Exercise marked as complete" : "Exercise marked as incomplete")
    } catch (error) {
      console.error("Error toggling completion:", error)
      toast("Failed to update completion status")
    }
  }

  const manualSave = () => {
    saveUpdates()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading workout details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Workout Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300">The workout youre looking for doesnt exist.</p>
        </div>
      </div>
    )
  }

  const completedExercises = exercises.filter((ex) => ex.completed).length
  const totalExercises = exercises.length
  const progressPercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Unsaved Changes Banner */}
      {hasPendingChanges && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-800 dark:text-yellow-200">
                You have unsaved changes. They will be saved automatically in a moment.
              </span>
            </div>
            <Button onClick={manualSave} disabled={saving} size="sm" variant="outline">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Now
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{workout.name}</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              {workout.program?.name} • {workout.workout_type === "gym" ? "Gym Workout" : "Cardio Workout"}
            </p>
          </div>
          <Badge variant={workout.completed ? "default" : "secondary"}>
            {workout.completed ? "Completed" : "Pending"}
          </Badge>
        </div>

        {workout.scheduled_date && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
            <Clock className="h-4 w-4" />
            Scheduled for {new Date(workout.scheduled_date).toLocaleDateString()}
          </div>
        )}

        {workout.workout_type === "gym" && totalExercises > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {completedExercises} of {totalExercises} exercises completed
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {workout.workout_type === "gym" ? (
        <div className="space-y-6">
          {exercises.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No exercises yet</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  This workout does not have any exercises assigned yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            exercises.map((exercise, index) => (
              <Card key={exercise.id} className={exercise.completed ? "bg-green-50 dark:bg-green-900/20" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExerciseCompletion(String(exercise.id), !exercise.completed)}
                        className="flex-shrink-0"
                      >
                        {exercise.completed ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-400 hover:text-green-600" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span>
                            {index + 1}. {exercise.exercise.name}
                          </span>
                          {exercise.completed && (
                            <Badge variant="secondary" className="text-xs">
                              Completed
                            </Badge>
                          )}
                        </div>
                        {exercise.exercise.category && (
                          <CardDescription className="mt-1">{exercise.exercise.category}</CardDescription>
                        )}
                      </div>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor={`sets-${exercise.id}`} className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Sets
                      </Label>
                      <Input
                        id={`sets-${exercise.id}`}
                        type="number"
                        value={exercise.sets || ""}
                        onChange={(e) => updateExerciseField(String(exercise.id), "sets", Number.parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`reps-${exercise.id}`} className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Reps
                      </Label>
                      <Input
                        id={`reps-${exercise.id}`}
                        type="number"
                        value={exercise.reps || ""}
                        onChange={(e) => updateExerciseField(String(exercise.id), "reps", Number.parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`weight-${exercise.id}`} className="flex items-center gap-2">
                        <Weight className="h-4 w-4" />
                        Weight
                      </Label>
                      <Input
                        id={`weight-${exercise.id}`}
                        value={exercise.weight || ""}
                        onChange={(e) => updateExerciseField(String(exercise.id), "weight", e.target.value)}
                        placeholder="e.g., 80kg, BW"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`rest-${exercise.id}`} className="flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        Rest (sec)
                      </Label>
                      <Input
                        id={`rest-${exercise.id}`}
                        type="number"
                        value={exercise.rest_seconds || ""}
                        onChange={(e) =>
                          updateExerciseField(String(exercise.id), "rest_seconds", Number.parseInt(e.target.value) || 0)
                        }
                        min="0"
                      />
                    </div>
                  </div>

                  {exercise.exercise.instructions && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <h4 className="font-medium mb-2">Instructions:</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{exercise.exercise.instructions}</p>
                    </div>
                  )}

                  {exercise.completed && (
                    <div className="mt-4 text-xs text-green-600 dark:text-green-400">
                      Exercise completed
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        // Cardio workout display
        <Card>
          <CardHeader>
            <CardTitle>Cardio Workout Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {workout.duration_minutes && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Timer className="h-4 w-4" />
                    Duration
                  </Label>
                  <p className="text-lg font-semibold">{workout.duration_minutes} minutes</p>
                </div>
              )}
              {workout.intensity_type && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4" />
                    Intensity
                  </Label>
                  <Badge variant="outline" className="text-sm">
                    {workout.intensity_type}
                  </Badge>
                </div>
              )}
              {workout.target_tss && (
                <div>
                  <Label className="mb-2">Training Stress Score (TSS)</Label>
                  <p className="text-lg font-semibold">{workout.target_tss}</p>
                </div>
              )}
              {workout.target_ftp && (
                <div>
                  <Label className="mb-2">Functional Threshold Power (FTP)</Label>
                  <p className="text-lg font-semibold">{workout.target_ftp}W</p>
                </div>
              )}
            </div>
            {workout.notes && (
              <div className="mt-6">
                <Label className="mb-2">Notes</Label>
                <p className="text-gray-600 dark:text-gray-300">{workout.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
