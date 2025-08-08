"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Plus } from "lucide-react"
import { AppLink } from "../ui/app-link"
// import { ImageUpload } from "@/components/ui/image-upload"

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
    "Bike",
    "Elliptical",
    "Rowing Machine",
    "Stair Climber",
    "Treadmill",
    "Stationary Bike",
    "Elliptical",
    "None",
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
  "Hip",
  "Thigh",
  "Calves",
  "Neck",
  "Glutes",
  "Calves",
  "Abs",
  "Obliques",
  "Lower Back",
]

export function CreateExerciseForm() {
  const [activeTab, setActiveTab] = useState<"gym" | "cardio">("gym")
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [equipment, setEquipment] = useState("")
  const [muscleGroups, setMuscleGroups] = useState<string[]>([])
  const [instructions, setInstructions] = useState("")
  const [imageUrl] = useState("")
  const [loading, setLoading] = useState(false)

  // Cardio template fields
  const [cardioName, setCardioName] = useState("")
  const [intensityType, setIntensityType] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [targetTss, setTargetTss] = useState("")
  const [targetFtp, setTargetFtp] = useState("")

  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    const typeParam = searchParams.get("type")
    if (typeParam === "cardio") setActiveTab("cardio")
  }, [searchParams])
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
      if (activeTab === "gym") {
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
          toast("Failed to create exercise")
          return
        }

        toast("Exercise created successfully!")
        router.push("/coach/exercises")
      } else {
        const { data: userData } = await supabase.auth.getUser()
        const createdBy = userData?.user?.id || null
        const { error } = await supabase.from("cardio_exercises").insert({
          name: cardioName.trim(),
          intensity_type: intensityType || null,
          duration_minutes: durationMinutes ? Number.parseInt(durationMinutes) : null,
          target_tss: targetTss ? Number.parseInt(targetTss) : null,
          target_ftp: targetFtp ? Number.parseInt(targetFtp) : null,
          created_by: createdBy,
        })

        if (error) {
          console.error("Error creating cardio template:", error)
          toast("Failed to create cardio type")
          return
        }

        toast("Cardio type created successfully!")
        router.push("/coach/exercises")
      }
    } catch (error) {
      console.error("Error creating exercise:", error)
      toast("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <AppLink
          href="/coach/exercises"
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Exercise Library
        </AppLink>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Exercise</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Add a new exercise to your library</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create Exercise</CardTitle>
          <CardDescription>Create either a Gym or Cardio template</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v === "cardio" ? "cardio" : "gym")} className="space-y-4">
            <TabsList className="grid grid-cols-2 w-full max-w-xs">
              <TabsTrigger value="gym">Gym</TabsTrigger>
              <TabsTrigger value="cardio">Cardio</TabsTrigger>
            </TabsList>

            <TabsContent value="gym" className="space-y-6">
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
                  <AppLink href="/coach/exercises">Cancel</AppLink>
                </Button>
              </div>
              </form>
            </TabsContent>

            <TabsContent value="cardio" className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cardioName">Cardio Name *</Label>
                  <Input id="cardioName" value={cardioName} onChange={(e) => setCardioName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="intensityType">Intensity Type</Label>
                    <Input id="intensityType" value={intensityType} onChange={(e) => setIntensityType(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                    <Input id="durationMinutes" type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetTss">Target TSS</Label>
                    <Input id="targetTss" type="number" value={targetTss} onChange={(e) => setTargetTss(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetFtp">Target FTP</Label>
                    <Input id="targetFtp" type="number" value={targetFtp} onChange={(e) => setTargetFtp(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Plus className="mr-2 h-4 w-4" />
                    Create Cardio Type
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <AppLink href="/coach/exercises">Cancel</AppLink>
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
