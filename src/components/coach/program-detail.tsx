/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, User, Plus, Dumbbell, Clock, ArrowLeft, Copy, Loader2, RefreshCw, ChevronLeft, ChevronRight, Edit, ExternalLink, Save, X } from 'lucide-react'
import { toast } from "sonner"
import Link from "next/link"
import type { ProgramWithDetails, WorkoutWithDetails } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface ProgramDetailProps {
  program: ProgramWithDetails
}

export function ProgramDetail({ program }: ProgramDetailProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [duplicatingWorkout, setDuplicatingWorkout] = useState<number | null>(null)
  const supabase = createClient()
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutWithDetails | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [workoutComments, setWorkoutComments] = useState<any[]>([])
  const [exerciseComments, setExerciseComments] = useState<Record<string, any[]>>({})
  const [newCoachComment, setNewCoachComment] = useState("")
  const [commentLoading, setCommentLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(program.name)
  const [titleSaving, setTitleSaving] = useState(false)

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showWorkoutSelectionDialog, setShowWorkoutSelectionDialog] = useState(false)
  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<WorkoutWithDetails[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Enhanced editing states
  const [editingWorkout, setEditingWorkout] = useState<WorkoutWithDetails | null>(null)
  const [saving, setSaving] = useState(false)

  // Drag and drop states
  const [draggedWorkout, setDraggedWorkout] = useState<WorkoutWithDetails | null>(null)
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null)
  const [autoNavigateTimeout, setAutoNavigateTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isAutoNavigating, setIsAutoNavigating] = useState(false)
  const [edgeHoverStartTime, setEdgeHoverStartTime] = useState<number | null>(null)
  const [navigationDirection, setNavigationDirection] = useState<'prev' | 'next' | null>(null)

  const fetchWorkouts = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from("workouts")
        .select(`
          *,
          program:programs(*)
        `)
        .eq("program_id", program.id)
        .order("scheduled_date", { ascending: true, nullsFirst: false })

      if (fetchError) {
        console.error("Error fetching workouts:", fetchError)
        setError("Failed to load workouts. Please try again.")
        return
      }

      setWorkouts(data as WorkoutWithDetails[])
    } catch (err) {
      console.error("Error fetching workouts:", err)
      setError("An unexpected error occurred while fetching workouts.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkouts()
  }, [program.id, supabase])

  const duplicateWorkout = async (workoutId: number, targetDate?: Date) => {
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
        toast("Failed to fetch workout data")
        return
      }

      console.log("✅ Original workout fetched:", originalWorkout)

      // Create the duplicate workout
      const duplicateWorkoutData = {
        program_id: originalWorkout.program_id,
        user_id: originalWorkout.user_id,
        name: `${originalWorkout.name} (Copy)`,
        workout_type: originalWorkout.workout_type,
        scheduled_date: targetDate ? targetDate.toISOString() : null,
        notes: originalWorkout.notes,
        intensity_type: originalWorkout.intensity_type,
        duration_minutes: originalWorkout.duration_minutes,
        target_tss: originalWorkout.target_tss,
        target_ftp: originalWorkout.target_ftp,
        completed: false,
        completed_at: null,
        order_in_program: workouts.length + 1,
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
        const duplicateExercises = originalWorkout.workout_exercises.map((exercise: any) => ({
          workout_id: newWorkout.id,
          exercise_id: exercise.exercise_id,
          order_in_workout: exercise.order_in_workout,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          rest_seconds: exercise.rest_seconds,
          volume_level: exercise.volume_level,
          completed: false,
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
      await fetchWorkouts()
      toast(`Workout duplicated successfully${targetDate ? ` and scheduled for ${targetDate.toLocaleDateString()}` : ''}!`)
      console.log("✅ Workout duplication completed successfully")
    } catch (error) {
      console.error("❌ Unexpected error during workout duplication:", error)
      toast("An unexpected error occurred")
    } finally {
      setDuplicatingWorkout(null)
    }
  }

  // Move workout to new date
  const moveWorkout = async (workoutId: number, newDate: Date) => {
    try {
      const { error } = await supabase
        .from("workouts")
        .update({
          scheduled_date: newDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", workoutId)

      if (error) {
        console.error("Error moving workout:", error)
        toast("Failed to move workout")
        return false
      }

      // Update local state
      setWorkouts(prev => prev.map(w => 
        w.id === workoutId 
          ? { ...w, scheduled_date: newDate.toISOString() }
          : w
      ))

      toast(`Workout moved to ${newDate.toLocaleDateString()}`)
      return true
    } catch (error) {
      console.error("Error moving workout:", error)
      toast("An unexpected error occurred")
      return false
    }
  }

  // Fetch comments for a workout and its exercises
  const fetchComments = async (workout: WorkoutWithDetails & { workout_exercises?: any[] }) => {
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
      if (workout.workout_type === "gym" && workout.workout_exercises?.length) {
        const { data: exerciseCommentsData } = await supabase
          .from("comments")
          .select("*, user:users(name, role)")
          .in("workout_exercise_id", workout.workout_exercises.map((ex: any) => ex.id) || [])
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

  // Save workout changes
  const saveWorkout = async () => {
    if (!editingWorkout) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("workouts")
        .update({
          name: editingWorkout.name,
          scheduled_date: editingWorkout.scheduled_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingWorkout.id)

      if (error) {
        console.error("Error updating workout:", error)
        toast("Failed to update workout")
        return
      }

      // Update the local state
      setWorkouts((prev) => prev.map((w) => (w.id === editingWorkout.id ? { ...w, ...editingWorkout } : w)))
      setSelectedWorkout(editingWorkout)
      setEditingWorkout(null)
      toast("Workout updated successfully!")
    } catch (error) {
      console.error("Error saving workout:", error)
      toast("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
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

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getWorkoutsForDate = (date: Date) => {
    const dateString = date.toDateString()
    return workouts.filter(workout => {
      if (!workout.scheduled_date) return false
      const workoutDate = new Date(workout.scheduled_date)
      return workoutDate.toDateString() === dateString
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handleDayClick = (date: Date) => {
    const workoutsForDay = getWorkoutsForDate(date)
    if (workoutsForDay.length === 1) {
      handleOpenWorkoutDialog(workoutsForDay[0].id)
    } else if (workoutsForDay.length > 1) {
      setSelectedDate(date)
      setSelectedDayWorkouts(workoutsForDay)
      setShowWorkoutSelectionDialog(true)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, workout: WorkoutWithDetails) => {
    setDraggedWorkout(workout)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(date)

    // Get the calendar container bounds for edge detection
    const calendarContainer = e.currentTarget.parentElement
    if (!calendarContainer) return

    const rect = calendarContainer.getBoundingClientRect()
    const mouseX = e.clientX
    const edgeThreshold = 60 // pixels from edge to trigger navigation

    // Check if we're near the left or right edge
    const nearLeftEdge = mouseX - rect.left < edgeThreshold
    const nearRightEdge = rect.right - mouseX < edgeThreshold

    if (nearLeftEdge || nearRightEdge) {
      const direction = nearLeftEdge ? 'prev' : 'next'
      const currentTime = Date.now()

      // If we're starting to hover at an edge or switching directions
      if (!edgeHoverStartTime || navigationDirection !== direction) {
        setEdgeHoverStartTime(currentTime)
        setNavigationDirection(direction)
        
        // Clear any existing timeout
        if (autoNavigateTimeout) {
          clearTimeout(autoNavigateTimeout)
          setAutoNavigateTimeout(null)
        }

        // Set initial navigation timeout (longer delay for first navigation)
        const timeout = setTimeout(() => {
          if (!isAutoNavigating) {
            setIsAutoNavigating(true)
            navigateMonth(direction)
            
            // Set up continuous navigation with longer intervals
            const continuousNavigation = setInterval(() => {
              navigateMonth(direction)
            }, 1200) // 1.2 seconds between navigations

            // Store the interval ID in a way we can clear it
            setAutoNavigateTimeout(continuousNavigation as any)

            // Reset the auto-navigating flag after the navigation
            setTimeout(() => setIsAutoNavigating(false), 400)
          }
        }, 1000) // 1 second initial delay

        setAutoNavigateTimeout(timeout)
      }
    } else {
      // Not near any edge, clear everything
      if (autoNavigateTimeout) {
        clearTimeout(autoNavigateTimeout)
        setAutoNavigateTimeout(null)
      }
      setEdgeHoverStartTime(null)
      setNavigationDirection(null)
      setIsAutoNavigating(false)
    }
  }

  const handleDragLeave = () => {
    setDragOverDate(null)
    // Clear auto-navigation timeout when leaving the calendar area
    if (autoNavigateTimeout) {
      clearTimeout(autoNavigateTimeout)
      setAutoNavigateTimeout(null)
    }
    setEdgeHoverStartTime(null)
    setNavigationDirection(null)
    setIsAutoNavigating(false)
  }

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    setDragOverDate(null)
    
    if (!draggedWorkout) return

    // Check if we need to navigate to a different month
    if (date.getMonth() !== currentDate.getMonth() || date.getFullYear() !== currentDate.getFullYear()) {
      setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1))
    }

    const success = await moveWorkout(draggedWorkout.id, date)
    if (success) {
      setDraggedWorkout(null)
    }
  }

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toISOString().split("T")[0]
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const today = new Date()
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 sm:h-24"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const workoutsForDay = getWorkoutsForDate(date)
      const isToday = date.toDateString() === today.toDateString()
      const isPast = date < today && !isToday
      const isDragOver = dragOverDate?.toDateString() === date.toDateString()

      days.push(
        <div
          key={day}
          className={cn(
            "h-20 sm:h-24 p-1 border border-gray-100 dark:border-gray-800 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex flex-col",
            isToday && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
            isPast && "text-gray-400 dark:text-gray-600",
            isDragOver && "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700",
            workoutsForDay.length === 0 && !isDragOver && "cursor-default"
          )}
          onClick={() => workoutsForDay.length > 0 && handleDayClick(date)}
          onDragOver={(e) => handleDragOver(e, date)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, date)}
        >
          <div className="text-xs sm:text-sm font-medium">{day}</div>
          <div className="flex-1 overflow-y-auto scrollbar-hide mt-1 space-y-0.5">
            {workoutsForDay.map(workout => (
              <div
                key={workout.id}
                draggable
                onDragStart={(e) => handleDragStart(e, workout)}
                className={cn(
                  "text-xs font-medium px-1 py-0.5 rounded truncate cursor-move",
                  workout.completed
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                  draggedWorkout?.id === workout.id && "opacity-50"
                )}
                title={workout.name}
              >
                {workout.name}
              </div>
            ))}
          </div>
        </div>
      )
    }

    return days
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
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "paused":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8 animate-pulse"></div>
          {/* Program Info Skeleton */}
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                    <div className="space-y-1 flex-1">
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Program</h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={fetchWorkouts} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-8">
        <Link
          href="/coach/programs"
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Programs
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {editingTitle ? (
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTitleSave()
                  } else if (e.key === "Escape") {
                    setEditingTitle(false)
                    setTitleValue(program.name)
                  }
                }}
                disabled={titleSaving}
                autoFocus
                className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 px-2 py-1"
              />
            ) : (
              <h1
                className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 cursor-pointer hover:underline"
                onClick={() => setEditingTitle(true)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditingTitle(true)
                }}
              >
                {titleValue}
              </h1>
            )}
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base">{program.description}</p>
          </div>
          <div className="flex gap-3">
            <Badge className={getStatusColor(program.status)}>
              {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
            </Badge>
            <Button size="sm" href={`/coach/programs/${program.id}/edit`}>
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Program Info */}
      <Card className="mb-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl font-semibold text-blue-800 dark:text-blue-200">
            Program Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Client</p>
                <p className="font-medium text-blue-800 dark:text-blue-200">{program.user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Start Date</p>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  {program.start_date ? new Date(program.start_date).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">End Date</p>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  {program.end_date ? new Date(program.end_date).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar View</span>
            <span className="sm:hidden">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="workouts" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">Workouts</span>
            <span className="sm:hidden">List</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workouts" className="space-y-4">
          {/* Workouts Section */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Workouts</CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
                    Manage the workouts in this program
                  </CardDescription>
                </div>
                <Button href={`/coach/programs/${program.id}/workouts/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Workout
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {workouts.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <Dumbbell className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No workouts yet</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm max-w-sm mx-auto">
                      Start building this program by adding workouts.
                    </p>
                    <Button href={`/coach/programs/${program.id}/workouts/new`} className="mt-6">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Workout
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {workouts.map((workout, index) => (
                    <div
                      key={workout.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-2 sm:gap-0 hover:shadow-md transition-all duration-200 border-l-4",
                        workout.completed
                          ? "border-l-green-500 bg-green-50/30 dark:bg-green-900/5"
                          : "border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/5",
                      )}
                    >
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {index + 1}
                        </div>
                        <div>
                          <h3
                            className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base cursor-pointer hover:underline underline-offset-2"
                            onClick={() => handleOpenWorkoutDialog(workout.id)}
                          >
                            {workout.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              {workout.workout_type === "gym" ? (
                                <Dumbbell className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {workout.workout_type === "gym" ? "Gym Workout" : "Cardio Session"}
                            </span>
                            {workout.scheduled_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(workout.scheduled_date)}
                              </span>
                            )}
                            {workout.duration_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {workout.duration_minutes} min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col xs:flex-row flex-wrap gap-2 w-full sm:w-auto sm:flex-row sm:justify-end sm:items-center mt-2 sm:mt-0">
                        <Badge
                          variant={workout.completed ? "default" : "secondary"}
                          className={cn(
                            "xs:w-auto text-center",
                            workout.completed
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                          )}
                        >
                          {workout.completed ? "Completed" : "Pending"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full xs:w-auto bg-transparent"
                          onClick={() => duplicateWorkout(workout.id)}
                          disabled={duplicatingWorkout === workout.id}
                        >
                          {duplicatingWorkout === workout.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Copy className="h-4 w-4 mr-1" />
                          )}
                          {duplicatingWorkout === workout.id ? "Duplicating..." : "Duplicate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          href={`/coach/programs/${program.id}/workouts/${workout.id}`}
                          className="w-full xs:w-auto bg-transparent"
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 sm:text-lg">
                  <Calendar className="h-5 w-5" />
                  Workout Schedule
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {/* Edge navigation zones */}
              {draggedWorkout && (
                <>
                  <div className={cn(
                    "absolute left-0 top-0 w-16 h-full border-r-2 z-10 flex items-center justify-center transition-all duration-300",
                    navigationDirection === 'prev' 
                      ? "bg-blue-300/40 dark:bg-blue-700/40 border-blue-400 dark:border-blue-600" 
                      : "bg-blue-200/20 dark:bg-blue-800/20 border-blue-300 dark:border-blue-700"
                  )}>
                    <ChevronLeft className={cn(
                      "h-6 w-6 transition-all duration-300",
                      navigationDirection === 'prev' 
                        ? "text-blue-700 dark:text-blue-300 scale-110" 
                        : "text-blue-600 dark:text-blue-400"
                    )} />
                  </div>
                  <div className={cn(
                    "absolute right-0 top-0 w-16 h-full border-l-2 z-10 flex items-center justify-center transition-all duration-300",
                    navigationDirection === 'next' 
                      ? "bg-blue-300/40 dark:bg-blue-700/40 border-blue-400 dark:border-blue-600" 
                      : "bg-blue-200/20 dark:bg-blue-800/20 border-blue-300 dark:border-blue-700"
                  )}>
                    <ChevronRight className={cn(
                      "h-6 w-6 transition-all duration-300",
                      navigationDirection === 'next' 
                        ? "text-blue-700 dark:text-blue-300 scale-110" 
                        : "text-blue-600 dark:text-blue-400"
                    )} />
                  </div>
                </>
              )}
              
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Tip:</strong> Drag workouts between days to reschedule them. Hold at the edges for 1 second to navigate months smoothly!
                </p>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="h-6 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
              {workouts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No workouts scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Day View Dialog - Multiple Workouts */}
      <Dialog open={showWorkoutSelectionDialog} onOpenChange={setShowWorkoutSelectionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDate?.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {selectedDayWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className={cn(
                    "border rounded-lg bg-background transition-all duration-200 border-l-4",
                    workout.completed
                      ? "border-l-green-500 bg-green-50/30 dark:bg-green-900/5"
                      : "border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/5",
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {workout.workout_type === "gym" ? (
                          <Dumbbell className="h-4 w-4 text-primary" />
                        ) : (
                          <Clock className="h-4 w-4 text-primary" />
                        )}
                        <div>
                          <h4 className="font-semibold">{workout.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="capitalize">{workout.workout_type}</span>
                            <Badge variant={workout.completed ? "default" : "secondary"} className="text-xs">
                              {workout.completed ? "Completed" : "Pending"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowWorkoutSelectionDialog(false)
                          setSelectedWorkout(workout)
                          setDialogOpen(true)
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowWorkoutSelectionDialog(false)
                          setEditingWorkout({ ...workout })
                          setSelectedWorkout(workout)
                          setDialogOpen(true)
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Quick Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateWorkout(workout.id, selectedDate || undefined)}
                        disabled={duplicatingWorkout === workout.id}
                      >
                        {duplicatingWorkout === workout.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        {duplicatingWorkout === workout.id ? "Duplicating..." : "Duplicate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        href={`/coach/programs/${program.id}/workouts/${workout.id}`}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Full Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workout Details/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setSelectedWorkout(null)
            setEditingWorkout(null)
          }
        }}
      >
        <DialogContent className="max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-6 sm:p-8 rounded-lg sm:rounded-xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
              {editingWorkout ? "Edit Workout" : selectedWorkout?.name || "Workout Details"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              {selectedWorkout?.workout_type === "gym" ? "Gym Workout" : "Cardio Session"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedWorkout && (
            <div className="space-y-6">
              {editingWorkout ? (
                // Edit mode
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="workout-name">Workout Name</Label>
                    <Input
                      id="workout-name"
                      value={editingWorkout.name}
                      onChange={(e) => setEditingWorkout({ ...editingWorkout, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="scheduled-date">Scheduled Date</Label>
                    <Input
                      id="scheduled-date"
                      type="date"
                      value={formatDateForInput(editingWorkout.scheduled_date)}
                      onChange={(e) =>
                        setEditingWorkout({
                          ...editingWorkout,
                          scheduled_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })
                      }
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={saveWorkout} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingWorkout(null)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Scheduled Date</label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedWorkout.scheduled_date
                          ? new Date(selectedWorkout.scheduled_date).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Duration</label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedWorkout.duration_minutes || "-"} min
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Notes</label>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedWorkout.notes || "-"}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setEditingWorkout({ ...selectedWorkout })}>
                      <Edit className="h-4 w-4 mr-2" />
                      Quick Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => duplicateWorkout(selectedWorkout.id)}
                      disabled={duplicatingWorkout === selectedWorkout.id}
                    >
                      {duplicatingWorkout === selectedWorkout.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {duplicatingWorkout === selectedWorkout.id ? "Duplicating..." : "Duplicate"}
                    </Button>
                    <Button href={`/coach/programs/${program.id}/workouts/${selectedWorkout.id}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Full Edit
                    </Button>
                  </div>

                  {/* Workout Comments */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base text-gray-900 dark:text-white">Workout Comments</h4>
                    <div className="space-y-3">
                      {workoutComments.length === 0 && (
                        <p className="text-gray-500 text-sm italic">No comments yet. Be the first to comment!</p>
                      )}
                      {workoutComments.map((c) => (
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
                            <p className="text-sm text-gray-700 dark:text-gray-300">{c.comment_text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Textarea
                        value={newCoachComment}
                        onChange={(e) => setNewCoachComment(e.target.value)}
                        placeholder="Add a coach comment..."
                        rows={2}
                        className="flex-1 text-sm"
                        disabled={commentLoading}
                      />
                      <Button
                        size="sm"
                        onClick={handleAddCoachComment}
                        disabled={commentLoading || !newCoachComment.trim()}
                        className="self-end"
                      >
                        Post
                      </Button>
                    </div>
                  </div>

                  {/* Exercise Comments (for gym) */}
                  {selectedWorkout.workout_type === "gym" && (selectedWorkout as any).workout_exercises?.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-base text-gray-900 dark:text-white">Exercise Comments</h4>
                      {(selectedWorkout as any).workout_exercises.map((ex: any, idx: number) => (
                        <div key={ex.id} className="space-y-3 p-3 border rounded-lg bg-muted/50">
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {idx + 1}. {ex.exercise?.name}
                          </div>
                          <div className="space-y-2">
                            {(exerciseComments[ex.id] || []).length === 0 && (
                              <p className="text-gray-500 text-xs italic">No comments yet.</p>
                            )}
                            {(exerciseComments[ex.id] || []).map((c: any) => (
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
                                    <span className="text-xs text-gray-500">
                                      {new Date(c.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700 dark:text-gray-300">{c.comment_text}</p>
                                </div>
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
          )}
          
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
