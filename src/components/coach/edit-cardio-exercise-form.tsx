"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import type { CardioExercise } from "@/types"

interface EditCardioExerciseFormProps {
  cardioId: string
}

export function EditCardioExerciseForm({ cardioId }: EditCardioExerciseFormProps) {
  const [cardio, setCardio] = useState<CardioExercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: "",
    intensity_type: "",
    duration_minutes: "" as string | "",
    target_tss: "" as string | "",
    target_ftp: "" as string | "",
  })

  useEffect(() => {
    const fetchCardio = async () => {
      try {
        const { data, error } = await supabase
          .from("cardio_exercises")
          .select("*")
          .eq("id", cardioId)
          .single()

        if (error) {
          console.error("Error fetching cardio exercise:", error)
          toast("Failed to load cardio type details")
          return
        }

        setCardio(data as CardioExercise)
        setFormData({
          name: data?.name ?? "",
          intensity_type: data?.intensity_type ?? "",
          duration_minutes: data?.duration_minutes != null ? String(data.duration_minutes) : "",
          target_tss: data?.target_tss != null ? String(data.target_tss) : "",
          target_ftp: data?.target_ftp != null ? String(data.target_ftp) : "",
        })
      } catch (error) {
        console.error("Error fetching cardio exercise:", error)
        toast("Failed to load cardio type details")
      } finally {
        setLoading(false)
      }
    }

    fetchCardio()
  }, [cardioId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const duration = formData.duration_minutes === "" ? null : Number(formData.duration_minutes)
    const tss = formData.target_tss === "" ? null : Number(formData.target_tss)
    const ftp = formData.target_ftp === "" ? null : Number(formData.target_ftp)

    try {
      const { error } = await supabase
        .from("cardio_exercises")
        .update({
          name: formData.name,
          intensity_type: formData.intensity_type || null,
          duration_minutes: Number.isNaN(duration) ? null : duration,
          target_tss: Number.isNaN(tss) ? null : tss,
          target_ftp: Number.isNaN(ftp) ? null : ftp,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cardioId)

      if (error) {
        console.error("Error updating cardio type:", error)
        toast("Failed to update cardio type")
        return
      }

      toast("Cardio type updated successfully")
      router.push("/coach/exercises")
    } catch (error) {
      console.error("Error updating cardio type:", error)
      toast("Failed to update cardio type")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this cardio type? This action cannot be undone.")) {
      return
    }

    setDeleting(true)

    try {
      const { error } = await supabase.from("cardio_exercises").delete().eq("id", cardioId)

      if (error) {
        console.error("Error deleting cardio type:", error)
        toast("Failed to delete cardio type")
        return
      }

      toast("Cardio type deleted successfully")
      router.push("/coach/exercises")
    } catch (error) {
      console.error("Error deleting cardio type:", error)
      toast("Failed to delete cardio type")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading cardio type...</div>
  }

  if (!cardio) {
    return <div className="text-center">Cardio type not found</div>
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
          {deleting ? "Deleting..." : "Delete Cardio Type"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cardio Type Details</CardTitle>
          <CardDescription>Update the cardio template information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Zone 2 Endurance"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intensity">Intensity Type</Label>
                <Input
                  id="intensity"
                  value={formData.intensity_type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, intensity_type: e.target.value }))}
                  placeholder="e.g., HR Zone, RPE, Power"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  inputMode="numeric"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                  placeholder="e.g., 45"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tss">Target TSS</Label>
                <Input
                  id="tss"
                  inputMode="numeric"
                  value={formData.target_tss}
                  onChange={(e) => setFormData((prev) => ({ ...prev, target_tss: e.target.value }))}
                  placeholder="e.g., 60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ftp">Target FTP</Label>
                <Input
                  id="ftp"
                  inputMode="numeric"
                  value={formData.target_ftp}
                  onChange={(e) => setFormData((prev) => ({ ...prev, target_ftp: e.target.value }))}
                  placeholder="e.g., 220"
                />
              </div>
            </div>

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

