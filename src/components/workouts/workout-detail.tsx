"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Calendar, Clock, Dumbbell, CheckCircle, Timer, Save } from "lucide-react"
import type { WorkoutWithDetails, WorkoutExerciseWithDetails } from "@/types"

interface WorkoutDetailProps {
  workoutId: string
  userId: string
}

// Debounce hook
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

export function WorkoutDetail({ workoutId, userId }: WorkoutDetailProps) {
  const [workout, setWorkout] = useState<WorkoutWithDetails | null>(null)
  const [exercises, setExercises] = useState<WorkoutExerciseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<Record<number, Partial<WorkoutExerciseWithDetails>>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const supabase = createClient()
  // const { toast } = useToast()

  // Debounce pending updates
  const debouncedUpdates = useDebounce(pendingUpdates, 1000)

  useEffect(() => {
    const fetchWorkoutDetails = async () => {
      try {
        // Fetch workout details
        const { data: workoutData, error: workoutError } = await supabase
          .from("workouts")
          .select(`
            *,
            program:programs(*)
          `)
          .eq("id", workoutId)
          .eq("user_id", userId)
          .single()

        if (workoutError) {
          console.error("Error fetching workout:", workoutError)
          return
        }

        setWorkout(workoutData as WorkoutWithDetails)

        // Fetch workout exercises
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
          return
        }

        setExercises(exercisesData as WorkoutExerciseWithDetails[])
      } catch (error) {
        console.error("Error fetching workout details:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkoutDetails()
  }, [workoutId, userId, supabase])

  // Process debounced updates
  useEffect(() => {
    const processUpdates = async () => {
      if (Object.keys(debouncedUpdates).length === 0) return

      setUpdating(true)
      try {
        const updatePromises = Object.entries(debouncedUpdates).map(([exerciseId, updates]) =>
          supabase.from("workout_exercises").update(updates).eq("id", Number.parseInt(exerciseId)),
        )

        const results = await Promise.all(updatePromises)
        const hasErrors = results.some((result) => result.error)

        if (hasErrors) {
          toast("Some updates failed to save")
        } else {
          toast("Changes saved automatically")
          setHasUnsavedChanges(false)
        }

        // Clear pending updates
        setPendingUpdates({})
      } catch (error) {
        toast("Failed to save changes")
      } finally {
        setUpdating(false)
      }
    }

    processUpdates()
  }, [debouncedUpdates, supabase, toast])

  const updateExerciseLocally = useCallback((exerciseId: number, updates: Partial<WorkoutExerciseWithDetails>) => {
    // Update local state immediately for responsive UI
    setExercises((prev) => prev.map((ex) => (ex.id === exerciseId ? { ...ex, ...updates } : ex)))

    // Add to pending updates
    setPendingUpdates((prev) => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], ...updates },
    }))

    setHasUnsavedChanges(true)
  }, [])

  const updateExerciseCompleted = async (exerciseId: number, completed: boolean) => {
    setUpdating(true)
    try {
      const { error } = await supabase.from("workout_exercises").update({ completed }).eq("id", exerciseId)

      if (error) {
        toast("Failed to update exercise")
        return
      }

      // Update local state
      setExercises((prev) => prev.map((ex) => (ex.id === exerciseId ? { ...ex, completed } : ex)))

      toast(completed ? "Exercise marked as complete" : "Exercise marked as incomplete")
    } catch (error) {
      toast("An unexpected error occurred")
      setUpdating(false)
    }
  }

  const saveAllChanges = async () => {
    if (Object.keys(pendingUpdates).length === 0) return

    setUpdating(true)
    try {
      const updatePromises = Object.entries(pendingUpdates).map(([exerciseId, updates]) =>
        supabase.from("workout_exercises").update(updates).eq("id", Number.parseInt(exerciseId)),
      )

      const results = await Promise.all(updatePromises)
      const hasErrors = results.some((result) => result.error)

      if (hasErrors) {
        toast( "Some updates failed to save")
      } else {
        toast( "All changes saved successfully")
        setHasUnsavedChanges(false)
        setPendingUpdates({})
      }
    } catch (error) {
      toast("Failed to save changes")
    } finally {
      setUpdating(false)
    }
  }

  const completeWorkout = async () => {
    if (!workout) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from("workouts")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", workoutId)

      if (error) {
        toast("Failed to complete workout")
        return
      }

      setWorkout((prev) => (prev ? { ...prev, completed: true, completed_at: new Date().toISOString() } : null))

      toast("Workout completed successfully!")
    } catch (error) {
      toast("An unexpected error occurred")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading workout...</div>
  }

  if (!workout) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Workout not found</h3>
            <p className="text-gray-600 dark:text-gray-300">
              The requested workout could not be found or you dont have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Save Changes Banner */}
      {hasUnsavedChanges && (
        <Card className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-800 dark:text-yellow-200">You have unsaved changes</span>
            </div>
            <Button onClick={saveAllChanges} disabled={updating} size="sm" variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Workout Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {workout.workout_type === "gym" ? <Dumbbell className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                {workout.name}
              </CardTitle>
              <CardDescription className="text-lg mt-2">Program: {workout.program?.name}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={workout.completed ? "default" : "secondary"} className="text-sm">
                {workout.completed ? "Completed" : "In Progress"}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {workout.workout_type === "gym" ? "Gym Workout" : "Cardio Session"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Calendar className="h-4 w-4" />
              <span>
                {workout.scheduled_date ? new Date(workout.scheduled_date).toLocaleDateString() : "No date set"}
              </span>
            </div>
            {workout.duration_minutes && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Timer className="h-4 w-4" />
                <span>{workout.duration_minutes} minutes</span>
              </div>
            )}
          </div>

          {workout.notes && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Notes:</h4>
              <p className="text-gray-600 dark:text-gray-300">{workout.notes}</p>
            </div>
          )}

          {workout.workout_type === "cardio" && (
            <div className="mt-4 grid md:grid-cols-3 gap-4">
              {workout.intensity_type && (
                <div>
                  <span className="font-semibold">Intensity: </span>
                  <span className="text-gray-600 dark:text-gray-300">{workout.intensity_type}</span>
                </div>
              )}
              {workout.target_tss && (
                <div>
                  <span className="font-semibold">Target TSS: </span>
                  <span className="text-gray-600 dark:text-gray-300">{workout.target_tss}</span>
                </div>
              )}
              {workout.target_ftp && (
                <div>
                  <span className="font-semibold">Target FTP: </span>
                  <span className="text-gray-600 dark:text-gray-300">{workout.target_ftp}W</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercises */}
      {workout.workout_type === "gym" && exercises.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Exercises</h2>
          {exercises.map((exercise, index) => (
            <Card key={exercise.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
                      {index + 1}
                    </span>
                    {exercise.exercise.name}
                  </CardTitle>
                  <Checkbox
                    checked={exercise.completed}
                    onCheckedChange={(checked) => updateExerciseCompleted(exercise.id, checked as boolean)}
                    disabled={updating}
                  />
                </div>
                <CardDescription>
                  {exercise.exercise.category} • {exercise.exercise.equipment}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Prescribed */}
                  <div>
                    <h4 className="font-semibold mb-3">Prescribed</h4>
                    <div className="space-y-2 text-sm">
                      <div>Sets: {exercise.sets}</div>
                      <div>Reps: {exercise.reps}</div>
                      <div>Weight: {exercise.weight || "N/A"}</div>
                      <div>Rest: {exercise.rest_seconds}s</div>
                      <div>Volume: {exercise.volume_level}</div>
                    </div>
                  </div>

                  {/* Actual */}
                  <div>
                    <h4 className="font-semibold mb-3">Actual Performance</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-300">Sets</label>
                          <Input
                            type="number"
                            value={exercise.actual_sets || ""}
                            onChange={(e) =>
                              updateExerciseLocally(exercise.id, {
                                actual_sets: e.target.value ? Number.parseInt(e.target.value) : null,
                              })
                            }
                            placeholder={exercise.sets.toString()}
                            disabled={updating}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-300">Reps</label>
                          <Input
                            type="number"
                            value={exercise.actual_reps || ""}
                            onChange={(e) =>
                              updateExerciseLocally(exercise.id, {
                                actual_reps: e.target.value ? Number.parseInt(e.target.value) : null,
                              })
                            }
                            placeholder={exercise.reps.toString()}
                            disabled={updating}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-300">Weight</label>
                        <Input
                          value={exercise.actual_weight || ""}
                          onChange={(e) => updateExerciseLocally(exercise.id, { actual_weight: e.target.value })}
                          placeholder={exercise.weight || "Enter weight"}
                          disabled={updating}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-300">Notes</label>
                        <Textarea
                          value={exercise.notes || ""}
                          onChange={(e) => updateExerciseLocally(exercise.id, { notes: e.target.value })}
                          placeholder="Add notes about this exercise..."
                          disabled={updating}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {exercise.exercise.instructions && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h5 className="font-semibold mb-2">Instructions:</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{exercise.exercise.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Complete Workout Button */}
      {!workout.completed && (
        <div className="mt-8 text-center">
          <Button onClick={completeWorkout} disabled={updating} size="lg" className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-5 w-5 mr-2" />
            Complete Workout
          </Button>
        </div>
      )}

      {workout.completed && workout.completed_at && (
        <Card className="mt-8 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">Workout Completed!</h3>
            <p className="text-green-600 dark:text-green-300">
              Completed on {new Date(workout.completed_at).toLocaleDateString()} at{" "}
              {new Date(workout.completed_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
