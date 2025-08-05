"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { ImageUpload } from "@/components/ui/image-upload"

const CATEGORIES = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio", "Full Body", "Flexibility"]

const EQUIPMENT_TYPES = [
  "Barbell",
  "Dumbbell",
  "Cable",
  "Machine",
  "Bodyweight",
  "Resistance Band",
  "Kettlebell",
  "Medicine Ball",
  "Other",
]

const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Quadriceps",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Abs",
  "Obliques",
  "Lower Back",
]

export function CreateExerciseForm() {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [equipment, setEquipment] = useState("")
  const [muscleGroups, setMuscleGroups] = useState<string[]>([])
  const [instructions, setInstructions] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleMuscleGroupToggle = (muscleGroup: string) => {
    setMuscleGroups((prev) =>
      prev.includes(muscleGroup) ? prev.filter((mg) => mg !== muscleGroup) : [...prev, muscleGroup],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from("exercises").insert({
        name,
        category: category || null,
        equipment: equipment || null,
        muscle_groups: muscleGroups.length > 0 ? muscleGroups : null,
        instructions: instructions || null,
        image_url: imageUrl || null,
      })

      if (error) {
        console.error("Error creating exercise:", error)
        toast("Failed to create exercise",)
        return
      }

      toast("Exercise created successfully!")

      router.push("/coach/exercises")
    } catch (error) {
      console.error("Error creating exercise:", error)
      toast("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Exercise</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Add a new exercise to your library</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Exercise Details</CardTitle>
          <CardDescription>Fill in the exercise information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Exercise Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Bench Press"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment</Label>
              <Select value={equipment} onValueChange={setEquipment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map((eq) => (
                    <SelectItem key={eq} value={eq}>
                      {eq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Muscle Groups</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {MUSCLE_GROUPS.map((muscle) => (
                  <label key={muscle} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={muscleGroups.includes(muscle)}
                      onChange={() => handleMuscleGroupToggle(muscle)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{muscle}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Detailed instructions for performing this exercise..."
                rows={4}
              />
            </div>

            {/* <div className="space-y-2">
              <Label>Exercise Image</Label>
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                onRemove={() => setImageUrl("")}
                disabled={loading}
              />
            </div> */}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                Create Exercise
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/coach/exercises">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
