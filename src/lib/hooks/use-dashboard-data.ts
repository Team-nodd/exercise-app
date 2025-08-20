import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, DashboardStats, WorkoutWithDetails } from '@/types'
import type { Database } from "@/types/database"

type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"]
type ProgramRow = Database["public"]["Tables"]["programs"]["Row"]
type WorkoutWithProgram = WorkoutRow & { program: ProgramRow | null }

interface UseDashboardDataOptions {
  userId?: string
  coachId?: string
  isCoach?: boolean
  initialStats?: DashboardStats
  initialUpcomingWorkouts?: WorkoutWithDetails[]
  initialRecentClients?: User[]
}

interface DashboardData {
  stats: DashboardStats | null
  upcomingWorkouts: WorkoutWithDetails[]
  allWorkouts: WorkoutWithDetails[] // Add this for calendar
  recentClients?: User[]
  loading: boolean
  error: string | null
  refetch: () => void
  refetchQuietly: () => void
}

// Cache for dashboard data to prevent unnecessary refetches
const dashboardCache = new Map<string, { 
  data: { 
    stats: DashboardStats | null; 
    upcomingWorkouts: WorkoutWithDetails[]; 
    allWorkouts: WorkoutWithDetails[]; // Add this
    recentClients?: User[] 
  }; 
  timestamp: number 
}>()

const CACHE_DURATION = 30 * 1000 // 30s

