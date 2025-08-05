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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

interface ProgramDetailProps {
  program: ProgramWithDetails
}

export function ProgramDetail({ program }: ProgramDetailProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [duplicatingWorkout, setDuplicatingWorkout] = useState<number | null>(null)
  const supabase = createClient()
  // const { toast } = useToast()
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutWithDetails | null>(null)
  const [workoutComments, setWorkoutComments] = useState<any[]>([])
  const [exerciseComments, setExerciseComments] = useState<Record<string, any[]>>({})
  const [newCoachComment, setNewCoachComment] = useState("")
  const [commentLoading, setCommentLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(program.name)
  const [titleSaving, setTitleSaving] = useState(false)

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
          .order("scheduled_date", { ascending: true })

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

  // Fetch comments for a workout and its exercises
  const fetchComments = async (workout: WorkoutWithDetails) => {
    try {
      // Fetch workout comments
      const { data: workoutCommentsData } = await supabase
        .from("comments")
        .select("*, user:users(name, role)")
        .eq("workout_id", workout.id)
        .is("workout_exercise_id", null)
        .order("created_at", { ascending: true })
      setWorkoutComments(workoutCommentsData || [])
      // Fetch exercise comments (for gym)
      if (workout.workout_type === "gym") {
        const { data: exerciseCommentsData } = await supabase
          .from("comments")
          .select("*, user:users(name, role)")
          .in("workout_exercise_id", workout.workout_exercises?.map((ex: any) => ex.id) || [])
          .order("created_at", { ascending: true })
        // Group by exerciseId
        const grouped: Record<string, any[]> = {}
        for (const c of exerciseCommentsData || []) {
          const exId = c.workout_exercise_id
          if (!grouped[exId]) grouped[exId] = []
          grouped[exId].push(c)
        }
        setExerciseComments(grouped)
      } else {
        setExerciseComments({})
      }
    } catch (error) {
      setWorkoutComments([])
      setExerciseComments({})
    }
  }

  // Open dialog and fetch workout details/comments
  const handleOpenWorkoutDialog = async (workoutId: number) => {
    setDialogOpen(true)
    setSelectedWorkout(null)
    setWorkoutComments([])
    setExerciseComments({})
    setNewCoachComment("")
    // Fetch workout details (with exercises)
    const { data: workout } = await supabase
      .from("workouts")
      .select("*, workout_exercises(*, exercise:exercises(*))")
      .eq("id", workoutId)
      .single()
    if (workout) {
      setSelectedWorkout(workout)
      await fetchComments(workout)
    }
  }

  // Add coach comment
  const handleAddCoachComment = async () => {
    if (!selectedWorkout || !newCoachComment.trim()) return
    setCommentLoading(true)
    try {
      // Get coach user
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null
      if (!user) {
        toast("You must be logged in as coach to comment.")
        setCommentLoading(false)
        return
      }
      const { error } = await supabase.from("comments").insert({
        user_id: user.id,
        workout_id: selectedWorkout.id,
        comment_text: newCoachComment.trim(),
      })
      if (!error) {
        setNewCoachComment("")
        await fetchComments(selectedWorkout)
      } else {
        toast("Failed to add comment")
      }
    } catch {
      toast("Failed to add comment")
    }
    setCommentLoading(false)
  }

  // Inline edit save handler
  const handleTitleSave = async () => {
    if (titleValue.trim() && titleValue !== program.name) {
      setTitleSaving(true)
      const { error } = await supabase.from("programs").update({ name: titleValue.trim() }).eq("id", program.id)
      setTitleSaving(false)
      if (!error) {
        program.name = titleValue.trim()
        toast("Program title updated")
        setEditingTitle(false)
      } else {
        toast("Failed to update title")
      }
    } else {
      setEditingTitle(false)
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
            {editingTitle ? (
              <Input
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    handleTitleSave()
                  } else if (e.key === "Escape") {
                    setEditingTitle(false)
                    setTitleValue(program.name)
                  }
                }}
                disabled={titleSaving}
                autoFocus
                className="text-3xl font-bold text-gray-900 dark:text-white mb-1 px-2 py-1"
              />
            ) : (
              <h1
                className="text-3xl font-bold text-gray-900 dark:text-white mb-1 cursor-pointer hover:underline"
                onClick={() => setEditingTitle(true)}
                tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter") setEditingTitle(true) }}
              >
                {titleValue}
              </h1>
            )}
            <p className="text-gray-600 dark:text-gray-300 mt-2">{program.description}</p>
          </div>

          <div className="flex gap-3">
            <Badge className={getStatusColor(program.status)}>
              {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
            </Badge>
            <Button size="sm" asChild>
              <Link href={`/coach/programs/${program.id}/edit`}>Edit</Link>
            </Button>
          </div>
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
                <div key={workout.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-2 sm:gap-0">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold cursor-pointer underline underline-offset-2" onClick={() => handleOpenWorkoutDialog(workout.id)}>{workout.name}</h3>
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
                  <div className="flex flex-col xs:flex-row flex-wrap gap-2 w-full sm:w-auto sm:flex-row sm:justify-end sm:items-center mt-2 sm:mt-0">
                    <Badge variant={workout.completed ? "default" : "secondary"} className=" xs:w-auto text-center">
                      {workout.completed ? "Completed" : "Pending"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full xs:w-auto"
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
                    <Button variant="outline" size="sm" asChild className="w-full xs:w-auto">
                      <Link href={`/coach/programs/${program.id}/workouts/${workout.id}`}>Edit</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="p-5 max-w-lg w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl sm:p-5 rounded-lg sm:rounded-xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedWorkout?.name || "Workout Details"}</DialogTitle>
            <DialogDescription>
              {selectedWorkout?.workout_type === "gym" ? "Gym Workout" : "Cardio Session"}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 sm:p-6"> {/* Added padding for dialog content */}
            {/* Workout info */}
            {selectedWorkout && (
              <>
                <div className="mb-4">
                  <div className="text-sm text-muted-foreground mb-1">Scheduled: {selectedWorkout.scheduled_date ? new Date(selectedWorkout.scheduled_date).toLocaleDateString() : "Not set"}</div>
                  <div className="text-sm text-muted-foreground mb-1">Duration: {selectedWorkout.duration_minutes || "-"} min</div>
                  <div className="text-sm text-muted-foreground mb-1">Notes: {selectedWorkout.notes || "-"}</div>
                </div>
                {/* Workout Comments */}
                <div className="mb-4">
                  <h4 className="font-semibold mb-1">Workout Comments</h4>
                  <div className="space-y-1 mb-1">
                    {workoutComments.length === 0 && <div className="text-gray-400 text-xs">No comments yet.</div>}
                    {workoutComments.map((c) => (
                      <div key={c.id} className="p-1 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                        <span className="font-medium">{c.user?.name || "User"}</span>
                        {c.user?.role === "coach" && <span className="ml-1 text-blue-600">(Coach)</span>}: {c.comment_text}
                        <span className="ml-2 text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <Textarea
                      value={newCoachComment}
                      onChange={(e) => setNewCoachComment(e.target.value)}
                      placeholder="Add a coach comment..."
                      rows={1}
                      className="flex-1 text-xs"
                      disabled={commentLoading}
                    />
                    <Button size="sm" onClick={handleAddCoachComment} disabled={commentLoading || !newCoachComment.trim()}>Post</Button>
                  </div>
                </div>
                {/* Exercise Comments (for gym) */}
                {selectedWorkout.workout_type === "gym" && selectedWorkout.workout_exercises?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Exercise Comments</h4>
                    {selectedWorkout.workout_exercises.map((ex: any, idx: number) => (
                      <div key={ex.id} className="mb-2">
                        <div className="font-medium text-xs mb-1">{idx + 1}. {ex.exercise?.name}</div>
                        <div className="space-y-1">
                          {(exerciseComments[ex.id] || []).length === 0 && <div className="text-gray-400 text-xs">No comments yet.</div>}
                          {(exerciseComments[ex.id] || []).map((c) => (
                            <div key={c.id} className="p-1 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                              <span className="font-medium">{c.user?.name || "User"}</span>
                              {c.user?.role === "coach" && <span className="ml-1 text-blue-600">(Coach)</span>}: {c.comment_text}
                              <span className="ml-2 text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
