"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Loader2, HeartPulse } from "lucide-react"
import Link from "next/link"
import type { CardioExercise, ProgramWithDetails, WorkoutWithDetails } from "@/types"

interface UseCardioFormProps {
  cardio: CardioExercise
  coachId: string
}

export function UseCardioForm({ cardio, coachId }: UseCardioFormProps) {
  const [programs, setPrograms] = useState<ProgramWithDetails[]>([])
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([])
  const [selectedProgram, setSelectedProgram] = useState("")
  const [selectedWorkout, setSelectedWorkout] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const { data, error } = await supabase
          .from("programs")
          .select(`
            *,
            coach:users!programs_coach_id_fkey(*),
            user:users!programs_user_id_fkey(*)
          `)
          .eq("coach_id", coachId)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching programs:", error)
          toast("Failed to fetch programs")
          return
        }

        setPrograms((data || []) as ProgramWithDetails[])
      } catch (error) {
        console.error("Error fetching programs:", error)
        toast("Failed to fetch programs")
      } finally {
        setLoading(false)
      }
    }

    if (coachId) fetchPrograms()
    else setLoading(false)
  }, [coachId, supabase])

  useEffect(() => {
    const fetchWorkouts = async () => {
      if (!selectedProgram) {
        setWorkouts([])
        return
      }
      setLoadingWorkouts(true)
      try {
        const { data, error } = await supabase
          .from("workouts")
          .select(`
            *,
            program:programs(*)
          `)
          .eq("program_id", selectedProgram)
          .eq("workout_type", "cardio")
          .order("scheduled_date", { ascending: true })

        if (error) {
          console.error("Error fetching workouts:", error)
          toast("Failed to fetch workouts")
          return
        }

        setWorkouts((data || []) as WorkoutWithDetails[])
      } catch (error) {
        console.error("Error fetching workouts:", error)
        toast("Failed to fetch workouts")
      } finally {
        setLoadingWorkouts(false)
      }
    }

    fetchWorkouts()
  }, [selectedProgram, supabase])

  const handleApply = async () => {
    if (!selectedProgram || !selectedWorkout) {
      toast("Please select a program and a workout")
      return
    }
    try {
      const { error } = await supabase
        .from("workouts")
        .update({
          workout_type: "cardio",
          intensity_type: cardio.intensity_type || null,
          duration_minutes: cardio.duration_minutes ?? null,
          target_tss: cardio.target_tss ?? null,
          target_ftp: cardio.target_ftp ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedWorkout)

      if (error) {
        console.error("Error applying cardio to workout:", error)
        toast("Failed to apply cardio to workout")
        return
      }

      toast("Cardio type applied to workout")
      router.push(`/coach/programs/${selectedProgram}`)
    } catch (error) {
      console.error("Error applying cardio to workout:", error)
      toast("Failed to apply cardio to workout")
    }
  }

  if (loading) {
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
        <Link href="/coach/exercises" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Exercise Library
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Use Cardio Type in Program</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Apply this cardio template to an existing cardio workout</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Cardio Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5" />
              {cardio.name}
            </CardTitle>
            <CardDescription>Cardio template details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {cardio.intensity_type && (
                <div>
                  <span className="font-medium">Intensity Type: </span>
                  <span className="text-muted-foreground">{cardio.intensity_type}</span>
                </div>
              )}
              {typeof cardio.duration_minutes === "number" && (
                <div>
                  <span className="font-medium">Duration: </span>
                  <span className="text-muted-foreground">{cardio.duration_minutes} min</span>
                </div>
              )}
              {typeof cardio.target_tss === "number" && (
                <div>
                  <span className="font-medium">Target TSS: </span>
                  <span className="text-muted-foreground">{cardio.target_tss}</span>
                </div>
              )}
              {typeof cardio.target_ftp === "number" && (
                <div>
                  <span className="font-medium">Target FTP: </span>
                  <span className="text-muted-foreground">{cardio.target_ftp}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Choose Program & Workout */}
        <Card>
          <CardHeader>
            <CardTitle>Select Program and Workout</CardTitle>
            <CardDescription>Choose a program and one of its cardio workouts to apply this template</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="program">Program *</Label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.id.toString()}>
                        {program.name} - {program.user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {programs.length === 0 && (
                  <p className="text-sm text-muted-foreground">No programs found. Create a program first.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="workout">Workout *</Label>
                <Select
                  value={selectedWorkout}
                  onValueChange={setSelectedWorkout}
                  required
                  disabled={!selectedProgram || loadingWorkouts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingWorkouts ? "Loading workouts..." : "Select a workout"} />
                  </SelectTrigger>
                  <SelectContent>
                    {workouts.map((w) => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.name}
                        {w.scheduled_date && ` - ${new Date(w.scheduled_date).toLocaleDateString()}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProgram && !loadingWorkouts && workouts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No cardio workouts found in this program.</p>
                )}
              </div>

              <div className="flex gap-4">
                <Button type="button" onClick={handleApply} disabled={!selectedProgram || !selectedWorkout}>
                  Apply to Workout
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/coach/exercises">Cancel</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

