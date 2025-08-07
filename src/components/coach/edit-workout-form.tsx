/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, ArrowLeft, AlertTriangle, Send, User, Dumbbell, CalendarIcon } from 'lucide-react'
import Link from "next/link"
import type { ProgramWithDetails, Exercise, WorkoutWithDetails, WorkoutExerciseWithDetails } from "@/types"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { notificationService } from "@/lib/notifications/notification-service"
import { AppLink } from "../ui/app-link"

interface EditWorkoutFormProps {
  program: ProgramWithDetails
  workout: WorkoutWithDetails
  initialExercises: WorkoutExerciseWithDetails[]
}

interface WorkoutExercise {
  id?: number
  exercise_id: number
  exercise?: Exercise // Optional, for display purposes
  sets: number
  reps: number
  weight: string | null
  rest_seconds: number
  volume_level: "low" | "moderate" | "high"
  order_in_workout: number
  notes: string | null
  completed: boolean
  actual_sets: number | null
  actual_reps: number | null
  actual_weight: string | null
  created_at: string
  updated_at: string
}

export function EditWorkoutForm({ program, workout, initialExercises }: EditWorkoutFormProps) {
  const [name, setName] = useState(workout.name)
  const [workoutType, setWorkoutType] = useState<"gym" | "cardio">(workout.workout_type)
  const [scheduledDate, setScheduledDate] = useState(workout.scheduled_date || "")
  const [notes, setNotes] = useState(workout.notes || "")

  // Cardio specific fields
  const [intensityType, setIntensityType] = useState(workout.intensity_type || "")
  const [durationMinutes, setDurationMinutes] = useState(workout.duration_minutes?.toString() || "")
  const [targetTss, setTargetTss] = useState(workout.target_tss?.toString() || "")
  const [targetFtp, setTargetFtp] = useState(workout.target_ftp?.toString() || "")

  // Exercise management
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>(initialExercises)
  const [loading, setLoading] = useState(false)
  const [loadingExercises, setLoadingExercises] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Comments
  const [workoutComments, setWorkoutComments] = useState<any[]>([])
  const [exerciseComments, setExerciseComments] = useState<Record<number, any>>({})
  const [newCoachWorkoutComment, setNewCoachWorkoutComment] = useState("")
  const [newCoachExerciseComments, setNewCoachExerciseComments] = useState<Record<number, string>>({})
  const [commentLoading, setCommentLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const { data, error } = await supabase.from("exercises").select("*").order("name", { ascending: true })

        if (error) {
          console.error("Error fetching exercises:", error)
          toast.error("Failed to load exercises. Please try again.")
          return
        }

        setExercises(data || [])
      } catch (error) {
        console.error("Error fetching exercises:", error)
        toast.error("An unexpected error occurred while fetching exercises.")
      } finally {
        setLoadingExercises(false)
      }
    }

    fetchExercises()
  }, [supabase])

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    fetchCurrentUser()
  }, [supabase])

  // Fetch comments for workout and exercises
  const fetchComments = async () => {
    try {
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<never>((_, reject) =>
         setTimeout(() => reject(new Error('Request timeout')), 10000)
      )

      // Fetch workout comments
      const workoutCommentsPromise = supabase
        .from("comments")
        .select("*, user:users(name, role)")
        .eq("workout_id", workout.id)
        .is("workout_exercise_id", null)
        .order("created_at", { ascending: true })

      const { data: workoutCommentsData, error: workoutCommentsError } = await Promise.race([workoutCommentsPromise, timeoutPromise]) as { data: any[], error: any }

      if (workoutCommentsError) {
        console.error("Error fetching workout comments:", workoutCommentsError)
        setWorkoutComments([])
      } else {
        setWorkoutComments(workoutCommentsData || [])
      }

      // Fetch exercise comments if there are exercises
      if (initialExercises.length > 0) {
        const exerciseIds = initialExercises.map((ex) => ex.id)
        const exerciseCommentsPromise = supabase
          .from("comments")
          .select("*, user:users(name, role)")
          .in("workout_exercise_id", exerciseIds)
          .order("created_at", { ascending: true })

        const { data: exerciseCommentsData } = await Promise.race([exerciseCommentsPromise, timeoutPromise]) as { data: any[], error: any }

        // Group by workout_exercise_id
        const grouped: Record<number, any[]> = {}
        for (const c of exerciseCommentsData || []) {
          const exId = c.workout_exercise_id
          if (exId) { // Ensure exId is not null
            if (!grouped[exId]) grouped[exId] = []
            grouped[exId].push(c)
          }
        }
        setExerciseComments(grouped)
      } else {
        setExerciseComments({})
      }
    } catch (err) {
      console.error("Error fetching comments:", err)
      setWorkoutComments([])
      setExerciseComments({})
    }
  }

  useEffect(() => {
    fetchComments()
  }, [workout.id, supabase, initialExercises])

  const addExercise = () => {
    setWorkoutExercises([
      ...workoutExercises,
      {
        exercise_id: 0,
        sets: 3,
        reps: 10,
        weight: null,
        rest_seconds: 60,
        volume_level: "moderate",
        order_in_workout: workoutExercises.length + 1,
        notes: null,
        completed: false,
        actual_sets: null,
        actual_reps: null,
        actual_weight: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
  }

  const removeExercise = (index: number) => {
    const updated = workoutExercises.filter((_, i) => i !== index)
    // Update order_in_workout
    updated.forEach((ex, i) => {
      ex.order_in_workout = i + 1
    })
    setWorkoutExercises(updated)
  }

  const updateExercise = (index: number, field: keyof WorkoutExercise, value: any) => {
    const updated = [...workoutExercises]
    updated[index] = { ...updated[index], [field]: value }

    // If exercise_id changed, update the exercise reference
    if (field === "exercise_id") {
      const exercise = exercises.find((ex) => ex.id === value)
      updated[index].exercise = exercise
    }

    setWorkoutExercises(updated)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      // Delete associated workout exercises first
      await supabase.from("workout_exercises").delete().eq("workout_id", workout.id)

      // Then delete the workout
      const { error } = await supabase.from("workouts").delete().eq("id", workout.id)

      if (error) {
        console.error("Error deleting workout:", error)
        toast.error("Failed to delete workout")
        return
      }

      toast.success("Workout deleted successfully")
      router.push(`/coach/programs/${program.id}`)
    } catch (error) {
      console.error("Error deleting workout:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Add coach comment for workout
  const handleAddCoachWorkoutComment = async () => {
    if (!newCoachWorkoutComment.trim()) return

    setCommentLoading(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        toast.error("You must be logged in as coach to comment.")
        setCommentLoading(false)
        return
      }

      const { data: commentData, error: commentError } = await supabase.from("comments").insert({
        user_id: userData.user.id,
        workout_id: workout.id,
        comment_text: newCoachWorkoutComment.trim(),
      }).select().single()

      if (commentError) throw commentError

      // Use notification service to create notification
      try {
        await notificationService.notifyUserWorkoutComment(
          workout.id,
          userData.user.id, // Coach's ID
          program.user.id, // Client's ID
          newCoachWorkoutComment.trim()
        )
        console.log('✅ User notification sent successfully')
      } catch (notificationError) {
        console.error('❌ Error sending notification:', notificationError)
        // Don't show error to user, just log it
      }

      setNewCoachWorkoutComment("")
      await fetchComments() // Re-fetch comments to show the new one
      toast.success("Comment added successfully!")
    } catch (err) {
      console.error("Failed to add comment:", err)
      toast.error("Failed to add comment")
    } finally {
      setCommentLoading(false)
    }
  }

  // Add coach comment for exercise
  const handleAddCoachExerciseComment = async (workoutExerciseId: number) => {
    const text = newCoachExerciseComments[workoutExerciseId] || ""
    if (!text.trim()) return

    setCommentLoading(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        toast.error("You must be logged in as coach to comment.")
        setCommentLoading(false)
        return
      }

      const { data: commentData, error: commentError } = await supabase.from("comments").insert({
        user_id: userData.user.id,
        workout_id: workout.id,
        workout_exercise_id: workoutExerciseId,
        comment_text: text.trim(),
      }).select().single()

      if (commentError) throw commentError

      // Use notification service to create notification
      try {
        await notificationService.notifyUserWorkoutComment(
          workout.id,
          userData.user.id, // Coach's ID
          program.user.id, // Client's ID
          text.trim()
        )
        console.log('✅ User notification sent successfully')
      } catch (notificationError) {
        console.error('❌ Error sending notification:', notificationError)
        // Don't show error to user, just log it
      }

      setNewCoachExerciseComments((prev) => ({ ...prev, [workoutExerciseId]: "" }))
      await fetchComments() // Re-fetch comments to show the new one
      toast.success("Comment added successfully!")
    } catch (err) {
      console.error("Failed to add comment:", err)
      toast.error("Failed to add comment")
    } finally {
      setCommentLoading(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)

      if (error) {
        toast.error("Failed to delete comment")
        return
      }

      await fetchComments() // Re-fetch comments
      toast.success("Comment deleted successfully")
    } catch (error) {
      console.error("Error deleting comment:", error)
      toast.error("Failed to delete comment")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate gym workouts have exercises
      if (workoutType === "gym" && workoutExercises.length === 0) {
        toast.error("Gym workouts must have at least one exercise")
        setLoading(false)
        return
      }

      // Validate gym workouts have valid exercises
      if (workoutType === "gym") {
        const invalidExercises = workoutExercises.filter((ex) => ex.exercise_id === 0)
        if (invalidExercises.length > 0) {
          toast.error("Please select exercises for all workout exercises")
          setLoading(false)
          return
        }
      }

      // Update workout
      const workoutData = {
        name,
        workout_type: workoutType,
        scheduled_date: scheduledDate || null,
        notes: notes || null,
        ...(workoutType === "cardio" && {
          intensity_type: intensityType || null,
          duration_minutes: durationMinutes ? Number.parseInt(durationMinutes) : null,
          target_tss: targetTss ? Number.parseInt(targetTss) : null,
          target_ftp: targetFtp ? Number.parseInt(targetFtp) : null,
        }),
        ...(workoutType === "gym" && {
          intensity_type: null,
          duration_minutes: null,
          target_tss: null,
          target_ftp: null,
        }),
        updated_at: new Date().toISOString(),
      }

      const { error: workoutError } = await supabase.from("workouts").update(workoutData).eq("id", workout.id)

      if (workoutError) {
        console.error("Error updating workout:", workoutError)
        toast.error("Failed to update workout")
        return
      }

      // Handle workout exercises for gym workouts
      if (workoutType === "gym") {
        // Get current exercise IDs in DB
        const { data: currentDbExercises, error: fetchDbError } = await supabase
          .from('workout_exercises')
          .select('id')
          .eq('workout_id', workout.id);

        if (fetchDbError) throw fetchDbError;

        const dbExerciseIds = new Set(currentDbExercises.map(ex => ex.id));

        // Determine exercises to delete (present in DB but not in current state)
        const currentWorkoutExerciseIds = new Set(workoutExercises.map(ex => ex.id).filter(id => id !== undefined));
        const toDelete = Array.from(dbExerciseIds).filter(id => !currentWorkoutExerciseIds.has(id));

        if (toDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('workout_exercises')
            .delete()
            .in('id', toDelete);

          if (deleteError) throw deleteError;
        }

        // Prepare data for upsert (insert new or update existing)
        const upsertData = workoutExercises.map((ex, index) => ({
          ...ex,
          workout_id: workout.id,
          order_in_workout: index + 1,
          // Ensure 'id' is undefined for new records so Supabase generates it
          id: ex.id && ex.id > 0 ? ex.id : undefined,
          created_at: ex.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        if (upsertData.length > 0) {
          const { error: upsertError } = await supabase.from("workout_exercises").upsert(upsertData, { onConflict: 'id' });

          if (upsertError) {
            console.error("Error upserting workout exercises:", upsertError);
            toast.error("Workout updated but failed to update exercises.");
          }
        }
      } else {
        // For cardio workouts, remove any existing exercises
        await supabase.from("workout_exercises").delete().eq("workout_id", workout.id)
      }

      toast.success("Workout updated successfully!")
      router.push(`/coach/programs/${program.id}`)
    } catch (error) {
      console.error("Error updating workout:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (loadingExercises) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8 animate-pulse"></div>

          {/* Form Sections Skeleton */}
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-8">
        <AppLink
          href={`/coach/programs/${program.id}`}
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {program.name}
        </AppLink>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Edit Workout</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base">
              Editing <strong className="font-semibold text-gray-800 dark:text-gray-200">{workout.name}</strong> for{" "}
              <strong className="font-semibold text-gray-800 dark:text-gray-200">{program.user.name}</strong>
            </p>
          </div>
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Workout
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Card className="mb-8 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              Confirm Deletion
            </CardTitle>
            <CardDescription className="text-sm text-red-600 dark:text-red-300">
              Are you sure you want to delete this workout? This action cannot be undone and will remove all associated
              exercises.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Delete Workout
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Workout Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Workout Details
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
              Basic information about the workout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workout Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Upper Body Strength"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workoutType">Workout Type *</Label>
              <Select value={workoutType} onValueChange={(value: "gym" | "cardio") => setWorkoutType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gym">Gym Workout</SelectItem>
                  <SelectItem value="cardio">Cardio Session</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Scheduled Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(new Date(scheduledDate), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduledDate ? new Date(scheduledDate) : undefined}
                    onSelect={(date) => setScheduledDate(date ? format(date, "yyyy-MM-dd") : "")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions or notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cardio Specific Fields */}
        {workoutType === "cardio" && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Cardio Details
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
                Specific parameters for cardio workouts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="intensityType">Intensity Type</Label>
                  <Input
                    id="intensityType"
                    value={intensityType}
                    onChange={(e) => setIntensityType(e.target.value)}
                    placeholder="e.g., Aerobic Base, VO2 Max"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                  <Input
                    id="durationMinutes"
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="45"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetTss">Target TSS</Label>
                  <Input
                    id="targetTss"
                    type="number"
                    value={targetTss}
                    onChange={(e) => setTargetTss(e.target.value)}
                    placeholder="65"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetFtp">Target FTP (watts)</Label>
                  <Input
                    id="targetFtp"
                    type="number"
                    value={targetFtp}
                    onChange={(e) => setTargetFtp(e.target.value)}
                    placeholder="250"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gym Exercises */}
        {workoutType === "gym" && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                    Exercises
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
                    Manage exercises in this workout
                  </CardDescription>
                </div>
                <Button type="button" onClick={addExercise}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exercise
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {workoutExercises.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <Dumbbell className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No exercises added yet</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm max-w-sm mx-auto">
                      Add exercises to build out this gym workout.
                    </p>
                    <Button type="button" onClick={addExercise} className="mt-6">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Exercise
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {workoutExercises.map((workoutExercise, index) => (
                    <Card key={workoutExercise.id || `new-${index}`} className="border-l-4 border-blue-500 bg-blue-50/30 dark:bg-blue-900/5">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-base text-gray-900 dark:text-white">
                            Exercise {index + 1}
                          </h4>
                          <Button type="button" variant="destructive" size="sm" onClick={() => removeExercise(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Exercise *</Label>
                            <Select
                              value={workoutExercise.exercise_id?.toString() || ""}
                              onValueChange={(value) => updateExercise(index, "exercise_id", Number.parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select exercise" />
                              </SelectTrigger>
                              <SelectContent>
                                {exercises.map((exercise) => (
                                  <SelectItem key={exercise.id} value={exercise.id.toString()}>
                                    {exercise.name} ({exercise.category})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Volume Level</Label>
                            <Select
                              value={workoutExercise.volume_level}
                              onValueChange={(value: "low" | "moderate" | "high") =>
                                updateExercise(index, "volume_level", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="moderate">Moderate</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Sets</Label>
                            <Input
                              type="number"
                              value={workoutExercise.sets}
                              onChange={(e) => updateExercise(index, "sets", Number.parseInt(e.target.value) || 0)}
                              min="1"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Reps</Label>
                            <Input
                              type="number"
                              value={workoutExercise.reps}
                              onChange={(e) => updateExercise(index, "reps", Number.parseInt(e.target.value) || 0)}
                              min="1"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Weight</Label>
                            <Input
                              value={workoutExercise.weight || ""}
                              onChange={(e) => updateExercise(index, "weight", e.target.value)}
                              placeholder="e.g., 80kg, BW"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Rest (seconds)</Label>
                            <Input
                              type="number"
                              value={workoutExercise.rest_seconds}
                              onChange={(e) =>
                                updateExercise(index, "rest_seconds", Number.parseInt(e.target.value) || 0)
                              }
                              min="0"
                            />
                          </div>
                        </div>

                        {workoutExercise.exercise && (
                          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              <strong>Instructions:</strong>{" "}
                              {workoutExercise.exercise.instructions || "No instructions available"}
                            </p>
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                              Equipment: {workoutExercise.exercise.equipment || "None specified"}
                            </p>
                          </div>
                        )}

                        {/* Exercise Comments */}
                        <div className="mt-4 space-y-3">
                          <h5 className="font-semibold text-sm">Comments for this Exercise</h5>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {(exerciseComments[workoutExercise.id!] || []).length === 0 && (
                              <p className="text-gray-500 text-xs italic">No comments yet.</p>
                            )}
                            {(exerciseComments[workoutExercise.id!] || []).map((c: any) => (
                              <div key={c.id} className="p-2 bg-gray-100 dark:bg-gray-700 rounded flex gap-2">
                                <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="h-3 w-3 text-gray-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-medium text-xs">{c.user?.name || "User"}</span>
                                    {c.user?.role === "coach" && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1 py-0 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                      >
                                        Coach
                                      </Badge>
                                    )}
                                    <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-xs text-gray-700 dark:text-gray-300">{c.comment_text}</p>
                                  <div className="flex justify-end mt-1">
                                    {c.user_id === currentUserId && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteComment(c.id)}
                                        className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Textarea
                              value={newCoachExerciseComments[workoutExercise.id!] || ""}
                              onChange={(e) => setNewCoachExerciseComments((prev) => ({ ...prev, [workoutExercise.id!]: e.target.value }))}
                              placeholder="Add a coach comment..."
                              rows={1}
                              className="flex-1 text-sm"
                              disabled={commentLoading}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleAddCoachExerciseComment(workoutExercise.id!)}
                              disabled={commentLoading || !(newCoachExerciseComments[workoutExercise.id!] || "").trim()}
                              className="self-end"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Workout Comments Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Workout Comments
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
              See user comments and reply as coach
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {workoutComments.length === 0 && (
                <p className="text-gray-500 text-sm italic">No comments yet. Be the first to comment!</p>
              )}
              {workoutComments.map((c: any) => (
                <div key={c.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex gap-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{c.user?.name || "User"}</span>
                      {c.user?.role === "coach" && (
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          Coach
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{c.comment_text}</p>
                      {c.user_id === currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 ml-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Textarea
                value={newCoachWorkoutComment}
                onChange={(e) => setNewCoachWorkoutComment(e.target.value)}
                placeholder="Add a coach comment..."
                rows={2}
                className="flex-1 text-sm"
                disabled={commentLoading}
              />
              <Button
                size="sm"
                onClick={handleAddCoachWorkoutComment}
                disabled={commentLoading || !newCoachWorkoutComment.trim()}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" asChild>
            <AppLink href={`/coach/programs/${program.id}`}>Cancel</AppLink>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Workout
          </Button>
        </div>
      </form>
    </div>
  )
}
