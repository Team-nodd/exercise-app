import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, DashboardStats, WorkoutWithDetails } from '@/types'

interface UseDashboardDataOptions {
  userId?: string
  coachId?: string
  isCoach?: boolean
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
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useDashboardData({ userId, coachId, isCoach = false }: UseDashboardDataOptions): DashboardData {
  
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<WorkoutWithDetails[]>([])
  const [recentClients, setRecentClients] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const cacheKey = `${isCoach ? 'coach' : 'user'}_${userId || coachId}`

  // Define fetch helpers before usage to satisfy linter and avoid use-before-declare
  const fetchUserDashboardData = useCallback(async (userId: string) => {
    // Optimized single query for user stats
    const { data: userStats, error: statsError } = await supabase
      .from('workouts')
      .select(`
        id,
        completed,
        scheduled_date,
        program:programs!inner(
          id,
          status,
          user_id
        )
      `)
      .eq('program.user_id', userId)

    if (statsError) {
      throw new Error(`Failed to fetch user stats: ${statsError.message}`)
    }

    if (userStats) {
      const programMap = userStats.reduce((acc, workout) => {
        if (workout.program) {
          const prog = workout.program as unknown as { id: number; status: string; user_id: string }
          acc[String(prog.id)] = prog
        }
        return acc
      }, {} as Record<string, { id: number; status: string; user_id: string }>)

      const totalPrograms = Object.keys(programMap).length
      const activePrograms = Object.values(programMap).filter((p) => p.status === 'active').length
      const completedWorkouts = userStats.filter(w => w.completed).length
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const upcomingWorkoutsCount = userStats.filter(
        w => !w.completed && w.scheduled_date && new Date(w.scheduled_date) >= today
      ).length

      const stats: DashboardStats = {
        totalPrograms,
        activePrograms,
        completedWorkouts,
        upcomingWorkouts: upcomingWorkoutsCount,
        totalClients: 0, // Users don't have clients
      }

      setStats(stats)

      // Fetch ALL workouts with program details (not just upcoming)
      const { data: allWorkoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          *,
          program:programs(*)
        `)
        .eq('program.user_id', userId)
        .order('scheduled_date', { ascending: true, nullsFirst: false })

      if (workoutsError) {
        console.error('Error fetching workouts:', workoutsError)
      } else if (allWorkoutsData) {
        setUpcomingWorkouts(allWorkoutsData as WorkoutWithDetails[])
      }

      // Cache the results
      dashboardCache.set(cacheKey, {
        data: { stats, upcomingWorkouts: allWorkoutsData || [] },
        timestamp: Date.now()
      })
    }
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
        setLoading(true)
        setError(null)
        const cached = dashboardCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          setStats(cached.data.stats)
          setUpcomingWorkouts(cached.data.upcomingWorkouts)
          setRecentClients(cached.data.recentClients || [])
        } else if (isCoach && coachId) {
          await fetchCoachDashboardData(coachId)
        } else if (userId) {
          await fetchUserDashboardData(userId)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [cacheKey, isCoach, coachId, userId, fetchCoachDashboardData, fetchUserDashboardData])

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