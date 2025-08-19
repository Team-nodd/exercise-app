"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ProgramWithDetails } from "@/types"
import { CreateWorkoutForm } from "./create-workout-form"
import { createClient } from "@/lib/supabase/client"

export function CreateWorkoutDialog({
  open,
  onOpenChange,
  program,
  onCreated,
  scheduledDate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  program: ProgramWithDetails
  onCreated?: () => void
  scheduledDate?: Date
}) {
  console.log('CreateWorkoutDialog received scheduledDate:', scheduledDate)
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
            initialScheduledDate={scheduledDate}
            onSuccess={() => {
              onCreated?.()
              onOpenChange(false)
              // Broadcast creation with latest record so calendars can add instantly
              ;(async () => {
                try {
                  const supa = createClient()
                  const { data } = await supa
                    .from('workouts')
                    .select('*, program:programs(*)')
                    .eq('program_id', (program as any).id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()
                  if (data) {
                    const payload = { type: 'created', workoutId: (data as any).id, programId: (data as any).program_id, userId: (data as any).user_id, record: data }
                    try {
                      const bc = new BroadcastChannel('workouts')
                      bc.postMessage(payload)
                      bc.close()
                    } catch {}
                    try {
                      supa.channel('workouts-live').send({ type: 'broadcast', event: 'workout-updated', payload })
                    } catch {}
                  }
                } catch {}
              })()
            }}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
