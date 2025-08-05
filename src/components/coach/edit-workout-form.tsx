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
import { Loader2, Plus, Trash2, ArrowLeft, AlertTriangle } from "lucide-react"
import Link from "next/link"
import type { ProgramWithDetails, Exercise, WorkoutWithDetails, WorkoutExerciseWithDetails } from "@/types"

interface EditWorkoutFormProps {
  program: ProgramWithDetails
  workout: WorkoutWithDetails
  initialExercises: WorkoutExerciseWithDetails[]
}

interface WorkoutExercise {
  id?: number
  exercise_id: number
  exercise?: Exercise
  sets: number
  reps: number
  weight: string
  rest_seconds: number
  volume_level: "low" | "moderate" | "high"
  order_in_workout: number
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
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingExercises, setLoadingExercises] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [workoutComments, setWorkoutComments] = useState<any[]>([])
  const [exerciseComments, setExerciseComments] = useState<Record<number, any[]>>({})
  const [newCoachWorkoutComment, setNewCoachWorkoutComment] = useState("")
  const [newCoachExerciseComments, setNewCoachExerciseComments] = useState<Record<number, string>>({})
  const [commentLoading, setCommentLoading] = useState(false)

  const router = useRouter()
  // const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const { data, error } = await supabase.from("exercises").select("*").order("name", { ascending: true })

        if (error) {
          console.error("Error fetching exercises:", error)
          return
        }

        setExercises(data || [])

        // Convert initial exercises to workout exercises format
        const convertedExercises: WorkoutExercise[] = initialExercises.map((ex) => ({
          id: ex.id,
          exercise_id: ex.exercise_id,
          exercise: ex.exercise,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight || "",
          rest_seconds: ex.rest_seconds,
          volume_level: ex.volume_level,
          order_in_workout: ex.order_in_workout,
        }))

        setWorkoutExercises(convertedExercises)
      } catch (error) {
        console.error("Error fetching exercises:", error)
      } finally {
        setLoadingExercises(false)
      }
    }

    fetchExercises()
  }, [supabase, initialExercises])

  // Fetch comments for workout and exercises
  const fetchComments = async (exList: WorkoutExerciseWithDetails[]) => {
    try {
      // Workout comments
      const { data: workoutCommentsData } = await supabase
        .from("comments")
        .select("*, user:users(name, role)")
        .eq("workout_id", workout.id)
        .is("workout_exercise_id", null)
        .order("created_at", { ascending: true })
      setWorkoutComments(workoutCommentsData || [])
      // Exercise comments
      if (exList.length > 0) {
        const exerciseIds = exList.map((ex) => ex.id)
        const { data: exerciseCommentsData } = await supabase
          .from("comments")
          .select("*, user:users(name, role)")
          .in("workout_exercise_id", exerciseIds)
          .order("created_at", { ascending: true })
        // Group by exerciseId
        const grouped: Record<number, any[]> = {}
        for (const c of exerciseCommentsData || []) {
          const exId = c.workout_exercise_id
          if (!grouped[exId]) grouped[exId] = []
          grouped[exId].push(c)
        }
        setExerciseComments(grouped)
      } else {
        setExerciseComments({})
      }
    } catch {
      setWorkoutComments([])
      setExerciseComments({})
    }
  }

  useEffect(() => {
    fetchComments(initialExercises)
  }, [initialExercises])

  const addExercise = () => {
    setWorkoutExercises([
      ...workoutExercises,
      {
        exercise_id: 0,
        sets: 3,
        reps: 10,
        weight: "",
        rest_seconds: 60,
        volume_level: "moderate",
        order_in_workout: workoutExercises.length + 1,
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

  const updateExercise = (index: number, field: keyof WorkoutExercise, value: unknown) => {
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
      const { error } = await supabase.from("workouts").delete().eq("id", workout.id)

      if (error) {
        console.error("Error deleting workout:", error)
        toast( 
        "Failed to delete workout"
        )
        return
      }

      toast("Workout deleted successfully")

      router.push(`/coach/programs/${program.id}`)
    } catch (error) {
      console.error("Error deleting workout:", error)
      toast( "An unexpected error occurred")
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
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null
      if (!user) {
        toast("You must be logged in as coach to comment.")
        setCommentLoading(false)
        return
      }
      const { error } = await supabase.from("comments").insert({
        user_id: user.id,
        workout_id: workout.id,
        comment_text: newCoachWorkoutComment.trim(),
      })
      if (!error) {
        setNewCoachWorkoutComment("")
        await fetchComments(initialExercises)
      } else {
        toast("Failed to add comment")
      }
    } catch {
      toast("Failed to add comment")
    }
    setCommentLoading(false)
  }

  // Add coach comment for exercise
  const handleAddCoachExerciseComment = async (exerciseId: number) => {
    const text = newCoachExerciseComments[exerciseId] || ""
    if (!text.trim()) return
    setCommentLoading(true)
    try {
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null
      if (!user) {
        toast("You must be logged in as coach to comment.")
        setCommentLoading(false)
        return
      }
      const { error } = await supabase.from("comments").insert({
        user_id: user.id,
        workout_id: workout.id,
        workout_exercise_id: exerciseId,
        comment_text: text.trim(),
      })
      if (!error) {
        setNewCoachExerciseComments((prev) => ({ ...prev, [exerciseId]: "" }))
        await fetchComments(initialExercises)
      } else {
        toast("Failed to add comment")
      }
    } catch {
      toast("Failed to add comment")
    }
    setCommentLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate gym workouts have exercises
      if (workoutType === "gym" && workoutExercises.length === 0) {
        toast("Gym workouts must have at least one exercise")
        setLoading(false)
        return
      }

      // Validate gym workouts have valid exercises
      if (workoutType === "gym") {
        const invalidExercises = workoutExercises.filter((ex) => ex.exercise_id === 0)
        if (invalidExercises.length > 0) {
          toast( "Please select exercises for all workout exercises")
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
      }

      const { error: workoutError } = await supabase.from("workouts").update(workoutData).eq("id", workout.id)

      if (workoutError) {
        console.error("Error updating workout:", workoutError)
        toast("Failed to update workout")
        return
      }

      // Handle workout exercises for gym workouts
      if (workoutType === "gym") {
        // Delete existing workout exercises
        await supabase.from("workout_exercises").delete().eq("workout_id", workout.id)

        // Insert new workout exercises
        if (workoutExercises.length > 0) {
          const exerciseData = workoutExercises.map((ex) => ({
            workout_id: workout.id,
            exercise_id: ex.exercise_id,
            order_in_workout: ex.order_in_workout,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight || null,
            rest_seconds: ex.rest_seconds,
            volume_level: ex.volume_level,
          }))

          const { error: exerciseError } = await supabase.from("workout_exercises").insert(exerciseData)

          if (exerciseError) {
            console.error("Error updating workout exercises:", exerciseError)
            toast("Workout updated but failed to update exercises")
          }
        }
      } else {
        // For cardio workouts, remove any existing exercises
        await supabase.from("workout_exercises").delete().eq("workout_id", workout.id)
      }

      toast( "Workout updated successfully!")

      router.push(`/coach/programs/${program.id}`)
    } catch (error) {
      console.error("Error updating workout:", error)
      toast("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (loadingExercises) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href={`/coach/programs/${program.id}`}
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {program.name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Workout</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Editing <strong>{workout.name}</strong> for {program.user.name}
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
        <Card className="mb-8 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Workout
            </CardTitle>
            <CardDescription>
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Workout Info */}
        <Card>
          <CardHeader>
            <CardTitle>Workout Details</CardTitle>
            <CardDescription>Basic information about the workout</CardDescription>
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
              <Input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
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
            <CardHeader>
              <CardTitle>Cardio Details</CardTitle>
              <CardDescription>Specific parameters for cardio workouts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Exercises</CardTitle>
                  <CardDescription>Manage exercises in this workout</CardDescription>
                </div>
                <Button type="button" onClick={addExercise} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exercise
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {workoutExercises.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No exercises added yet</p>
                  <Button type="button" onClick={addExercise}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Exercise
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {workoutExercises.map((workoutExercise, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Exercise {index + 1}</h4>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeExercise(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Exercise *</Label>
                          <Select
                            value={workoutExercise.exercise_id.toString()}
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
                            value={workoutExercise.weight}
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
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm">
                            <strong>Instructions:</strong>{" "}
                            {workoutExercise.exercise.instructions || "No instructions available"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Equipment: {workoutExercise.exercise.equipment || "None specified"}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Comments Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Workout Comments</CardTitle>
            <CardDescription>See user comments and reply as coach</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-2">
              {workoutComments.length === 0 && <div className="text-gray-500 text-sm">No comments yet.</div>}
              {workoutComments.map((c) => (
                <div key={c.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="font-medium">{c.user?.name || "User"}</span>
                  {c.user?.role === "coach" && <span className="ml-1 text-blue-600">(Coach)</span>}: {c.comment_text}
                  <span className="ml-2 text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Textarea
                value={newCoachWorkoutComment}
                onChange={(e) => setNewCoachWorkoutComment(e.target.value)}
                placeholder="Add a coach comment..."
                rows={2}
                className="flex-1"
                disabled={commentLoading}
              />
              <Button onClick={handleAddCoachWorkoutComment} disabled={commentLoading || !newCoachWorkoutComment.trim()}>Post</Button>
            </div>
          </CardContent>
        </Card>

        {/* Gym Exercise Comments */}
        {workoutType === "gym" && initialExercises.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Exercise Comments</CardTitle>
              <CardDescription>See user comments and reply as coach for each exercise</CardDescription>
            </CardHeader>
            <CardContent>
              {initialExercises.map((ex, idx) => (
                <div key={ex.id} className="mb-4">
                  <div className="font-medium text-xs mb-1">{idx + 1}. {ex.exercise?.name}</div>
                  <div className="space-y-1 mb-1">
                    {(exerciseComments[ex.id] || []).length === 0 && (
                      <div className="text-gray-400 text-xs">No comments yet.</div>
                    )}
                    {(exerciseComments[ex.id] || []).map((c) => (
                      <div key={c.id} className="p-1 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                        <span className="font-medium">{c.user?.name || "User"}</span>
                        {c.user?.role === "coach" && <span className="ml-1 text-blue-600">(Coach)</span>}: {c.comment_text}
                        <span className="ml-2 text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <Textarea
                      value={newCoachExerciseComments[ex.id] || ""}
                      onChange={(e) => setNewCoachExerciseComments((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                      placeholder="Add a coach comment..."
                      rows={1}
                      className="flex-1 text-xs"
                      disabled={commentLoading}
                    />
                    <Button size="sm" onClick={() => handleAddCoachExerciseComment(ex.id)} disabled={commentLoading || !(newCoachExerciseComments[ex.id] || "").trim()}>Post</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Workout
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/coach/programs/${program.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
