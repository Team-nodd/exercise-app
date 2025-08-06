/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { CheckCircle, Circle, Dumbbell, Target, Weight, Timer, Save, AlertCircle, ArrowLeft, MessageSquare, Send, User, Calendar, Zap, TrendingUp, Activity, ChevronDown } from 'lucide-react'
import type { WorkoutWithDetails, WorkoutExerciseWithDetails } from "@/types"
import { notificationService } from "@/lib/notifications/notification-service"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

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
  const [newWorkoutComment, setNewWorkoutComment] = useState("")
  const [commentLoading, setCommentLoading] = useState(false)
  
  // State for exercise expansion and editing
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({})
  const [editingExercises, setEditingExercises] = useState<Record<string, boolean>>({})
  const [editValues, setEditValues] = useState<Record<string, {
    sets: number
    reps: number
    weight: string
    rest_seconds: number
  }>>({})

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
        toast("Failed to load workout details")
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
          toast("Failed to load workout exercises")
          return
        }

        const exercisesList = exercisesData as WorkoutExerciseWithDetails[]
        setExercises(exercisesList)
        
        // Initialize edit values for all exercises
        const initialEditValues: Record<string, any> = {}
        exercisesList.forEach(exercise => {
          initialEditValues[exercise.id] = {
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight || "",
            rest_seconds: exercise.rest_seconds
          }
        })
        setEditValues(initialEditValues)
      }
    } catch (error) {
      console.error("Error fetching workout data:", error)
      toast("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [workoutId, supabase])

  // Fetch comments for workout and exercises
  const fetchComments = useCallback(
    async (exercisesList?: WorkoutExerciseWithDetails[]) => {
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
      } catch (error) {
        console.error("Error fetching comments:", error)
        toast("Failed to load comments")
      }
    },
    [supabase, workoutId],
  )

  // Fetch comments after loading workout/exercises
  useEffect(() => {
    if (workout) {
      if (workout.workout_type === "gym" && exercises.length > 0) {
        fetchComments()
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
          toast("Failed to save changes")
          return
        }
      }

      setPendingUpdates({})
      setHasPendingChanges(false)
      toast("Changes saved successfully")
    } catch (error) {
      console.error("Error saving updates:", error)
      toast("Failed to save changes")
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
              }
            : ex,
        ),
      )

      // Check if all exercises are completed
      const updatedExercises = exercises.map((ex) => (Number(ex.id) === Number(exerciseId) ? { ...ex, completed } : ex))

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
        prev
          ? {
              ...prev,
              completed,
              completed_at: completed ? new Date().toISOString() : null,
            }
          : null,
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
      setWorkout((prev) => (prev ? { ...prev, completed: true, completed_at: new Date().toISOString() } : null))

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

  const toggleExpanded = (exerciseId: string) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }))
  }

  const startEditing = (exerciseId: string) => {
    setEditingExercises(prev => ({
      ...prev,
      [exerciseId]: true
    }))
  }

  const cancelEditing = (exerciseId: string, exercise: WorkoutExerciseWithDetails) => {
    setEditingExercises(prev => ({
      ...prev,
      [exerciseId]: false
    }))
    // Reset edit values to original
    setEditValues(prev => ({
      ...prev,
      [exerciseId]: {
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight || "",
        rest_seconds: exercise.rest_seconds
      }
    }))
  }

  const handleSaveEdit = async (exerciseId: string) => {
    try {
      const values = editValues[exerciseId]
      const { error } = await supabase
        .from("workout_exercises")
        .update({
          sets: values.sets,
          reps: values.reps,
          weight: values.weight || null,
          rest_seconds: values.rest_seconds
        })
        .eq("id", exerciseId)

      if (error) {
        toast("Failed to save changes")
        return
      }

      // Update local state
      setExercises(prev => prev.map(ex => 
        ex.id === parseInt(exerciseId)
          ? { ...ex, ...values }
          : ex
      ))
      
      setEditingExercises(prev => ({
        ...prev,
        [exerciseId]: false
      }))
      toast("Exercise updated successfully")
    } catch (error) {
      toast("Failed to save changes")
    }
  }

  const updateEditValue = (exerciseId: string, field: string, value: any) => {
    setEditValues(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [field]: value
      }
    }))
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
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
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

  if (!workout) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Workout Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300">The workout you are looking for does not exist.</p>
        </div>
      </div>
    )
  }

  const completedExercises = exercises.filter((ex) => ex.completed).length
  const totalExercises = exercises.length
  const progressPercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Navigation */}
      <Link
        href={`/dashboard/programs/${workout.program.id}`}
        className="flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Programs
      </Link>

      {/* Unsaved Changes Banner */}
      {hasPendingChanges && (
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">Unsaved Changes</p>
                  <p className="text-sm text-amber-600 dark:text-amber-300">
                    Your changes will be saved automatically in a moment.
                  </p>
                </div>
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
          </CardContent>
        </Card>
      )}

      {/* Workout Header */}
      <Card className="mb-6">
        <CardContent className="p-6 py-1">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "hidden sm:flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0",
                workout.completed
                  ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
              )}
            >
              {workout.workout_type === "gym" ? <Dumbbell className="h-6 w-6" /> : <Activity className="h-6 w-6" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">{workout.name}</h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <span>{workout.program?.name}</span>
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                    <span className="capitalize">
                      {workout.workout_type === "gym" ? "Strength Training" : "Cardio"}
                    </span>
                  </div>
                </div>

                <Badge
                  variant={workout.completed ? "default" : "secondary"}
                  className={cn(
                    "flex items-center gap-1",
                    workout.completed
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                  )}
                >
                  {workout.completed ? <CheckCircle className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                  {workout.completed ? "Completed" : "Pending"}
                </Badge>
              </div>

              {workout.scheduled_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{formatDate(workout.scheduled_date)}</span>
                </div>
              )}

              {/* Progress Bar for Gym Workouts */}
              {workout.workout_type === "gym" && totalExercises > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {completedExercises} of {totalExercises} exercises
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workout Comments */}
      <Card className="mb-6">
        <CardHeader >
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Workout Comments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workoutComments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No comments yet. Be the first to comment!</p>
          ) : (
            <div className="space-y-3">
              {workoutComments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.user?.name || "User"}</span>
                      <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comment.comment_text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="flex gap-3">
            <Textarea
              value={newWorkoutComment}
              onChange={(e) => setNewWorkoutComment(e.target.value)}
              placeholder="Add a comment about this workout..."
              rows={2}
              className="flex-1"
              disabled={commentLoading}
            />
            <Button
              onClick={handleAddWorkoutComment}
              disabled={commentLoading || !newWorkoutComment.trim()}
              size="sm"
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workout Content */}
      {workout.workout_type === "gym" ? (
        <div className="space-y-4">
          {exercises.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Dumbbell className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No exercises yet</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  This workout does not have any exercises assigned yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            exercises.map((exercise, index) => {
              const exerciseId = String(exercise.id)
              const isExpanded = expandedExercises[exerciseId] || false
              const isEditing = editingExercises[exerciseId] || false
              const currentEditValues = editValues[exerciseId] || {
                sets: exercise.sets,
                reps: exercise.reps,
                weight: exercise.weight || "",
                rest_seconds: exercise.rest_seconds
              }

              return (
                <Card
                  key={exercise.id}
                  className={cn(
                    "transition-all duration-200 border-l-4 overflow-hidden py-1",
                    exercise.completed
                      ? "border-l-green-500 bg-green-50/30 dark:bg-green-900/5"
                      : "border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/5",
                  )}
                >
                  {/* Compact Header - Always Visible */}
                  <div 
                    className="p-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => toggleExpanded(exerciseId)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Exercise Image/Icon */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                        {exercise.exercise.image_url ? (
                          <img
                            src={exercise.exercise.image_url || "/placeholder.svg"}
                            alt={exercise.exercise.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={cn(
                          "w-full h-full flex items-center justify-center",
                          exercise.exercise.image_url ? "hidden" : ""
                        )}>
                          <Dumbbell className="h-6 w-6 text-gray-400" />
                        </div>
                      </div>

                      {/* Exercise Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {index + 1}. {exercise.exercise.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span>{exercise.sets}×{exercise.reps}</span>
                          {exercise.weight && (
                            <>
                              <span>•</span>
                              <span>{exercise.weight}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Chevron Icon */}
                      <div className="flex-shrink-0 mr-2">
                        <ChevronDown 
                          className={cn(
                            "h-4 w-4 text-gray-400 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </div>

                      {/* Mark Complete Button */}
                      <Button
                        size="sm"
                        variant={exercise.completed ? "outline" : "default"}
                        className={cn(
                          "flex-shrink-0 text-xs px-3 py-1 h-8",
                          exercise.completed 
                            ? "text-green-600 border-green-300 bg-green-50 hover:bg-green-100" 
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExerciseCompletion(String(exercise.id), !exercise.completed)
                        }}
                      >
                        {exercise.completed ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Done
                          </>
                        ) : (
                          <>
                            <Circle className="h-3 w-3 mr-1" />
                            Mark
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="p-3 space-y-3">
                        {/* Exercise Details */}
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-gray-600 dark:text-gray-400">Sets</Label>
                                <Input
                                  type="number"
                                  value={currentEditValues.sets}
                                  onChange={(e) => updateEditValue(exerciseId, 'sets', parseInt(e.target.value) || 0)}
                                  className="h-8 text-sm"
                                  min="1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600 dark:text-gray-400">Reps</Label>
                                <Input
                                  type="number"
                                  value={currentEditValues.reps}
                                  onChange={(e) => updateEditValue(exerciseId, 'reps', parseInt(e.target.value) || 0)}
                                  className="h-8 text-sm"
                                  min="1"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-gray-600 dark:text-gray-400">Weight</Label>
                                <Input
                                  value={currentEditValues.weight}
                                  onChange={(e) => updateEditValue(exerciseId, 'weight', e.target.value)}
                                  placeholder="e.g., 80kg"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600 dark:text-gray-400">Rest (sec)</Label>
                                <Input
                                  type="number"
                                  value={currentEditValues.rest_seconds}
                                  onChange={(e) => updateEditValue(exerciseId, 'rest_seconds', parseInt(e.target.value) || 0)}
                                  className="h-8 text-sm"
                                  min="0"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleSaveEdit(exerciseId)} className="h-8 text-xs">
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => cancelEditing(exerciseId, exercise)}
                                className="h-8 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Exercise Stats Display */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center justify-start px-2 py-1 gap-3 bg-white dark:bg-gray-900 rounded">
                                <span className="text-gray-600 dark:text-gray-400">Sets:</span>
                                <span className="font-medium">{exercise.sets}</span>
                              </div>
                              <div className="flex items-center justify-start gap-3 px-2 py-1 bg-white dark:bg-gray-900 rounded">
                                <span className="text-gray-600 dark:text-gray-400">Reps:</span>
                                <span className="font-medium">{exercise.reps}</span>
                              </div>
                              <div className="flex items-center justify-start gap-3 px-2 py-1 bg-white dark:bg-gray-900 rounded">
                                <span className="text-gray-600 dark:text-gray-400">Weight:</span>
                                <span className="font-medium">{exercise.weight || "-"}</span>
                              </div>
                              <div className="flex items-center justify-start gap-3 px-2 py-1 bg-white dark:bg-gray-900 rounded">
                                <span className="text-gray-600 dark:text-gray-400">Rest:</span>
                                <span className="font-medium">{exercise.rest_seconds}s</span>
                              </div>
                            </div>

                            {/* Exercise Instructions */}
                            {exercise.exercise.instructions && (
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-200">
                                <strong>Instructions:</strong> {exercise.exercise.instructions}
                              </div>
                            )}

                            {/* Edit Button */}
                            <Button 
                              size="sm" 
                               
                              onClick={() => startEditing(exerciseId)}
                              className="h-8 text-xs "
                            >
                              <Target className="h-3 w-3 mr-1" />
                              Edit Exercise
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      ) : (
        // Cardio workout display
        <Card className={cn(workout.completed && "border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-900/5")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 mt-2">
                <Activity className="h-5 w-5" />
                Cardio Workout Details
              </CardTitle>
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
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              {workout.duration_minutes && (
                <div className="align-middle flex items-center gap-3">
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <Timer className="h-4 w-4" />
                    Duration:
                  </Label>
                  <p className=" font-bold text-gray-900 dark:text-white">{workout.duration_minutes} min</p>
                </div>
              )}

              {workout.intensity_type && (
                <div className="items-center">
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <Zap className="h-4 w-4" />
                    Intensity
                  </Label>
                  <Badge variant="outline" className="text-sm capitalize">
                    {workout.intensity_type}
                  </Badge>
                </div>
              )}

              {workout.target_tss && (
                <div className=" flex align-middle gap-3 items-center">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Training Stress Score:</Label>
                  <p className=" font-bold text-gray-900 dark:text-white">{workout.target_tss}</p>
                </div>
              )}

              {workout.target_ftp && (
                <div className=" flex gap-3">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Functional Threshold Power
                  </Label>
                  <p className="font-bold text-gray-900 dark:text-white">{workout.target_ftp}W</p>
                </div>
              )}
            </div>

            {workout.notes && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Label className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 block">Notes</Label>
                <p className="text-sm text-blue-700 dark:text-blue-300">{workout.notes}</p>
              </div>
            )}

            {workout.completed && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Cardio workout completed successfully!</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
