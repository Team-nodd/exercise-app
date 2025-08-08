"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import type { Exercise } from "@/types"

interface EditExerciseFormProps {
  exerciseId: string
}

export function EditExerciseForm({ exerciseId }: EditExerciseFormProps) {
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  // const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    equipment: "",
    instructions: "",
    image_url: "",
    muscle_groups: [] as string[],
  })

  const categories = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio", "Full Body", "Flexibility"]

  const equipmentTypes = [
    "Barbell",
    "Dumbbell",
    "Machine",
    "Cable",
    "Bodyweight",
    "Resistance Band",
    "Kettlebell",
    "Medicine Ball",
    "Suspension Trainer",
    "Cardio Equipment",
  ]

  const muscleGroups = [
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
    "Core",
    "Cardio",
  ]

  useEffect(() => {
    const fetchExercise = async () => {
      try {
        const { data, error } = await supabase.from("exercises").select("*").eq("id", exerciseId).single()

        if (error) {
          console.error("Error fetching exercise:", error)
          toast( "Failed to load exercise details")
          return
        }

        setExercise(data)
        setFormData({
          name: data.name || "",
          category: data.category || "",
          equipment: data.equipment || "",
          instructions: data.instructions || "",
          image_url: data.image_url || "",
          muscle_groups: data.muscle_groups || [],
        })
      } catch (error) {
        console.error("Error fetching exercise:", error)
        toast("Failed to load exercise details")
      } finally {
        setLoading(false)
      }
    }

    fetchExercise()
  }, [exerciseId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from("exercises")
        .update({
          name: formData.name,
          category: formData.category,
          equipment: formData.equipment,
          instructions: formData.instructions,
          image_url: formData.image_url,
          muscle_groups: formData.muscle_groups,
          updated_at: new Date().toISOString(),
        })
        .eq("id", exerciseId)

      if (error) {
        console.error("Error updating exercise:", error)
        toast("Failed to update exercise")
        return
      }

      toast("Exercise updated successfully")

      router.push("/coach/exercises")
    } catch (error) {
      console.error("Error updating exercise:", error)
      toast( "Failed to update exercise")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this exercise? This action cannot be undone.")) {
      return
    }

    setDeleting(true)

    try {
      const { error } = await supabase.from("exercises").delete().eq("id", exerciseId)

      if (error) {
        console.error("Error deleting exercise:", error)
        toast( "Failed to delete exercise")
        return
      }

      toast( "Exercise deleted successfully")

      router.push("/coach/exercises")
    } catch (error) {
      console.error("Error deleting exercise:", error)
      toast("Failed to delete exercise")
    } finally {
      setDeleting(false)
    }
  }

  const toggleMuscleGroup = (muscleGroup: string) => {
    setFormData((prev) => ({
      ...prev,
      muscle_groups: prev.muscle_groups.includes(muscleGroup)
        ? prev.muscle_groups.filter((mg) => mg !== muscleGroup)
        : [...prev.muscle_groups, muscleGroup],
    }))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading exercise...</div>
  }

  if (!exercise) {
    return <div className="text-center">Exercise not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="h-4 w-4 mr-2" />
          {deleting ? "Deleting..." : "Delete Exercise"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exercise Details</CardTitle>
          <CardDescription>Update the exercise information and instructions</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Exercise Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Bench Press"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment">Equipment</Label>
                <Select
                  value={formData.equipment}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, equipment: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map((equipment) => (
                      <SelectItem key={equipment} value={equipment}>
                        {equipment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Muscle Groups</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {muscleGroups.map((muscleGroup) => (
                  <label key={muscleGroup} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.muscle_groups.includes(muscleGroup)}
                      onChange={() => toggleMuscleGroup(muscleGroup)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{muscleGroup}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData((prev) => ({ ...prev, instructions: e.target.value }))}
                placeholder="Detailed exercise instructions..."
                rows={6}
              />
            </div>

            {/* <div className="space-y-2">
              <Label>Exercise Image</Label>
              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData((prev) => ({ ...prev, image_url: url }))}
                onRemove={() => setFormData((prev) => ({ ...prev, image_url: "" }))}
                disabled={saving}
              />
            </div> */}

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
