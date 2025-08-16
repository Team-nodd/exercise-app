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
    recentClients?: User[] 
  }; 
  timestamp: number 
}>()
const CACHE_DURATION = 30 * 1000 // 30s

export function useDashboardData({ userId, coachId, isCoach = false, initialStats, initialUpcomingWorkouts, initialRecentClients }: UseDashboardDataOptions): DashboardData {
  
  const [stats, setStats] = useState<DashboardStats | null>(initialStats ?? null)
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<WorkoutWithDetails[]>(initialUpcomingWorkouts ?? [])
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
    // Compute stats locally
    const programMap = new Map<number, { id: number; status?: string }>()
    for (const w of all) {
      const p = w.program
      if (p) programMap.set(p.id, p)
    }
    const totalPrograms = programMap.size
    const activePrograms = [...programMap.values()].filter(p => p.status === "active").length
    const completedWorkouts = all.filter(w => w.completed).length
    const today = new Date(); today.setHours(0,0,0,0)
    const upcomingWorkoutsCount = all.filter(w => !w.completed && w.scheduled_date && new Date(w.scheduled_date) >= today).length

    const nextStats: DashboardStats = { totalPrograms, activePrograms, completedWorkouts, upcomingWorkouts: upcomingWorkoutsCount, totalClients: 0 }

    setStats(nextStats)
    setUpcomingWorkouts(all as WorkoutWithDetails[])

    dashboardCache.set(cacheKey, { data: { stats: nextStats, upcomingWorkouts: all as WorkoutWithDetails[] }, timestamp: Date.now() })
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
          upcomingWorkouts: []
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
          setRecentClients(cachedNow.data.recentClients || [])
        } else if (initialStats || initialUpcomingWorkouts || initialRecentClients) {
          // Seed cache so other consumers get a hit
          dashboardCache.set(cacheKey, {
            data: {
              stats: initialStats ?? null,
              upcomingWorkouts: initialUpcomingWorkouts ?? [],
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

  // BroadcastChannel fast path: merge changes into local upcomingWorkouts
  useEffect(() => {
    if (!userId) return
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('workouts')
      bc.onmessage = (event) => {
        const msg = event.data as any
        if (!msg || msg.type !== 'updated') return
        // Only apply if message belongs to this user
        if (msg.userId && msg.userId !== userId) return
        setUpcomingWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...msg.changes } as any : w)))
      }
    } catch {
      const handler = (e: StorageEvent) => {
        if (e.key !== 'workout-updated' || !e.newValue) return
        try {
          const msg = JSON.parse(e.newValue)
          if (!msg || msg.type !== 'updated') return
          if (msg.userId && msg.userId !== userId) return
          setUpcomingWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...msg.changes } as any : w)))
        } catch {}
      }
      if (typeof window !== 'undefined') window.addEventListener('storage', handler)
      return () => { if (typeof window !== 'undefined') window.removeEventListener('storage', handler) }
    }
    return () => { try { bc && bc.close() } catch {} }
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
    recentClients,
    loading,
    error,
    refetch,
    refetchQuietly
  }
} 