export function useDashboardData({ userId, coachId, isCoach = false, initialStats, initialUpcomingWorkouts, initialRecentClients }: UseDashboardDataOptions): DashboardData {
  
  const [stats, setStats] = useState<DashboardStats | null>(initialStats ?? null)
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<WorkoutWithDetails[]>(initialUpcomingWorkouts ?? [])
  const [allWorkouts, setAllWorkouts] = useState<WorkoutWithDetails[]>(initialUpcomingWorkouts ?? []) // Add this
  const [recentClients, setRecentClients] = useState<User[]>(initialRecentClients ?? [])
  // If any initial data is provided, start as not loading to avoid layout shift
  const [loading, setLoading] = useState(!(initialStats || initialUpcomingWorkouts || initialRecentClients))
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const cacheKey = `${isCoach ? 'coach' : 'user'}_${userId || coachId}`

  // Define fetch helpers before usage to satisfy linter and avoid use-before-declare
  const fetchUserDashboardData = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("workouts")
      .select(`
        *,
        program:programs!workouts_program_id_fkey(id, name, status, user_id)
      `)
      .eq("program.user_id", uid)
      .order("scheduled_date", { ascending: true, nullsFirst: false })

    if (error) throw new Error(`Failed to fetch user data: ${error.message}`)

    const all = (data ?? []) as WorkoutWithProgram[]
    
    // Store all workouts for calendar
    setAllWorkouts(all as WorkoutWithDetails[])
    
    // Filter to only show upcoming workouts (not completed and not in the past)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const upcomingWorkouts = all.filter(workout => {
      // Skip completed workouts
      if (workout.completed) return false
      
      // Skip workouts without scheduled dates
      if (!workout.scheduled_date) return false
      
      // Skip past workouts (before today)
      const workoutDate = new Date(workout.scheduled_date)
      return workoutDate >= today
    })
    
    // Sort upcoming workouts: today's first, then chronologically
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const sortedUpcomingWorkouts = upcomingWorkouts.sort((a, b) => {
      const aDate = new Date(a.scheduled_date!)
      const bDate = new Date(b.scheduled_date!)
      
      const aIsToday = aDate >= today && aDate < tomorrow
      const bIsToday = bDate >= today && bDate < tomorrow
      
      // Today's workouts come first
      if (aIsToday && !bIsToday) return -1
      if (!aIsToday && bIsToday) return 1
      
      // If both are today or both are not today, sort by date
      return aDate.getTime() - bDate.getTime()
    })
    
    // Compute stats locally using all workouts (not just upcoming)
    const programMap = new Map<number, { id: number; status?: string }>()
    for (const w of all) {
      const p = w.program
      if (p) programMap.set(p.id, p)
    }
    const totalPrograms = programMap.size
    const activePrograms = [...programMap.values()].filter(p => p.status === "active").length
    const completedWorkouts = all.filter(w => w.completed).length
    const upcomingWorkoutsCount = upcomingWorkouts.length

    const nextStats: DashboardStats = { totalPrograms, activePrograms, completedWorkouts, upcomingWorkouts: upcomingWorkoutsCount, totalClients: 0 }

    setStats(nextStats)
    setUpcomingWorkouts(sortedUpcomingWorkouts as WorkoutWithDetails[])

    dashboardCache.set(cacheKey, { 
      data: { 
        stats: nextStats, 
        upcomingWorkouts: sortedUpcomingWorkouts as WorkoutWithDetails[],
        allWorkouts: all as WorkoutWithDetails[]
      }, 
      timestamp: Date.now() 
    })
  }, [supabase, cacheKey])

  const fetchCoachDashboardData = useCallback(async (coachId: string) => {
    // Optimized query for coach stats
    const { data: coachData, error: coachError } = await supabase
      .from('programs')
      .select(`
        id,
        status,
        user_id,
        workouts(
          id,
          completed,
          scheduled_date
        )
      `)
      .eq('coach_id', coachId)

    if (coachError) {
      throw new Error(`Failed to fetch coach data: ${coachError.message}`)
    }

    if (coachData) {
      const totalPrograms = coachData.length
      const activePrograms = coachData.filter(p => p.status === 'active').length
      const totalClients = new Set(coachData.map(p => p.user_id)).size
      
      const allWorkouts = coachData.flatMap(p => p.workouts || [])
      const completedWorkouts = allWorkouts.filter(w => w.completed).length
      
      const today = new Date()
      const upcomingWorkouts = allWorkouts.filter(
        w => !w.completed && w.scheduled_date && new Date(w.scheduled_date) >= today
      ).length

      const stats: DashboardStats = {
        totalPrograms,
        activePrograms,
        completedWorkouts,
        upcomingWorkouts,
        totalClients,
      }

      setStats(stats)

      // Fetch recent clients
      const clientIds = [...new Set(coachData.map(p => p.user_id))].slice(0, 5)
      let clientsData: User[] = []
      if (clientIds.length > 0) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .in('id', clientIds)
          .limit(5)
        if (!error && data) {
          clientsData = data
          setRecentClients(data)
        }
      }
      // Cache the results AFTER clientsData is available
      dashboardCache.set(cacheKey, {
        data: {
          stats,
          recentClients: clientsData,
          upcomingWorkouts: [],
          allWorkouts: []
        },
        timestamp: Date.now()
      })
    }
  }, [supabase, cacheKey])

  

  const refetch = useCallback(async () => {
    // Clear cache and refetch
    dashboardCache.delete(cacheKey)
    // Non-silent fetch
    try {
      setLoading(true)
      setError(null)
      if (isCoach && coachId) {
        await fetchCoachDashboardData(coachId)
      } else if (userId) {
        await fetchUserDashboardData(userId)
      }
    } finally {
      setLoading(false)
    }
  }, [cacheKey, isCoach, coachId, userId, fetchCoachDashboardData, fetchUserDashboardData])

  const refetchQuietly = useCallback(async () => {
    dashboardCache.delete(cacheKey)
    try {
      // Silent fetch
      if (isCoach && coachId) {
        await fetchCoachDashboardData(coachId)
      } else if (userId) {
        await fetchUserDashboardData(userId)
      }
    } catch {
      // ignore
    }
  }, [cacheKey, isCoach, coachId, userId, fetchCoachDashboardData, fetchUserDashboardData])

  useEffect(() => {
    // Initial load (non-silent)
    ;(async () => {
      try {
        // Don't force loading if we already have initial data or cache
        const cached = dashboardCache.get(cacheKey)
        if (!(cached || initialStats || initialUpcomingWorkouts || initialRecentClients)) {
          setLoading(true)
        }
        setError(null)
        // refresh cached reference after possible setLoading
        const cachedNow = dashboardCache.get(cacheKey)
        if (cachedNow && Date.now() - cachedNow.timestamp < CACHE_DURATION) {
          setStats(cachedNow.data.stats)
          setUpcomingWorkouts(cachedNow.data.upcomingWorkouts)
          setAllWorkouts(cachedNow.data.allWorkouts)
          setRecentClients(cachedNow.data.recentClients || [])
        } else if (initialStats || initialUpcomingWorkouts || initialRecentClients) {
          // Seed cache so other consumers get a hit
          dashboardCache.set(cacheKey, {
            data: {
              stats: initialStats ?? null,
              upcomingWorkouts: initialUpcomingWorkouts ?? [],
              allWorkouts: initialUpcomingWorkouts ?? [],
              recentClients: initialRecentClients ?? [],
            },
            timestamp: Date.now(),
          })
        } else if (isCoach && coachId) {
          await fetchCoachDashboardData(coachId)
        } else if (userId) {
          await fetchUserDashboardData(userId)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [cacheKey, isCoach, coachId, userId, fetchCoachDashboardData, fetchUserDashboardData, initialStats, initialUpcomingWorkouts, initialRecentClients])

  // If the identity (userId/coachId) changes between renders, clear cache and local state to avoid stale data
  useEffect(() => {
    // Clear all dashboard cache to be safe across views
    dashboardCache.clear()
    // Reset local state to empty to avoid flashing previous user's data
    setStats(null)
    setUpcomingWorkouts([])
    setAllWorkouts([])
    setRecentClients([])
    
    // Only trigger refresh if we have valid credentials
    if (!userId && !coachId) {
      setLoading(false)
      return
    }
    
    // Trigger a silent refresh for the new identity
    ;(async () => {
      try {
        if (isCoach && coachId) {
          await fetchCoachDashboardData(coachId)
        } else if (userId) {
          await fetchUserDashboardData(userId)
        }
      } catch {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, coachId])

  // Listen for realtime workout changes for users to invalidate cache quickly
  useEffect(() => {
    if (isCoach || !userId) return
    const channel = supabase
      .channel(`workouts_user_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workouts', filter: `user_id=eq.${userId}` },
        () => {
          dashboardCache.delete(cacheKey)
          refetchQuietly()
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isCoach, userId, supabase, cacheKey, refetchQuietly])

  // BroadcastChannel fast path: merge changes into local upcomingWorkouts (updated/created/deleted)
  useEffect(() => {
    if (!userId) return
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('workouts')
      bc.onmessage = (event) => {
        const msg = event.data as any
        if (!msg || !msg.type) return
        if (msg.userId && msg.userId !== userId) return
        if (msg.type === 'updated') {
          setUpcomingWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...(msg.changes || {}) } as any : w)))
          setAllWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...(msg.changes || {}) } as any : w)))
        } else if (msg.type === 'created' && msg.record) {
          const rec = msg.record as any
          if (rec.user_id === userId) {
            setUpcomingWorkouts((prev) => (prev.some((w) => w.id === rec.id) ? prev : [...prev, rec]))
            setAllWorkouts((prev) => (prev.some((w) => w.id === rec.id) ? prev : [...prev, rec]))
          }
        } else if (msg.type === 'deleted') {
          setUpcomingWorkouts((prev) => prev.filter((w) => w.id !== msg.workoutId))
          setAllWorkouts((prev) => prev.filter((w) => w.id !== msg.workoutId))
        }
      }
    } catch {
              const handler = (e: StorageEvent) => {
        if (e.key !== 'workout-updated' || !e.newValue) return
        try {
          const msg = JSON.parse(e.newValue)
          if (!msg || !msg.type) return
          if (msg.userId && msg.userId !== userId) return
          if (msg.type === 'updated') {
            setUpcomingWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...(msg.changes || {}) } as any : w)))
            setAllWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...(msg.changes || {}) } as any : w)))
          } else if (msg.type === 'created' && msg.record) {
            const rec = msg.record as any
            if (rec.user_id === userId) {
              setUpcomingWorkouts((prev) => (prev.some((w) => w.id === rec.id) ? prev : [...prev, rec]))
              setAllWorkouts((prev) => (prev.some((w) => w.id === rec.id) ? prev : [...prev, rec]))
            }
          } else if (msg.type === 'deleted') {
            setUpcomingWorkouts((prev) => prev.filter((w) => w.id !== msg.workoutId))
            setAllWorkouts((prev) => prev.filter((w) => w.id !== msg.workoutId))
          }
        } catch {}
      }
      if (typeof window !== 'undefined') window.addEventListener('storage', handler)
      return () => { if (typeof window !== 'undefined') window.removeEventListener('storage', handler) }
    }
    return () => { try { bc && bc.close() } catch {} }
  }, [userId])

  // Supabase broadcast fast path: created/updated/deleted
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('workouts-live')
      .on('broadcast', { event: 'workout-updated' }, (payload: any) => {
        const msg = (payload && (payload.payload || payload)) as any
        if (!msg || !msg.type) return
        if (msg.userId && msg.userId !== userId) return
        if (msg.type === 'updated') {
          setUpcomingWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...(msg.changes || {}) } as any : w)))
          setAllWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...(msg.changes || {}) } as any : w)))
        } else if (msg.type === 'created' && msg.record) {
          const rec = msg.record as any
          if (rec.user_id === userId) {
            setUpcomingWorkouts((prev) => (prev.some((w) => w.id === rec.id) ? prev : [...prev, rec]))
            setAllWorkouts((prev) => (prev.some((w) => w.id === rec.id) ? prev : [...prev, rec]))
          }
        } else if (msg.type === 'deleted') {
          setUpcomingWorkouts((prev) => prev.filter((w) => w.id !== msg.workoutId))
          setAllWorkouts((prev) => prev.filter((w) => w.id !== msg.workoutId))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId])

  // On mount, replay any queued optimistic updates written by workout detail pages
  useEffect(() => {
    if (!userId) return
    try {
      const raw = localStorage.getItem('workout-updates-queue')
      if (!raw) return
      const queue = JSON.parse(raw)
      if (!Array.isArray(queue)) return
      const toApply = queue.filter((m: any) => m && m.type === 'updated' && (!m.userId || m.userId === userId))
      if (toApply.length === 0) return
      setUpcomingWorkouts((prev) => {
        let next = prev
        for (const m of toApply) {
          next = next.map((w) => (w.id === m.workoutId ? { ...w, ...(m.changes || {}) } as any : w))
        }
        return next
      })
      setAllWorkouts((prev) => {
        let next = prev
        for (const m of toApply) {
          next = next.map((w) => (w.id === m.workoutId ? { ...w, ...(m.changes || {}) } as any : w))
        }
        return next
      })
      localStorage.removeItem('workout-updates-queue')
    } catch {}
  }, [userId])

  useEffect(() => {
    if (!isCoach || !coachId) return
    const channel = supabase
      .channel(`coach_programs_${coachId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'programs', filter: `coach_id=eq.${coachId}` },
        () => {
          dashboardCache.delete(cacheKey)
          refetchQuietly()
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isCoach, coachId, supabase, cacheKey, refetchQuietly])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetchQuietly()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refetchQuietly])

  return {
    stats,
    upcomingWorkouts,
    allWorkouts, // Add this to the return object
    recentClients,
    loading,
    error,
    refetch,
    refetchQuietly
  }
} 