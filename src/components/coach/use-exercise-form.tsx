"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Dumbbell } from "lucide-react"
import Link from "next/link"
import type { Exercise, ProgramWithDetails, WorkoutWithDetails } from "@/types"
import Image from "next/image"

interface UseExerciseFormProps {
  exercise: Exercise
  coachId: string
}

export function UseExerciseForm({ exercise, coachId }: UseExerciseFormProps) {
  const [programs, setPrograms] = useState<ProgramWithDetails[]>([])
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([])
  const [selectedProgram, setSelectedProgram] = useState("")
  const [selectedWorkout, setSelectedWorkout] = useState("")
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState("")
  const [restSeconds, setRestSeconds] = useState(60)
  const [volumeLevel, setVolumeLevel] = useState<"low" | "moderate" | "high">("moderate")
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const router = useRouter()
  // const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        console.log("=== FETCHING PROGRAMS ===")
        console.log("Coach ID:", coachId)
        
        const { data, error } = await supabase
          .from("programs")
          .select(`
            *,
            coach:users!programs_coach_id_fkey(*),
            user:users!programs_user_id_fkey(*)
          `)
          .eq("coach_id", coachId)
          .order("created_at", { ascending: false })

        console.log("Programs query result:", { data, error })

        if (error) {
          console.error("Error fetching programs:", error)
          toast("Failed to fetch programs")
          return
        }

        setPrograms(data as ProgramWithDetails[])
        console.log("Programs set:", data?.length || 0)
      } catch (error) {
        console.error("Error fetching programs:", error)
        toast("Failed to fetch programs")
      } finally {
        setLoadingData(false)
      }
    }

    if (coachId) {
      fetchPrograms()
    } else {
      console.error("No coach ID provided")
      setLoadingData(false)
    }
  }, [coachId, supabase])

  useEffect(() => {
    const fetchWorkouts = async () => {
      if (!selectedProgram) {
        setWorkouts([])
        return
      }

      try {
        console.log("=== FETCHING WORKOUTS ===")
        console.log("Selected program:", selectedProgram)
        
        const { data, error } = await supabase
          .from("workouts")
          .select(`
            *,
            program:programs(*)
          `)
          .eq("program_id", selectedProgram)
          .eq("workout_type", "gym") // Only gym workouts can have exercises
          .order("scheduled_date", { ascending: true })

        console.log("Workouts query result:", { data, error })

        if (error) {
          console.error("Error fetching workouts:", error)
          toast("Failed to fetch workouts")
          return
        }

        setWorkouts(data as WorkoutWithDetails[])
        console.log("Workouts set:", data?.length || 0)
      } catch (error) {
        console.error("Error fetching workouts:", error)
        toast("Failed to fetch workouts")
      }
    }

    fetchWorkouts()
  }, [selectedProgram, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get the next order number for this workout
      const { data: existingExercises } = await supabase
        .from("workout_exercises")
        .select("order_in_workout")
        .eq("workout_id", selectedWorkout)
        .order("order_in_workout", { ascending: false })
        .limit(1)

      const nextOrder =
        existingExercises && existingExercises.length > 0 ? existingExercises[0].order_in_workout + 1 : 1

      const { error } = await supabase.from("workout_exercises").insert({
        workout_id: selectedWorkout,
        exercise_id: exercise.id,
        order_in_workout: nextOrder,
        sets,
        reps,
        weight: weight || null,
        rest_seconds: restSeconds,
        volume_level: volumeLevel,
      })

      if (error) {
        console.error("Error adding exercise to workout:", error)
        toast("Failed to add exercise to workout"
        )
        return
      }

      toast(`${exercise.name} added to workout successfully!`)

      router.push(`/coach/programs/${selectedProgram}`)
    } catch (error) {
      console.error("Error adding exercise to workout:", error)
      toast( "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
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
          href="/coach/exercises"
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Exercise Library
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add Exercise to Workout</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Adding <strong>{exercise.name}</strong> to a workout
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Exercise Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {exercise.image_url ? (
                <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                  <Image
                    width={32}
                    height={32}
                    src={exercise.image_url}
                    alt={exercise.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <Dumbbell className="h-5 w-5 hidden" />
                </div>
              ) : (
                <Dumbbell className="h-5 w-5" />
              )}
              {exercise.name}
            </CardTitle>
            <CardDescription>Exercise details</CardDescription>
          </CardHeader>
          <CardContent>
            {exercise.image_url && (
              <div className="mb-4 rounded-lg overflow-hidden">
                <Image
                  width={32}
                  height={32}
                  src={exercise.image_url}
                  alt={exercise.name}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    // Hide image if it fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="space-y-3">
              {exercise.category && (
                <div>
                  <span className="font-medium">Category: </span>
                  <span className="text-muted-foreground">{exercise.category}</span>
                </div>
              )}
              {exercise.equipment && (
                <div>
                  <span className="font-medium">Equipment: </span>
                  <span className="text-muted-foreground">{exercise.equipment}</span>
                </div>
              )}
              {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                <div>
                  <span className="font-medium">Muscle Groups: </span>
                  <span className="text-muted-foreground">{exercise.muscle_groups.join(", ")}</span>
                </div>
              )}
              {exercise.instructions && (
                <div>
                  <span className="font-medium">Instructions: </span>
                  <p className="text-muted-foreground text-sm mt-1">{exercise.instructions}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add to Workout Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add to Workout</CardTitle>
            <CardDescription>Select a program and workout to add this exercise</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <Select value={selectedWorkout} onValueChange={setSelectedWorkout} required disabled={!selectedProgram}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a workout" />
                  </SelectTrigger>
                  <SelectContent>
                    {workouts.map((workout) => (
                      <SelectItem key={workout.id} value={workout.id.toString()}>
                        {workout.name}
                        {workout.scheduled_date && ` - ${new Date(workout.scheduled_date).toLocaleDateString()}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProgram && workouts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No gym workouts found in this program.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sets">Sets *</Label>
                  <Input
                    id="sets"
                    type="number"
                    value={sets}
                    onChange={(e) => setSets(Number.parseInt(e.target.value) || 0)}
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reps">Reps *</Label>
                  <Input
                    id="reps"
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(Number.parseInt(e.target.value) || 0)}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g., 80kg, BW, 50lbs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rest">Rest (seconds) *</Label>
                <Input
                  id="rest"
                  type="number"
                  value={restSeconds}
                  onChange={(e) => setRestSeconds(Number.parseInt(e.target.value) || 0)}
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="volume">Volume Level *</Label>
                <Select
                  value={volumeLevel}
                  onValueChange={(value: "low" | "moderate" | "high") => setVolumeLevel(value)}
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

              <div className="flex gap-4">
                <Button type="submit" disabled={loading || !selectedWorkout}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add to Workout
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/coach/exercises">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
