"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calendar, ArrowLeft, CalendarPlus, CalendarMinus, AlertTriangle, Clock, CalendarDays, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Program, ProgramWithDetails } from "@/types"
import { BaseWorkoutManager } from "../base-workout-manger"
// import { BaseWorkoutManager } from "./base-workout-manager"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

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
  const [shifting, setShifting] = useState(false)
  const [showShiftConfirm, setShowShiftConfirm] = useState(false)
  const [shiftDirection, setShiftDirection] = useState<"forward" | "backward" | null>(null)
  const [shiftType, setShiftType] = useState<"month" | "week" | "day" | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

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
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
               <DropdownMenuTrigger asChild>
                 <Button size="sm" variant="outline" disabled={shifting}>
                   <Calendar className="h-4 w-4 mr-1" />
                   {shifting ? "Shifting..." : "Shift"}
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="start" className="w-56">
                 <DropdownMenuItem
                   onClick={() => { 
                     setShiftDirection("forward"); 
                     setShiftType("month"); 
                     setShowShiftConfirm(true);
                     setDropdownOpen(false);
                   }}
                   className="cursor-pointer"
                 >
                   <CalendarPlus className="h-4 w-4 mr-2" /> Next month
                 </DropdownMenuItem>
                 <DropdownMenuItem
                   onClick={() => { 
                     setShiftDirection("backward"); 
                     setShiftType("month"); 
                     setShowShiftConfirm(true);
                     setDropdownOpen(false);
                   }}
                   className="cursor-pointer"
                 >
                   <CalendarMinus className="h-4 w-4 mr-2" /> Previous month
                 </DropdownMenuItem>
                 <DropdownMenuItem
                   onClick={() => { 
                     setShiftDirection("forward"); 
                     setShiftType("week"); 
                     setShowShiftConfirm(true);
                     setDropdownOpen(false);
                   }}
                   className="cursor-pointer"
                 >
                   <CalendarDays className="h-4 w-4 mr-2" /> Next week
                 </DropdownMenuItem>
                 <DropdownMenuItem
                   onClick={() => { 
                     setShiftDirection("backward"); 
                     setShiftType("week"); 
                     setShowShiftConfirm(true);
                     setDropdownOpen(false);
                   }}
                   className="cursor-pointer"
                 >
                   <CalendarDays className="h-4 w-4 mr-2" /> Previous week
                 </DropdownMenuItem>
                 <DropdownMenuItem
                   onClick={() => { 
                     setShiftDirection("forward"); 
                     setShiftType("day"); 
                     setShowShiftConfirm(true);
                     setDropdownOpen(false);
                   }}
                   className="cursor-pointer"
                 >
                   <ArrowRight className="h-4 w-4 mr-2" /> Next day
                 </DropdownMenuItem>
                 <DropdownMenuItem
                   onClick={() => { 
                     setShiftDirection("backward"); 
                     setShiftType("day"); 
                     setShowShiftConfirm(true);
                     setDropdownOpen(false);
                   }}
                   className="cursor-pointer"
                 >
                   <ArrowLeft className="h-4 w-4 mr-2" /> Previous day
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
            <Button size="sm" href={`/coach/programs/${program.id}/edit`}>
              Edit
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const handleConfirmShift = async () => {
    // Close dialog immediately when user confirms
    setShowShiftConfirm(false)
    setShiftDirection(null)
    setShiftType(null)
    
    try {
      setShifting(true)
      const delta = shiftDirection === "backward" ? -1 : 1
      
      // 1) Fetch workouts with scheduled_date
      const { data: workouts, error } = await supabase
        .from("workouts")
        .select("id, scheduled_date")
        .eq("program_id", program.id)

      if (error) {
        toast("Failed to fetch workouts for shifting")
        return
      }

      const items = (workouts || []).filter((w: any) => !!w.scheduled_date)
      // Broadcast so calendar updates instantly
      let bc: BroadcastChannel | null = null
      try { bc = new BroadcastChannel('workouts') } catch {}
      
      for (const w of items as any[]) {
        const d = new Date(w.scheduled_date as string)
        const newDate = new Date(d)
        
        // Apply shift based on type
        switch (shiftType) {
          case "month":
            newDate.setDate(newDate.getDate() + (delta * 30)) // 30 days for month
            break
          case "week":
            newDate.setDate(newDate.getDate() + (delta * 7))
            break
          case "day":
            newDate.setDate(newDate.getDate() + delta)
            break
          default:
            newDate.setDate(newDate.getDate() + (delta * 30)) // fallback to 30 days
        }
        
        // Ensure time component preserved; store as ISO date string
        const iso = newDate.toISOString()
        const { error: upErr } = await supabase.from("workouts").update({ scheduled_date: iso }).eq("id", w.id)
        if (!upErr) {
          // Notify local calendar and other tabs
          const msg = { type: 'updated', workoutId: w.id, changes: { scheduled_date: iso } }
          try { bc?.postMessage(msg) } catch {}
          try { localStorage.setItem('workout-updated', JSON.stringify(msg)); localStorage.removeItem('workout-updated') } catch {}
        }
      }
      try { bc?.close() } catch {}

      // Optionally shift program start/end if set
      const updates: Record<string, string | null> = {}
      if (program.start_date) {
        const ds = new Date(program.start_date)
        switch (shiftType) {
          case "month":
            ds.setDate(ds.getDate() + (delta * 30)) // 30 days for month
            break
          case "week":
            ds.setDate(ds.getDate() + (delta * 7))
            break
          case "day":
            ds.setDate(ds.getDate() + delta)
            break
          default:
            ds.setDate(ds.getDate() + (delta * 30)) // fallback to 30 days
        }
        updates.start_date = ds.toISOString()
      }
      if (program.end_date) {
        const de = new Date(program.end_date)
        switch (shiftType) {
          case "month":
            de.setDate(de.getDate() + (delta * 30)) // 30 days for month
            break
          case "week":
            de.setDate(de.getDate() + (delta * 7))
            break
          case "day":
            de.setDate(de.getDate() + delta)
            break
          default:
            de.setDate(de.getDate() + (delta * 30)) // fallback to 30 days
        }
        updates.end_date = de.toISOString()
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from("programs").update(updates).eq("id", program.id)
      }

      toast(`All workouts shifted by one ${shiftType} ${delta > 0 ? 'forward' : 'backward'}`)
      // Refresh view
      router.refresh()
    } catch (e) {
      toast("Unexpected error while shifting workouts")
    } finally {
      setShifting(false)
    }
  }

  return (
    <>
      <Dialog open={showShiftConfirm} onOpenChange={(open) => {
        if (!open) {
          setShowShiftConfirm(false)
          setShiftDirection(null)
          setShiftType(null)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              {shiftDirection === 'backward' 
                ? `Shift all workouts to previous ${shiftType}?` 
                : `Shift all workouts to next ${shiftType}?`}
            </DialogTitle>
            <DialogDescription className="text-yellow-900/80 dark:text-yellow-100/80">
              {shiftDirection === 'backward'
                ? `This will move every scheduled workout in this program back by one ${shiftType}.`
                : `This will move every scheduled workout in this program forward by one ${shiftType}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button variant="destructive" onClick={handleConfirmShift} disabled={shifting}>
              {shifting ? "Shifting..." : "Yes, shift"}
            </Button>
            <Button variant="outline" onClick={() => { setShowShiftConfirm(false); setShiftDirection(null); setShiftType(null) }} disabled={shifting}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BaseWorkoutManager userId={program.user.id} programId={program.id} header={header} createDialogProgram={program} />
    </>
  )
}

// Shift confirm dialog using proper Dialog component for better UX
