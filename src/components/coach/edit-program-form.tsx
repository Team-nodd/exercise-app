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
import { Loader2, ArrowLeft, AlertTriangle, Trash2 } from "lucide-react"
import Link from "next/link"
import type { User, ProgramWithDetails } from "@/types"

interface EditProgramFormProps {
  program: ProgramWithDetails
}

export function EditProgramForm({ program }: EditProgramFormProps) {
  const [name, setName] = useState(program.name)
  const [description, setDescription] = useState(program.description || "")
  const [userId, setUserId] = useState(program.user_id)
  const [startDate, setStartDate] = useState(program.start_date || "")
  const [endDate, setEndDate] = useState(program.end_date || "")
  const [status, setStatus] = useState<"draft" | "active" | "paused" | "completed">(program.status)
  const [clients, setClients] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const router = useRouter()
  // const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const fetchClients = async () => {
      try {
        // Get all users with role 'user' (clients)
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("role", "user")
          .order("name", { ascending: true })

        if (error) {
          console.error("Error fetching clients:", error)
          toast("Failed to load clients")
          return
        }

        setClients(data || [])
      } catch (error) {
        console.error("Error fetching clients:", error)
      } finally {
        setLoadingClients(false)
      }
    }

    fetchClients()
  }, [supabase, toast])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      // First, delete all workout exercises for workouts in this program
      const { data: workouts } = await supabase.from("workouts").select("id").eq("program_id", program.id)

      if (workouts && workouts.length > 0) {
        const workoutIds = workouts.map((w) => w.id)
        await supabase.from("workout_exercises").delete().in("workout_id", workoutIds)
      }

      // Then delete all workouts in this program
      await supabase.from("workouts").delete().eq("program_id", program.id)

      // Finally, delete the program
      const { error } = await supabase.from("programs").delete().eq("id", program.id)

      if (error) {
        console.error("Error deleting program:", error)
        toast("Failed to delete program")
        return
      }

      toast("Program deleted successfully")

      router.push("/coach/programs")
    } catch (error) {
      console.error("Error deleting program:", error)
      toast("An unexpected error occurred")
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from("programs")
        .update({
          name,
          description: description || null,
          user_id: userId,
          start_date: startDate || null,
          end_date: endDate || null,
          status,
        })
        .eq("id", program.id)

      if (error) {
        console.error("Error updating program:", error)
        toast("Failed to update program")
        return
      }

      toast( "Program updated successfully!")

      router.push(`/coach/programs/${program.id}`)
    } catch (error) {
      console.error("Error updating program:", error)
      toast( "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (loadingClients) {
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
          href={`/coach/programs/${program.id}`}
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {program.name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Program</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Editing <strong>{program.name}</strong> for {program.user.name}
            </p>
          </div>
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Program
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Card className="mb-8 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Program
            </CardTitle>
            <CardDescription>
              Are you sure you want to delete this program? This action cannot be undone and will remove all associated
              workouts and exercises. The client will lose access to this program.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Delete Program
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
          <CardDescription>Update the program information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Program Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 12-Week Strength Building Program"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the program goals and approach..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Assign to Client *</Label>
              <Select value={userId} onValueChange={setUserId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients.length === 0 && (
                <p className="text-sm text-muted-foreground">No clients found. Users need to register first.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value: "draft" | "active" | "paused" | "completed") => setStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || !userId}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Program
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/coach/programs/${program.id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
