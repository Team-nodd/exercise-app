import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProgramWithDetails } from '@/types'

interface UseProgramsOptions {
  userId?: string
  coachId?: string
  isCoach?: boolean
}

interface ProgramsData {
  programs: ProgramWithDetails[]
  loading: boolean
  error: string | null
  refetch: () => void
}

// Cache for programs data
const programsCache = new Map<string, { data: ProgramWithDetails[]; timestamp: number }>()
const CACHE_DURATION = 3 * 60 * 1000 // 3 minutes

export function usePrograms({ userId, coachId, isCoach = false }: UseProgramsOptions): ProgramsData {
  const [programs, setPrograms] = useState<ProgramWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const cacheKey = `${isCoach ? 'coach' : 'user'}_programs_${userId || coachId}`

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check cache first
      const cached = programsCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 Using cached programs data')
        setPrograms(cached.data)
        setLoading(false)
        return
      }

      console.log(`🔄 Fetching fresh programs data for ${isCoach ? 'coach' : 'user'}:`, userId || coachId)

      let query = supabase
        .from('programs')
        .select(`
          *,
          coach:users!programs_coach_id_fkey(*),
          user:users!programs_user_id_fkey(*),
          workouts(*)
        `)
        .order('created_at', { ascending: false })

      if (isCoach && coachId) {
        query = query.eq('coach_id', coachId)
      } else if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw new Error(`Failed to fetch programs: ${fetchError.message}`)
      }

      if (data) {
        setPrograms(data as ProgramWithDetails[])
        
        // Cache the results
        programsCache.set(cacheKey, {
          data: data as ProgramWithDetails[],
          timestamp: Date.now()
        })
      }

    } catch (error) {
      console.error('❌ Programs fetch error:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch programs')
    } finally {
      setLoading(false)
    }
  }, [userId, coachId, isCoach, supabase, cacheKey])

  const refetch = useCallback(() => {
    // Clear cache and refetch
    programsCache.delete(cacheKey)
    fetchPrograms()
  }, [fetchPrograms, cacheKey])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  return {
    programs,
    loading,
    error,
    refetch
  }
} 