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
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { ProgramWithDetails, Exercise } from "@/types"
import { AppLink } from "../ui/app-link"
import { useGlobalLoading } from "../providers/loading-provider"

interface CreateWorkoutFormProps {
  program: ProgramWithDetails
}

interface WorkoutExercise {
  exercise_id: number
  exercise?: Exercise
  sets: number
  reps: number
  weight: string
  rest_seconds: number
  volume_level: "low" | "moderate" | "high"
  order_in_workout: number
}

export function CreateWorkoutForm({ program }: CreateWorkoutFormProps) {
  const [name, setName] = useState("")
  const [workoutType, setWorkoutType] = useState<"gym" | "cardio">("gym")
  const [scheduledDate, setScheduledDate] = useState("")
  const [notes, setNotes] = useState("")

  // Cardio specific fields
  const [intensityType, setIntensityType] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [targetTss, setTargetTss] = useState("")
  const [targetFtp, setTargetFtp] = useState("")

  // Exercise management
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([])
  // const [loading, setLoading] = useState(false)
  const {loading, setLoading} = useGlobalLoading()
  const [loadingExercises, setLoadingExercises] = useState(true)

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
      } catch (error) {
        console.error("Error fetching exercises:", error)
      } finally {
        setLoadingExercises(false)
      }
    }

    fetchExercises()
  }, [supabase])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate gym workouts have exercises
      if (workoutType === "gym" && workoutExercises.length === 0) {
        toast(
          "Gym workouts must have at least one exercise"
          )
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

      // Create workout
      const workoutData = {
        program_id: program.id,
        user_id: program.user_id,
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
      }

      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert(workoutData)
        .select()
        .single()

      if (workoutError) {
        console.error("Error creating workout:", workoutError)
        toast("Failed to create workout")
        return
      }

      // Create workout exercises for gym workouts
      if (workoutType === "gym" && workoutExercises.length > 0) {
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
          console.error("Error creating workout exercises:", exerciseError)
          toast( "Workout created but failed to add exercises")
        }
      }

      toast( "Workout created successfully!",
      )

      router.push(`/coach/programs/${program.id}`)
    } catch (error) {
      console.error("Error creating workout:", error)
      toast("An unexpected error occurred",
     )
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <AppLink
          href={`/coach/programs/${program.id}`}
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {program.name}
        </AppLink>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Workout</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Add a workout to <strong>{program.name}</strong> for {program.user.name}
        </p>
      </div>

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
                required
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
                  <CardDescription>Add exercises to this workout</CardDescription>
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

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Workout
          </Button>
          <Button type="button" variant="outline" asChild>
            <AppLink href={`/coach/programs/${program.id}`}>Cancel</AppLink>
          </Button>
        </div>
      </form>
    </div>
  )
}
