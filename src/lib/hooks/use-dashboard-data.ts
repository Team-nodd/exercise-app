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
}

// Cache for dashboard data to prevent unnecessary refetches
const dashboardCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useDashboardData({ userId, coachId, isCoach = false }: UseDashboardDataOptions): DashboardData {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<WorkoutWithDetails[]>([])
  const [recentClients, setRecentClients] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const cacheKey = `${isCoach ? 'coach' : 'user'}_${userId || coachId}`

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check cache first
      const cached = dashboardCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 Using cached dashboard data')
        setStats(cached.data.stats)
        setUpcomingWorkouts(cached.data.upcomingWorkouts)
        setRecentClients(cached.data.recentClients || [])
        setLoading(false)
        return
      }

      console.log(`🔄 Fetching fresh dashboard data for ${isCoach ? 'coach' : 'user'}:`, userId || coachId)

      if (isCoach && coachId) {
        await fetchCoachDashboardData(coachId)
      } else if (userId) {
        await fetchUserDashboardData(userId)
      }

    } catch (error) {
      console.error('❌ Dashboard data fetch error:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }, [userId, coachId, isCoach, supabase, cacheKey])

  const fetchUserDashboardData = async (userId: string) => {
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
      const programs = userStats.reduce((acc, workout) => {
        if (workout.program) {
          acc[workout.program.id] = workout.program
        }
        return acc
      }, {} as Record<string, any>)

      const totalPrograms = Object.keys(programs).length
      const activePrograms = Object.values(programs).filter((p: any) => p.status === 'active').length
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
      }

      setStats(stats)

      // Fetch upcoming workouts with program details
      const { data: upcomingWorkoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          *,
          program:programs(*)
        `)
        .eq('program.user_id', userId)
        .eq('completed', false)
        .gte('scheduled_date', today.toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(5)

      if (workoutsError) {
        console.error('Error fetching upcoming workouts:', workoutsError)
      } else if (upcomingWorkoutsData) {
        setUpcomingWorkouts(upcomingWorkoutsData as WorkoutWithDetails[])
      }

      // Cache the results
      dashboardCache.set(cacheKey, {
        data: { stats, upcomingWorkouts: upcomingWorkoutsData || [] },
        timestamp: Date.now()
      })
    }
  }

  const fetchCoachDashboardData = async (coachId: string) => {
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

      const stats: DashboardStats & { totalClients: number } = {
        totalPrograms,
        activePrograms,
        completedWorkouts,
        upcomingWorkouts,
        totalClients,
      }

      setStats(stats)

      // Fetch recent clients
      const clientIds = [...new Set(coachData.map(p => p.user_id))].slice(0, 5)
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('users')
          .select('*')
          .in('id', clientIds)
          .limit(5)

        if (clientsError) {
          console.error('Error fetching recent clients:', clientsError)
        } else if (clientsData) {
          setRecentClients(clientsData)
        }
      }

      // Cache the results
      dashboardCache.set(cacheKey, {
        data: { stats, recentClients: recentClients },
        timestamp: Date.now()
      })
    }
  }

  const refetch = useCallback(() => {
    // Clear cache and refetch
    dashboardCache.delete(cacheKey)
    fetchDashboardData()
  }, [fetchDashboardData, cacheKey])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return {
    stats,
    upcomingWorkouts,
    recentClients,
    loading,
    error,
    refetch
  }
} 