"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Program, ProgramWithDetails } from "@/types"
import { BaseWorkoutManager } from "../base-workout-manger"
// import { BaseWorkoutManager } from "./base-workout-manager"

interface ProgramDetailProps {
  program: ProgramWithDetails
}

export function ProgramDetail({ program }: ProgramDetailProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(program.name)
  const [titleSaving, setTitleSaving] = useState(false)
  const [programs, setPrograms] = useState<Pick<Program, "id" | "name">[]>([])

  const supabase = createClient()
  const router = useRouter()

  // Fetch all programs for this client (for header filter)
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const { data } = await supabase
          .from("programs")
          .select("id, name")
          .eq("user_id", program.user.id)
          .order("created_at", { ascending: false })

        if (data) {
          setPrograms(data)
        }
      } catch {
        // ignore silently
      }
    }

    fetchPrograms()
  }, [program.user.id, supabase])

  const handleTitleSave = async () => {
    if (titleValue.trim() && titleValue !== program.name) {
      setTitleSaving(true)
      const { error } = await supabase.from("programs").update({ name: titleValue.trim() }).eq("id", program.id)

      setTitleSaving(false)
      if (!error) {
        program.name = titleValue.trim()
        toast("Program title updated")
        setEditingTitle(false)
      } else {
        toast("Failed to update title")
      }
    } else {
      setEditingTitle(false)
    }
  }

  const formatProgramDate = (dateString: string | null) => {
    if (!dateString) return "Not set"
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return "Not set"
    const month = d.toLocaleString("en-US", { month: "short" })
    const day = d.toLocaleString("en-US", { day: "2-digit" })
    const year = d.getFullYear()
    return `${month}, ${day}, ${year}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "paused":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const header = (
    <div className="mb-8">
      <Link
        href="/coach/programs"
        className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Programs
      </Link>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {editingTitle ? (
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTitleSave()
                  } else if (e.key === "Escape") {
                    setEditingTitle(false)
                    setTitleValue(program.name)
                  }
                }}
                disabled={titleSaving}
                autoFocus
                className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 px-2 py-1"
              />
            ) : (
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {program.user.name}
                <span className="mx-2">·</span>
                <button
                  className="hover:underline"
                  onClick={() => setEditingTitle(true)}
                  aria-label="Edit program title"
                >
                  {titleValue}
                </button>
              </h1>
            )}
            {program.description && (
              <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm sm:text-base">{program.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatProgramDate(program.start_date)}</span>
              </div>
              <div>
                <span>&#8594;</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatProgramDate(program.end_date)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center self-start">
            {programs.length > 0 && (
              <div className="w-full sm:w-56">
                <Select
                  value={String(program.id)}
                  onValueChange={(value) => {
                    if (Number(value) !== program.id) {
                      router.push(`/coach/programs/${value}`)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name.length > 20 ? p.name.slice(0, 20) + "..." : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Badge className={getStatusColor(program.status)}>
              {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
            </Badge>
            <Button size="sm" href={`/coach/programs/${program.id}/edit`}>
              Edit
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <BaseWorkoutManager userId={program.user.id} programId={program.id} header={header} createDialogProgram={program} />
  )
}
