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
// import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { User } from "@/types"
import { AppLink } from "../ui/app-link"
import { LoadingProvider, useGlobalLoading } from "../providers/loading-provider"

interface CreateProgramFormProps {
  coachId: string
}

export function CreateProgramForm({ coachId }: CreateProgramFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [userId, setUserId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [status, setStatus] = useState<"draft" | "active">("draft")
  const [clients, setClients] = useState<User[]>([])
  // const [loading, setLoading] = useState(false)
  const {loading, setLoading} = useGlobalLoading()
  const [loadingClients, setLoadingClients] = useState(true)

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
          // toast({
          //   title: "Error",
          //   description: "Failed to load clients",
          //   variant: "destructive",
          // })
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
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("programs")
        .insert({
          name,
          description: description || null,
          coach_id: coachId,
          user_id: userId,
          start_date: startDate || null,
          end_date: endDate || null,
          status,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating program:", error)
        // toast({
        //   title: "Error",
        //   description: "Failed to create program",
        //   variant: "destructive",
        // })
        return
      }

      // toast({
      //   title: "Success",
      //   description: "Program created successfully!",
      // })

      router.push(`/coach/programs/${data.id}`)
    } catch (error) {
      console.error("Error creating program:", error)
      // toast({
      //   title: "Error",
      //   description: "An unexpected error occurred",
      //   variant: "destructive",
      // })
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <AppLink
          href="/coach/programs"
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Programs
        </AppLink>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Program</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Design a personalized fitness program for your client</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
          <CardDescription>Fill in the basic information for the new program</CardDescription>
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
              <Select value={status} onValueChange={(value: "draft" | "active") => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || !userId}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Program
              </Button>
              <Button type="button" variant="outline" asChild>
                <AppLink href="/coach/programs">Cancel</AppLink>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
