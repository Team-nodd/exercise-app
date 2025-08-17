/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import type { ProgramWithDetails, WorkoutWithDetails, WorkoutExerciseWithDetails } from "@/types"
import { EditWorkoutForm } from "./edit-workout-form"

export function EditWorkoutDialog({
  open,
  onOpenChange,
  programId,
  workoutId,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  programId: number
  workoutId: number
  onUpdated?: () => void
}) {
  const supabase = createClient()
  const [program, setProgram] = useState<ProgramWithDetails | null>(null)
  const [workout, setWorkout] = useState<WorkoutWithDetails | null>(null)
  const [initialExercises, setInitialExercises] = useState<WorkoutExerciseWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const [{ data: programData }, { data: workoutData }, { data: exData }] = await Promise.all([
          supabase
            .from("programs")
            .select(`*, coach:users!programs_coach_id_fkey(*), user:users!programs_user_id_fkey(*)`)
            .eq("id", programId)
            .single(),
          supabase.from("workouts").select("*").eq("id", workoutId).single(),
          supabase
            .from("workout_exercises")
            .select(`*, exercise:exercises(*)`)
            .eq("workout_id", workoutId),
        ])
        if (!cancelled) {
          setProgram(programData as any)
          setWorkout(workoutData as any)
          setInitialExercises((exData || []) as any)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, programId, workoutId, supabase])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-4 py-4 border-b sticky top-0 bg-background z-10">
          <DialogTitle>Edit Workout</DialogTitle>
        </DialogHeader>
        {!loading && program && workout ? (
          <div className="px-4 pb-4">
            <EditWorkoutForm
              program={program}
              workout={workout}
              initialExercises={initialExercises}
              redirectOnSuccess={false}
              onSuccess={() => {
                onUpdated?.()
                onOpenChange(false)
                // Broadcast update to reflect instantly in calendars
                try {
                  const bc = new BroadcastChannel('workouts')
                  bc.postMessage({
                    type: 'updated',
                    workoutId: (workout as any).id,
                    programId: (workout as any).program_id,
                    userId: (workout as any).user_id,
                    changes: {},
                  })
                  bc.close()
                } catch {}
              }}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
