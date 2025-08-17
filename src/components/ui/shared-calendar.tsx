/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Calendar, ChevronLeft, ChevronRight, Edit, Copy, Loader2, Clock, Dumbbell, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/lib/hooks/use-media-query"
import type { WorkoutWithDetails } from "@/types"
import { EditWorkoutDialog } from "@/components/coach/edit-workout-dialog"

// import { EditWorkoutDialog } from "./edit-workout-dialog"

interface SharedCalendarProps {
  workouts: WorkoutWithDetails[]
  onWorkoutUpdate?: (workouts: WorkoutWithDetails[]) => void
  userRole: "coach" | "user"
  programId?: number
  userId?: string
  isReadOnly?: boolean
  onEditWorkout?: (workout: WorkoutWithDetails) => void
  onCreateWorkout?: () => void // NEW
}

// Helper function to format date consistently (avoiding timezone issues)
const formatDateForComparison = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to parse date string to local date
const parseWorkoutDate = (dateString: string): Date => {
  // If the date string includes time, extract just the date part
  const datePart = dateString.split("T")[0]
  const [year, month, day] = datePart.split("-").map(Number)
  // Create date in local timezone
  return new Date(year, month - 1, day)
}

// Helper function to create date string for database (start of day in UTC)
const createDateStringForDB = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}T00:00:00.000Z`
}

export function SharedCalendar({
  workouts,
  onWorkoutUpdate,
  userRole,
  programId,
  userId,
  isReadOnly = false,
  onEditWorkout,
  onCreateWorkout,
}: SharedCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<WorkoutWithDetails[]>([])
  const [showWorkoutDialog, setShowWorkoutDialog] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState<WorkoutWithDetails | null>(null)
  const [duplicatingWorkout, setDuplicatingWorkout] = useState<number | null>(null)

  // New: per-workout date state for dialog reschedule on mobile (user role)
  const [rescheduleDateById, setRescheduleDateById] = useState<Record<number, string>>({})
  const [reschedulingWorkoutId, setReschedulingWorkoutId] = useState<number | null>(null)
  const [showRescheduleById, setShowRescheduleById] = useState<Record<number, boolean>>({})

  // Drag and drop states
  const [draggedWorkout, setDraggedWorkout] = useState<WorkoutWithDetails | null>(null)
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null)
  const [autoNavigateTimeout, setAutoNavigateTimeout] = useState<NodeJS.Timeout | null>(null)
  const [navigationDirection, setNavigationDirection] = useState<"prev" | "next" | null>(null)

  const supabase = createClient()
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Cross-tab / cross-device broadcast helper
  const broadcastChange = (workoutId: number, changes: Partial<WorkoutWithDetails>) => {
    try {
      const w = workouts.find((x) => x.id === workoutId)
      const payload: any = {
        type: 'updated',
        workoutId,
        programId: (w as any)?.program_id ?? (w as any)?.program?.id ?? programId,
        userId: (w as any)?.user_id ?? userId,
        changes,
      }
      try {
        const bc = new BroadcastChannel('workouts')
        bc.postMessage(payload)
        bc.close()
      } catch {
        localStorage.setItem('workout-updated', JSON.stringify(payload))
        setTimeout(() => localStorage.removeItem('workout-updated'), 1000)
      }
      try {
        supabase.channel('workouts-live').send({ type: 'broadcast', event: 'workout-updated', payload })
      } catch {}
    } catch {}
  }

  // Add this useEffect near the top of the component, after the state declarations
  useEffect(() => {
    // Keep selected-day dialog in sync if workouts prop changes
    if (showWorkoutDialog && selectedDate) {
      const workoutsForDay = getWorkoutsForDate(selectedDate)
      setSelectedDayWorkouts(workoutsForDay)
    }
  }, [workouts])

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  // Build a date -> workouts map for fast lookups across calendar cells
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, WorkoutWithDetails[]>()
    for (const w of workouts) {
      if (!w.scheduled_date) continue
      const d = parseWorkoutDate(w.scheduled_date)
      const key = formatDateForComparison(d)
      const arr = map.get(key)
      if (arr) arr.push(w)
      else map.set(key, [w])
    }
    return map
  }, [workouts])

  // Compute unique program ids present in current scope
  const scopedProgramIds = useMemo(() => {
    const set = new Set<number>()
    for (const w of workouts) {
      const pid = (w as any).program_id ?? (w as any).program?.id
      if (typeof pid === 'number') set.add(pid)
    }
    return Array.from(set)
  }, [workouts])

  // FIXED: Better date comparison that avoids timezone issues
  const getWorkoutsForDate = (date: Date) => {
    const targetDateString = formatDateForComparison(date)
    return workoutsByDate.get(targetDateString) ?? []
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
    // Close dialog when navigating months
    setShowWorkoutDialog(false)
  }

  // FIXED: Move workout to new date with proper timezone handling
  const moveWorkout = async (workoutId: number, newDate: Date) => {
    if (isReadOnly) return false

    try {
      // Create a proper date string for the database
      const dateString = createDateStringForDB(newDate)

      const { error } = await supabase
        .from("workouts")
        .update({
          scheduled_date: dateString,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workoutId)

      if (error) {
        console.error("Error moving workout:", error)
        toast.error("Failed to move workout")
        return false
      }

      // Update local state immediately with the new date
      const updatedWorkouts = workouts.map((w) => (w.id === workoutId ? { ...w, scheduled_date: dateString } : w))

      // Call the parent update function to trigger re-render
      onWorkoutUpdate?.(updatedWorkouts)

      // Broadcast to other views (coach/user, other tabs/devices)
      broadcastChange(workoutId, { scheduled_date: dateString } as any)

      toast.success(`Workout moved to ${newDate.toLocaleDateString()}`)
      return true
    } catch (error) {
      console.error("Error moving workout:", error)
      toast.error("An unexpected error occurred")
      return false
    }
  }

  // Duplicate workout
  const duplicateWorkout = async (workoutId: number, targetDate?: Date) => {
    if (isReadOnly || userRole !== "coach") return

    setDuplicatingWorkout(workoutId)
    try {
      const originalWorkout = workouts.find((w) => w.id === workoutId)
      if (!originalWorkout) return

      const { data: workoutWithExercises, error: workoutError } = await supabase
        .from("workouts")
        .select(`*, workout_exercises(*)`)
        .eq("id", workoutId)
        .single()

      if (workoutError) {
        toast("Failed to fetch workout data")
        return
      }

      const duplicateWorkoutData = {
        program_id: originalWorkout.program_id,
        user_id: originalWorkout.user_id,
        name: `${originalWorkout.name} (Copy)`,
        workout_type: originalWorkout.workout_type,
        scheduled_date: targetDate ? createDateStringForDB(targetDate) : null,
        notes: originalWorkout.notes,
        intensity_type: originalWorkout.intensity_type,
        duration_minutes: originalWorkout.duration_minutes,
        target_tss: originalWorkout.target_tss,
        target_ftp: originalWorkout.target_ftp,
        cardio_exercise_id: originalWorkout.workout_type === "cardio" ? (originalWorkout as any).cardio_exercise_id ?? null : null,
        completed: false,
        completed_at: null,
        order_in_program: workouts.length + 1,
      }

      const { data: newWorkout, error: createError } = await supabase
        .from("workouts")
        .insert(duplicateWorkoutData)
        .select(`*, program:programs(*)`)
        .single()

      if (createError) {
        toast("Failed to create duplicate workout")
        return
      }

      // FIX: do not include completed_at (column doesn’t exist on workout_exercises)
      if (originalWorkout.workout_type === "gym" && workoutWithExercises.workout_exercises?.length > 0) {
        const duplicateExercises = workoutWithExercises.workout_exercises.map((exercise: any) => ({
          workout_id: newWorkout.id,
          exercise_id: exercise.exercise_id,
          order_in_workout: exercise.order_in_workout,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          rest_seconds: exercise.rest_seconds,
          volume_level: exercise.volume_level,
          completed: false,
        }))

        await supabase.from("workout_exercises").insert(duplicateExercises)
      }

      const updatedWorkouts = [...workouts, newWorkout as WorkoutWithDetails]
      onWorkoutUpdate?.(updatedWorkouts)

      toast(
        `Workout duplicated successfully${targetDate ? ` and scheduled for ${targetDate.toLocaleDateString()}` : ""}!`,
      )
    } catch (error) {
      console.error("Error duplicating workout:", error)
      toast("An unexpected error occurred")
    } finally {
      setDuplicatingWorkout(null)
    }
  }

  // Inline save function removed; editing handled via EditWorkoutDialog

  // Handle day click
  const handleDayClick = (date: Date, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const workoutsForDay = getWorkoutsForDate(date)
  
    if (workoutsForDay.length === 0) {
      setShowWorkoutDialog(false)
      return
    }
  
    setSelectedDate(date)
    setSelectedDayWorkouts(workoutsForDay)
    setShowWorkoutDialog(true)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, workout: WorkoutWithDetails) => {
    if (isReadOnly) return

    e.stopPropagation()
    setDraggedWorkout(workout)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", workout.id.toString())
  }

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    if (isReadOnly || !draggedWorkout) return

    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    setDragOverDate(date)

    // Edge navigation for coaches - improved logic
    if (userRole === "coach") {
      const calendarGrid = e.currentTarget.closest(".grid.grid-cols-7")
      if (!calendarGrid) return

      const rect = calendarGrid.getBoundingClientRect()
      const mouseX = e.clientX
      const edgeThreshold = 80 // Increased threshold for better control
      const bufferZone = 20 // Buffer zone to prevent accidental triggers

      const nearLeftEdge = mouseX - rect.left < edgeThreshold && mouseX - rect.left > bufferZone
      const nearRightEdge = rect.right - mouseX < edgeThreshold && rect.right - mouseX > bufferZone

      if (nearLeftEdge || nearRightEdge) {
        const direction = nearLeftEdge ? "prev" : "next"

        // Only start navigation if direction changed or no navigation is active
        if (navigationDirection !== direction) {
          // Clear any existing timeout
          if (autoNavigateTimeout) {
            clearTimeout(autoNavigateTimeout)
          }

          setNavigationDirection(direction)

          // Initial delay before first navigation (longer delay)
          const timeout = setTimeout(() => {
            navigateMonth(direction)

            // Set up slower continuous navigation
            const continuousTimeout = setInterval(() => {
              navigateMonth(direction)
            }, 1500) // Slower interval - 1.5 seconds instead of 1.2

            setAutoNavigateTimeout(continuousTimeout as any)
          }, 1200) // Longer initial delay - 1.2 seconds instead of 1

          setAutoNavigateTimeout(timeout)
        }
      } else {
        // Clear navigation when not at edge or in buffer zone
        if (autoNavigateTimeout) {
          clearTimeout(autoNavigateTimeout)
          setAutoNavigateTimeout(null)
        }
        setNavigationDirection(null)
      }
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Get the calendar grid bounds
    const calendarGrid = e.currentTarget.closest(".grid.grid-cols-7")
    if (!calendarGrid) return

    const rect = calendarGrid.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    // Only clear states if we're actually leaving the calendar grid area
    if (x < rect.left - 10 || x > rect.right + 10 || y < rect.top - 10 || y > rect.bottom + 10) {
      setDragOverDate(null)
      if (autoNavigateTimeout) {
        clearTimeout(autoNavigateTimeout)
        setAutoNavigateTimeout(null)
      }
      setNavigationDirection(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    if (isReadOnly || !draggedWorkout) return

    e.preventDefault()
    e.stopPropagation()

    setDragOverDate(null)

    // Clear any auto-navigation timeouts
    if (autoNavigateTimeout) {
      clearTimeout(autoNavigateTimeout)
      setAutoNavigateTimeout(null)
    }
    setNavigationDirection(null)

    // FIXED: Better date comparison for drop check
    const originalDate = draggedWorkout.scheduled_date ? parseWorkoutDate(draggedWorkout.scheduled_date) : null
    const targetDateString = formatDateForComparison(date)
    const originalDateString = originalDate ? formatDateForComparison(originalDate) : null

    if (originalDateString === targetDateString) {
      setDraggedWorkout(null)
      return
    }

    // If dropping on a different month, navigate to that month
    if (date.getMonth() !== currentDate.getMonth() || date.getFullYear() !== currentDate.getFullYear()) {
      setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1))
    }

    const success = await moveWorkout(draggedWorkout.id, date)
    setDraggedWorkout(null)
  }

  // FIXED: Format date for input field properly
  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return ""
    const date = parseWorkoutDate(dateString)
    return formatDateForComparison(date)
  }

  // New: parse YYYY-MM-DD from date input
  const parseInputDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number)
    return new Date(y, (m ?? 1) - 1, d ?? 1)
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const today = new Date()
    const days = []

    // Calculate previous month info
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const daysInPrevMonth = getDaysInMonth(prevMonth)

    // Calculate next month info
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)

    // Add days from previous month to fill the first row
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day)
      const workoutsForDay = getWorkoutsForDate(date)
      const isToday = formatDateForComparison(date) === formatDateForComparison(today)
      const isDragOver = dragOverDate && formatDateForComparison(dragOverDate) === formatDateForComparison(date)

      days.push(
        <div key={`prev-${day}`} className="relative">
          <div
            className={cn(
              "h-20 sm:h-24 p-1 border border-gray-100 dark:border-gray-800 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex flex-col opacity-40",
              isToday && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
              isDragOver && "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700 opacity-100",
              
              workoutsForDay.length === 0 && !isDragOver && "cursor-default",
            )}
            onClick={(e) => handleDayClick(date, e)}
            onDragOver={(e) => handleDragOver(e, date)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, date)}
          >
            <div className="text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-600">{day}</div>
            <div className="flex-1 overflow-y-auto scrollbar-hide mt-1 space-y-0.5">
              {workoutsForDay.map((workout) => (
                <div
                  key={workout.id}
                  draggable={!isReadOnly}
                  onDragStart={(e) => handleDragStart(e, workout)}
                  className={cn(
                    "text-xs font-medium px-1 py-0.5 rounded truncate",
                    !isReadOnly && "cursor-move",
                    workout.completed
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    draggedWorkout?.id === workout.id && "opacity-50",
                  )}
                  title={workout.name}
                >
                  {workout.name}
                </div>
              ))}
            </div>
          </div>
          
        </div>,
      )
    }

    // Days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const workoutsForDay = getWorkoutsForDate(date)
      const isToday = formatDateForComparison(date) === formatDateForComparison(today)
      const isPast = date < today && !isToday
      const isDragOver = dragOverDate && formatDateForComparison(dragOverDate) === formatDateForComparison(date)

      days.push(
        <div key={day} className="relative">
          <div
            className={cn(
              "h-20 sm:h-24 p-1 border border-gray-100 dark:border-gray-800 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex flex-col",
              isToday && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
              isPast && "text-gray-400 dark:text-gray-600",
              isDragOver && "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700",
              
              workoutsForDay.length === 0 && !isDragOver && "cursor-default",
            )}
            onClick={(e) => handleDayClick(date, e)}
            onDragOver={(e) => handleDragOver(e, date)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, date)}
          >
            <div className="text-xs sm:text-sm font-medium">{day}</div>
            <div className="flex-1 overflow-y-auto scrollbar-hide mt-1 space-y-0.5">
              {workoutsForDay.map((workout) => (
                <div
                  key={workout.id}
                  draggable={!isReadOnly}
                  onDragStart={(e) => handleDragStart(e, workout)}
                  className={cn(
                    "text-xs font-medium px-1 py-0.5 rounded truncate",
                    !isReadOnly && "cursor-move",
                    workout.completed
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    draggedWorkout?.id === workout.id && "opacity-50",
                  )}
                  title={workout.name}
                >
                  {workout.name}
                </div>
              ))}
            </div>
          </div>
          
        </div>,
      )
    }

    // Calculate how many days we need from next month to complete the grid
    const totalCellsUsed = firstDay + daysInMonth
    const totalRows = Math.ceil(totalCellsUsed / 7)
    const totalCells = totalRows * 7
    const nextMonthDays = totalCells - totalCellsUsed

    // Add days from next month to fill the remaining cells
    for (let day = 1; day <= nextMonthDays; day++) {
      const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day)
      const workoutsForDay = getWorkoutsForDate(date)
      const isToday = formatDateForComparison(date) === formatDateForComparison(today)
      const isDragOver = dragOverDate && formatDateForComparison(dragOverDate) === formatDateForComparison(date)

      days.push(
        <div key={`next-${day}`} className="relative">
          <div
            className={cn(
              "h-20 sm:h-24 p-1 border border-gray-100 dark:border-gray-800 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex flex-col opacity-40",
              isToday && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
              isDragOver && "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700 opacity-100",
              
              workoutsForDay.length === 0 && !isDragOver && "cursor-default",
            )}
            onClick={(e) => handleDayClick(date, e)}
            onDragOver={(e) => handleDragOver(e, date)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, date)}
          >
            <div className="text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-600">{day}</div>
            <div className="flex-1 overflow-y-auto scrollbar-hide mt-1 space-y-0.5">
              {workoutsForDay.map((workout) => (
                <div
                  key={workout.id}
                  draggable={!isReadOnly}
                  onDragStart={(e) => handleDragStart(e, workout)}
                  className={cn(
                    "text-xs font-medium px-1 py-0.5 rounded truncate",
                    !isReadOnly && "cursor-move",
                    workout.completed
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    draggedWorkout?.id === workout.id && "opacity-50",
                  )}
                  title={workout.name}
                >
                  {workout.name}
                </div>
              ))}
            </div>
          </div>
          
        </div>,
      )
    }

    return days
  }

  useEffect(() => {
    return () => {
      if (autoNavigateTimeout) {
        clearTimeout(autoNavigateTimeout)
      }
    }
  }, [autoNavigateTimeout])

  // Realtime: listen for changes to workouts and refresh quickly
  useEffect(() => {
    // For coaches or when explicit programId is provided, use single scoped channel
    if (programId || (userRole === 'coach' && userId)) {
      const filter = programId ? `program_id=eq.${programId}` : `user_id=eq.${userId}`
      const channel = supabase
        .channel(`workouts-rt-scope-${programId ?? `u-${userId}`}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'workouts', filter },
          async () => {
            await refetchScope()
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    // For user view without explicit programId, subscribe per visible program
    if (userRole === 'user' && scopedProgramIds.length > 0) {
      const channels = scopedProgramIds.map((pid) =>
        supabase
          .channel(`workouts-rt-p-${pid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'workouts', filter: `program_id=eq.${pid}` },
            async () => {
              await refetchScope()
            },
          )
          .subscribe(),
      )

      return () => {
        for (const ch of channels) supabase.removeChannel(ch)
      }
    }
  }, [supabase, userRole, userId, programId, scopedProgramIds.join(',')])

  // BroadcastChannel fast-path: reflect local tab updates instantly (optimistic priority)
  useEffect(() => {
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('workouts')
      bc.onmessage = (event) => {
        const msg = event.data as any
        if (!msg || msg.type !== 'updated') return
        const idNum = Number(msg.workoutId)
        if (!Number.isFinite(idNum)) return
        const changes = msg.changes || {}
        // Optimistic: apply incoming changes over existing values
        const updated = workouts.map((w) => (w.id === idNum ? { ...w, ...changes } : w))
        onWorkoutUpdate?.(updated)
      }
    } catch {
      // Fallback to storage events
      const handler = (e: StorageEvent) => {
        if (e.key !== 'workout-updated' || !e.newValue) return
        try {
          const msg = JSON.parse(e.newValue)
          if (!msg || msg.type !== 'updated') return
          const idNum = Number(msg.workoutId)
          if (!Number.isFinite(idNum)) return
          const changes = msg.changes || {}
          const updated = workouts.map((w) => (w.id === idNum ? { ...w, ...changes } : w))
          onWorkoutUpdate?.(updated)
        } catch {}
      }
      window.addEventListener('storage', handler)
      return () => window.removeEventListener('storage', handler)
    }
    return () => {
      try { bc && bc.close() } catch {}
    }
  }, [workouts, onWorkoutUpdate])

  // Apply any queued updates that happened just before navigating here (e.g., finishing a workout then going back)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('workout-updates-queue')
      if (!raw) return
      const queue = JSON.parse(raw)
      if (!Array.isArray(queue) || queue.length === 0) return
      // Apply messages that belong to this scope
      const applyMsgs = queue.filter((msg: any) => {
        if (!msg || msg.type !== 'updated') return false
        const scopeOk =
          (typeof msg.programId === 'number' && (programId ? msg.programId === programId : scopedProgramIds.includes(msg.programId))) ||
          (typeof msg.userId === 'string' && (!!userId && msg.userId === userId))
        return scopeOk
      })
      if (applyMsgs.length === 0) return
      let updated = workouts
      for (const m of applyMsgs) {
        const idNum = Number(m.workoutId)
        if (!Number.isFinite(idNum)) continue
        const changes = m.changes || {}
        updated = updated.map((w) => (w.id === idNum ? { ...w, ...changes } : w))
      }
      onWorkoutUpdate?.(updated)
      // Clear queue after applying
      localStorage.removeItem('workout-updates-queue')
    } catch {}
  }, [workouts, onWorkoutUpdate, programId, userId, scopedProgramIds.join(',')])

  // Supabase broadcast cross-device fast-path
  useEffect(() => {
    const channel = supabase
      .channel('workouts-live')
      .on('broadcast', { event: 'workout-updated' }, (payload: any) => {
        const msg = payload.payload || payload
        if (!msg || msg.type !== 'updated') return
        // Scope check: only apply if it belongs to our visible scope
        const belongsToScope =
          (typeof msg.programId === 'number' && (programId ? msg.programId === programId : scopedProgramIds.includes(msg.programId))) ||
          (typeof msg.userId === 'string' && (!!userId && msg.userId === userId))
        if (!belongsToScope) return
        const idNum = Number(msg.workoutId)
        if (!Number.isFinite(idNum)) return
        const changes = msg.changes || {}
        const updated = workouts.map((w) => (w.id === idNum ? { ...w, ...changes } : w))
        onWorkoutUpdate?.(updated)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, programId, userId, scopedProgramIds.join(','), workouts, onWorkoutUpdate])

  const refetchScope = async () => {
    let q = supabase
      .from("workouts")
      .select(`*, program:programs(*)`)
      .order("scheduled_date", { ascending: true, nullsFirst: false })

    if (programId) q = q.eq("program_id", programId)
    if (userId) q = q.eq("user_id", userId)

    const { data } = await q
    if (data) onWorkoutUpdate?.(data as WorkoutWithDetails[])
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 sm:text-lg">
            <Calendar className="h-5 w-5" />
            <span className="hidden sm:inline">Workout</span> Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {userRole === "coach" && (
              <Button
                className="hidden sm:flex"
                size="sm"
                onClick={() => {
                  if (!programId) return
                  onCreateWorkout?.()
                }}
                disabled={!programId}
                aria-disabled={!programId}
                title={!programId ? "First choose a program please" : undefined}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Workout
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent
        className="relative"
        onClick={() => {
          // Clicking background closes the dialog if open
          setShowWorkoutDialog(false)
        }}
      >
        {/* Edge navigation zones for coaches */}
        {userRole === "coach" && draggedWorkout && (
          <>
            <div
              className={cn(
                "absolute left-0 top-0 w-20 h-full border-r-2 z-10 flex items-center justify-center transition-all duration-300 pointer-events-none",
                navigationDirection === "prev"
                  ? "bg-blue-300/30 dark:bg-blue-700/30 border-blue-400 dark:border-blue-600"
                  : "bg-blue-200/15 dark:bg-blue-800/15 border-blue-300/50 dark:border-blue-700/50",
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <ChevronLeft
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    navigationDirection === "prev"
                      ? "text-blue-700 dark:text-blue-300 scale-110"
                      : "text-blue-600/60 dark:text-blue-400/60",
                  )}
                />
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {navigationDirection === "prev" ? "Navigating..." : "Prev Month"}
                </span>
              </div>
            </div>
            <div
              className={cn(
                "absolute right-0 top-0 w-20 h-full border-l-2 z-10 flex items-center justify-center transition-all duration-300 pointer-events-none",
                navigationDirection === "next"
                  ? "bg-blue-300/30 dark:bg-blue-700/30 border-blue-400 dark:border-blue-600"
                  : "bg-blue-200/15 dark:bg-blue-800/15 border-blue-300/50 dark:border-blue-700/50",
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <ChevronRight
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    navigationDirection === "next"
                      ? "text-blue-700 dark:text-blue-300 scale-110"
                      : "text-blue-600/60 dark:text-blue-400/60",
                  )}
                />
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {navigationDirection === "next" ? "Navigating..." : "Next Month"}
                </span>
              </div>
            </div>
          </>
        )}

        {!isReadOnly && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Tip:</strong>{" "}
              {userRole === "coach"
                ? "Drag workouts between days to reschedule them. Hold at the edges for 1 second to navigate months smoothly!"
                : "Click on a day to view workouts. On desktop, drag workouts to reschedule them."}
            </p>
          </div>
        )}

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="h-6 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>

        {workouts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No workouts scheduled</p>
          </div>
        )}
      </CardContent>

      {/* Workout Dialog */}
      <Dialog open={showWorkoutDialog} onOpenChange={setShowWorkoutDialog}>
        <DialogContent className="w-full mx-auto max-h-[90vh] overflow-hidden">
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
          <ScrollArea className="max-h-[60vh] pr-4 overflow-y-auto">
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
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {workout.workout_type === "gym" ? (
                          <Dumbbell className="h-3 w-3 text-primary" />
                        ) : (
                          <Clock className="h-3 w-3 text-primary" />
                        )}
                        <div>
                          <h4 className="font-semibold text-sm">{workout.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="capitalize">{workout.workout_type}</span>
                            {workout.duration_minutes && <span>• {workout.duration_minutes}min</span>}
                            <Badge variant={workout.completed ? "default" : "secondary"} className="text-xs mt-[1.5px]">
                              {workout.completed ? "Completed" : "Pending"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    {workout.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{workout.notes}</p>}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {userRole === "user" ? (
                        <>
                          <div className="flex flex-row gap-2 w-full sm:w-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              href={`/dashboard/workouts/${workout.id}`}
                              onClick={() => setShowWorkoutDialog(false)}
                              className="text-xs h-7"
                            >
                              Start
                            </Button>
                            {/* Only show on mobile and when not read-only */}
                            {isMobile && !isReadOnly && (
                              <div className="flex flex-col gap-2">
                                {/* Schedule icon button */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setShowRescheduleById((prev) => ({
                                      ...prev,
                                      [workout.id]: !prev[workout.id],
                                    }))
                                  }
                                  className="w-fit text-xs h-7 p-1"
                                >
                                  <Calendar className="h-3 w-3" />
                                </Button>

                                {/* Show reschedule UI only when toggled */}
                                {showRescheduleById[workout.id] && (
                                  <div className="flex flex-row items-stretch gap-2">
                                    <div className="flex-1">
                                      <Label className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                                        Change date
                                      </Label>
                                      <div className="flex flex-row gap-2">
                                        <Input
                                          type="date"
                                          className={"w-fit"}
                                          value={
                                            rescheduleDateById[workout.id] ?? formatDateForInput(workout.scheduled_date)
                                          }
                                          onChange={(e) =>
                                            setRescheduleDateById((prev) => ({
                                              ...prev,
                                              [workout.id]: e.target.value,
                                            }))
                                          }
                                        />
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          disabled={
                                            reschedulingWorkoutId === workout.id ||
                                            !(
                                              rescheduleDateById[workout.id] ??
                                              formatDateForInput(workout.scheduled_date)
                                            )
                                          }
                                          onClick={async () => {
                                            const raw =
                                              rescheduleDateById[workout.id] ??
                                              formatDateForInput(workout.scheduled_date)
                                            if (!raw) return
                                            try {
                                              setReschedulingWorkoutId(workout.id)
                                              const newDate = parseInputDate(raw)
                                              const ok = await moveWorkout(workout.id, newDate)
                                              if (ok) {
                                                // If the workout moved to another day, close dialog for a clean refresh
                                                setShowWorkoutDialog(false)
                                                toast.success("Workout date updated")
                                                // Reset the reschedule UI state
                                                setShowRescheduleById((prev) => ({
                                                  ...prev,
                                                  [workout.id]: false,
                                                }))
                                              }
                                            } finally {
                                              setReschedulingWorkoutId(null)
                                            }
                                          }}
                                          className="w-fit text-xs h-7"
                                        >
                                          {reschedulingWorkoutId === workout.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                          ) : null}
                                          Change
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowWorkoutDialog(false)
                              onEditWorkout?.(workout)
                            }}
                            className="text-xs h-7"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateWorkout(workout.id, selectedDate || undefined)}
                            disabled={duplicatingWorkout === workout.id}
                            className="text-xs h-7"
                          >
                            {duplicatingWorkout === workout.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </>
                      )}
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

      {/* Edit Workout Dialog */}
      <EditWorkoutDialog
        open={!!editingWorkout}
        onOpenChange={(open) => !open && setEditingWorkout(null)}
        programId={programId || 0}
        workoutId={editingWorkout?.id || 0}
        onUpdated={async () => {
          await refetchScope()
        }}
      />
    </Card>
  )
}
