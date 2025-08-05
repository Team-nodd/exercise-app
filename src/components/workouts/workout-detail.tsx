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
import { CheckCircle, Circle, Clock, Dumbbell, Target, Weight, Timer, Save, AlertCircle, ArrowLeft } from "lucide-react"
import type { WorkoutWithDetails, WorkoutExerciseWithDetails } from "@/types"
import { notificationService } from "@/lib/notifications/notification-service"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import { H1, H5, P } from '../ui/heading';

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
  const [workoutComments, setWorkoutComments] = useState<any[]>([])
  const [exerciseComments, setExerciseComments] = useState<Record<string, any[]>>({})
  const [newWorkoutComment, setNewWorkoutComment] = useState("")
  const [newExerciseComments, setNewExerciseComments] = useState<Record<string, string>>({})
  const [commentLoading, setCommentLoading] = useState(false)

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

  // Fetch comments for workout and exercises
  const fetchComments = useCallback(async (exercisesList?: WorkoutExerciseWithDetails[]) => {
    try {
      // Fetch workout comments
      const { data: workoutCommentsData, error: workoutCommentsError } = await supabase
        .from("comments")
        .select("*, user:users(name)")
        .eq("workout_id", workoutId)
        .is("workout_exercise_id", null)
        .order("created_at", { ascending: true })
      if (workoutCommentsError) {
        console.error("Error fetching workout comments:", workoutCommentsError)
        toast("Failed to load workout comments")
      } else {
        setWorkoutComments(workoutCommentsData || [])
      }
      // Fetch exercise comments (for gym)
      if (exercisesList && exercisesList.length > 0) {
        const exerciseIds = exercisesList.map((ex) => ex.id)
        const { data: exerciseCommentsData, error: exerciseCommentsError } = await supabase
          .from("comments")
          .select("*, user:users(name)")
          .in("workout_exercise_id", exerciseIds)
          .order("created_at", { ascending: true })
        if (exerciseCommentsError) {
          console.error("Error fetching exercise comments:", exerciseCommentsError)
          toast("Failed to load exercise comments")
        } else {
          // Group by exerciseId
          const grouped: Record<string, any[]> = {}
          for (const c of exerciseCommentsData || []) {
            const exId = c.workout_exercise_id
            if (!grouped[exId]) grouped[exId] = []
            grouped[exId].push(c)
          }
          setExerciseComments(grouped)
        }
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
      toast("Failed to load comments")
    }
  }, [supabase, workoutId, toast])

  // Fetch comments after loading workout/exercises
  useEffect(() => {
    if (workout) {
      if (workout.workout_type === "gym" && exercises.length > 0) {
        fetchComments(exercises)
      } else {
        fetchComments()
      }
    }
  }, [workout, exercises, fetchComments])

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

      // Check if all exercises are completed
      const updatedExercises = exercises.map((ex) =>
        Number(ex.id) === Number(exerciseId) ? { ...ex, completed } : ex
      )
      
      const allCompleted = updatedExercises.every((ex) => ex.completed)
      
      // If all exercises are completed, mark workout as completed and send notifications
      if (allCompleted && !workout?.completed) {
        await markWorkoutAsCompleted()
      }

      toast(completed ? "Exercise marked as complete" : "Exercise marked as incomplete")
    } catch (error) {
      console.error("Error toggling completion:", error)
      toast("Failed to update completion status")
    }
  }

  const toggleCardioWorkoutCompletion = async (completed: boolean) => {
    try {
      const { error } = await supabase
        .from("workouts")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", workoutId)

      if (error) {
        console.error("Error updating cardio workout completion:", error)
        toast("Failed to update completion status")
        return
      }

      // Update local state
      setWorkout((prev) =>
        prev ? {
          ...prev,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        } : null
      )

      // If marking as completed, send notifications
      if (completed) {
        await markWorkoutAsCompleted()
      }

      toast(completed ? "Cardio workout marked as complete" : "Cardio workout marked as incomplete")
    } catch (error) {
      console.error("Error toggling cardio workout completion:", error)
      toast("Failed to update completion status")
    }
  }

  const markWorkoutAsCompleted = async () => {
    try {
      console.log("🔄 WORKOUT: Marking workout as completed and sending notifications...")
      
      // Mark workout as completed
      const { error: workoutError } = await supabase
        .from("workouts")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", workoutId)

      if (workoutError) {
        console.error("Error marking workout as completed:", workoutError)
        toast("Failed to mark workout as completed")
        return
      }

      // Update local workout state
      setWorkout((prev) => prev ? { ...prev, completed: true, completed_at: new Date().toISOString() } : null)

      // Send notifications
      await notificationService.sendWorkoutCompletedNotifications(Number(workoutId))

      toast("Workout completed! Notifications sent.")
    } catch (error) {
      console.error("Error marking workout as completed:", error)
      toast("Failed to mark workout as completed")
    }
  }

  const manualSave = () => {
    saveUpdates()
  }

  // Add new workout comment
  const handleAddWorkoutComment = async () => {
    if (!newWorkoutComment.trim()) return
    setCommentLoading(true)
    try {
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null
      if (!user) {
        toast("You must be logged in to comment.")
        setCommentLoading(false)
        return
      }
      const { error } = await supabase.from("comments").insert({
        user_id: user.id,
        workout_id: Number(workoutId),
        comment_text: newWorkoutComment.trim(),
      })
      if (error) {
        toast("Failed to add comment")
      } else {
        setNewWorkoutComment("")
        fetchComments(exercises)
      }
    } catch (error) {
      toast("Failed to add comment")
    }
    setCommentLoading(false)
  }

  // Add new exercise comment
  const handleAddExerciseComment = async (exerciseId: number) => {
    const text = newExerciseComments[exerciseId] || ""
    if (!text.trim()) return
    setCommentLoading(true)
    try {
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null
      if (!user) {
        toast("You must be logged in to comment.")
        setCommentLoading(false)
        return
      }
      const { error } = await supabase.from("comments").insert({
        user_id: user.id,
        workout_id: Number(workoutId),
        workout_exercise_id: exerciseId,
        comment_text: text.trim(),
      })
      if (error) {
        toast("Failed to add comment")
      } else {
        setNewExerciseComments((prev) => ({ ...prev, [exerciseId]: "" }))
        fetchComments(exercises)
      }
    } catch (error) {
      toast("Failed to add comment")
    }
    setCommentLoading(false)
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
          <H1 >Workout Not Found</H1>
          <P>The workout youre looking for doesnt exist.</P>
        </div>
      </div>
    )
  }

  const completedExercises = exercises.filter((ex) => ex.completed).length
  const totalExercises = exercises.length
  const progressPercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Unsaved Changes Banner */}
        <Link
          href={`/dashboard/programs/${workout.program.id}`}
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4 border-none outline-none"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Programs
        </Link>
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

      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <H1 className="">{workout.name}</H1>
            <P className="text-gray-600 dark:text-gray-300 mt-2">
              {workout.program?.name} • {workout.workout_type === "gym" ? "Gym Workout" : "Cardio Workout"}
            </P>
            <Badge className="sm:hidden" variant={workout.completed ? "default" : "secondary"}>
            {workout.completed ? "Completed" : "Pending"}
          </Badge>
          </div>
          <Badge className="hidden sm:block" variant={workout.completed ? "default" : "secondary"}>
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

      {/* Workout Comments Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Workout Comments</h2>
        <div className="space-y-2 mb-2">
          {workoutComments.length === 0 && <div className="text-gray-500 text-sm">No comments yet.</div>}
          {workoutComments.map((c) => (
            <div key={c.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="font-medium">{c.user?.name || "User"}</span>: {c.comment_text}
              <span className="ml-2 text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2 flex-col sm:flex-row">
          <Textarea
            value={newWorkoutComment}
            onChange={(e) => setNewWorkoutComment(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="flex-1"
            disabled={commentLoading}
          />
          <Button onClick={handleAddWorkoutComment} disabled={commentLoading || !newWorkoutComment.trim()}>Post</Button>
        </div>
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
              <Card key={exercise.id} className={exercise.completed ? "bg-green-50 dark:bg-green-900/20 p-3" : "p-3"}>
                <CardHeader className="p-2 pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-full flex items-center justify-between gap-10">
                      <button
                        onClick={() => toggleExerciseCompletion(String(exercise.id), !exercise.completed)}
                        className="flex-shrink-0"
                        aria-label={exercise.completed ? "Mark as incomplete" : "Mark as complete"}
                      >
                        {exercise.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400 hover:text-green-600" />
                        )}
                      </button>
                      <span className="font-medium text-base sm:text-lg w-full">
                        {index + 1}. {exercise.exercise.name}
                      </span>
                      {exercise.completed && (
                        <Badge variant="secondary" className="hidden sm:block text-xs px-2 py-0.5 ml-1">Completed</Badge>
                      )}
                    </div>
                    
                  </div>
                  {exercise.exercise.category && (
                    <CardDescription className="mt-0.5 text-xs text-muted-foreground">{exercise.exercise.category}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-2 pb-2 px-2">
                  <div className="gap-2 mb-2">
                    <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor={`sets-${exercise.id}`} className="flex items-center gap-1 ">
                          <Target className="h-3 w-3" /> Sets
                        </Label>
                        <Input
                          id={`sets-${exercise.id}`}
                          type="number"
                          value={exercise.sets || ""}
                          onChange={(e) => updateExerciseField(String(exercise.id), "sets", Number.parseInt(e.target.value) || 0)}
                          min="0"
                          className="h-7 sm:h-9 px-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`reps-${exercise.id}`} className="flex items-center gap-1 ">
                          <Target className="h-3 w-3" /> Reps
                        </Label>
                        <Input
                          id={`reps-${exercise.id}`}
                          type="number"
                          value={exercise.reps || ""}
                          onChange={(e) => updateExerciseField(String(exercise.id), "reps", Number.parseInt(e.target.value) || 0)}
                          min="0"
                          className="h-7 sm:h-9 px-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`weight-${exercise.id}`} className="flex items-center gap-1 ">
                          <Weight className="h-3 w-3" /> Weight
                        </Label>
                        <Input
                          id={`weight-${exercise.id}`}
                          value={exercise.weight || ""}
                          onChange={(e) => updateExerciseField(String(exercise.id), "weight", e.target.value)}
                          placeholder="e.g., 80kg, BW"
                          className="h-7 sm:h-9 px-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`rest-${exercise.id}`} className="flex items-center gap-1 ">
                          <Timer className="h-3 w-3" /> Rest (sec)
                        </Label>
                        <Input
                          id={`rest-${exercise.id}`}
                          type="number"
                          value={exercise.rest_seconds || ""}
                          onChange={(e) => updateExerciseField(String(exercise.id), "rest_seconds", Number.parseInt(e.target.value) || 0)}
                          min="0"
                          className="h-7 sm:h-9  px-2"
                        />
                      </div>
                    </div>

                  </div>
                  {exercise.exercise.instructions && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md ">
                      <strong>Instructions:</strong> {exercise.exercise.instructions}
                    </div>
                  )}
                  {exercise.completed && (
                    <div className="mt-2 text-green-600 dark:text-green-400">Exercise completed</div>
                  )}
                  {/* Exercise Comments Section */}
                  <div className="mt-2">
                    <H5 className="font-medium mb-1 ">Exercise Comments</H5>
                    <div className="space-y-1 mb-1">
                      {(exerciseComments[exercise.id] || []).length === 0 && (
                        <div className="text-gray-400 text-xs">No comments yet.</div>
                      )}
                      {(exerciseComments[exercise.id] || []).map((c) => (
                        <div key={c.id} className="p-1 bg-gray-50 dark:bg-gray-800 rounded ">
                          <span className="font-medium">{c.user?.name || "User"}</span>: {c.comment_text}
                          <span className="ml-2  text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 mt-1">
                      <Textarea
                        value={newExerciseComments[exercise.id] || ""}
                        onChange={(e) => setNewExerciseComments((prev) => ({ ...prev, [exercise.id]: e.target.value }))}
                        placeholder="Add a comment..."
                        rows={1}
                        className="flex-1 "
                        disabled={commentLoading}
                      />
                      <Button size="sm" onClick={() => handleAddExerciseComment(exercise.id)} disabled={commentLoading || !(newExerciseComments[exercise.id] || "").trim()}>Post</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        // Cardio workout display
        <Card className={workout.completed ? "bg-green-50 dark:bg-green-900/20" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cardio Workout Details</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => toggleCardioWorkoutCompletion(!workout.completed)}
                  variant={workout.completed ? "outline" : "default"}
                  size="sm"
                >
                  {workout.completed ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completed
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 w-full">
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
            {workout.completed && (
              <div className="mt-4 text-xs text-green-600 dark:text-green-400">
                Cardio workout completed
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
