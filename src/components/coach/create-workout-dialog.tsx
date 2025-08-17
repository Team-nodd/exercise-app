"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ProgramWithDetails } from "@/types"
import { CreateWorkoutForm } from "./create-workout-form"

export function CreateWorkoutDialog({
  open,
  onOpenChange,
  program,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  program: ProgramWithDetails
  onCreated?: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-4 py-4 border-b sticky top-0 bg-background z-10">
          <DialogTitle>Create Workout</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-4">
          <CreateWorkoutForm
            program={program}
            redirectOnSuccess={false}
            onSuccess={() => {
              onCreated?.()
              onOpenChange(false)
              // Broadcast creation; actual record is not available here, calendars will refetch via realtime
              try {
                const bc = new BroadcastChannel('workouts')
                bc.postMessage({ type: 'created', workoutId: -1, programId: (program as any).id })
                bc.close()
              } catch {}
            }}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
