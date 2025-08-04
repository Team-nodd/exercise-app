import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WorkoutWithDetails } from '@/types'

interface UseWorkoutsOptions {
  userId?: string
  programId?: string
  limit?: number
}

interface WorkoutsData {
  workouts: WorkoutWithDetails[]
  loading: boolean
  error: string | null
  refetch: () => void
}

// Cache for workouts data
const workoutsCache = new Map<string, { data: WorkoutWithDetails[]; timestamp: number }>()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

export function useWorkouts({ userId, programId, limit }: UseWorkoutsOptions): WorkoutsData {
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const cacheKey = `workouts_${userId || 'all'}_${programId || 'all'}_${limit || 'all'}`

  const fetchWorkouts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check cache first
      const cached = workoutsCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 Using cached workouts data')
        setWorkouts(cached.data)
        setLoading(false)
        return
      }

      console.log(`🔄 Fetching fresh workouts data for user:`, userId)

      let query = supabase
        .from('workouts')
        .select(`
          *,
          program:programs(*)
        `)
        .order('scheduled_date', { ascending: true })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (programId) {
        query = query.eq('program_id', programId)
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw new Error(`Failed to fetch workouts: ${fetchError.message}`)
      }

      if (data) {
        setWorkouts(data as WorkoutWithDetails[])
        
        // Cache the results
        workoutsCache.set(cacheKey, {
          data: data as WorkoutWithDetails[],
          timestamp: Date.now()
        })
      }

    } catch (error) {
      console.error('❌ Workouts fetch error:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch workouts')
    } finally {
      setLoading(false)
    }
  }, [userId, programId, limit, supabase, cacheKey])

  const refetch = useCallback(() => {
    // Clear cache and refetch
    workoutsCache.delete(cacheKey)
    fetchWorkouts()
  }, [fetchWorkouts, cacheKey])

  useEffect(() => {
    fetchWorkouts()
  }, [fetchWorkouts])

  return {
    workouts,
    loading,
    error,
    refetch
  }
} 