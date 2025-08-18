import type { TrainerRoadActivitiesResponse, TrainerRoadActivity } from './types'

export class TrainerRoadAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message)
    this.name = 'TrainerRoadAPIError'
  }
}

export interface TrainerRoadAuthCredentials {
  email: string
  password: string
}

export interface TrainerRoadAuthResponse {
  success: boolean
  message: string
  sessionCookies?: string[]
}

export interface TrainerRoadLoginTokenResponse {
  success: boolean
  token: string
  cookies: string[]
}

export class TrainerRoadClient {
  // Direct TrainerRoad endpoints
  private readonly trainerRoadBaseUrl = 'https://www.trainerroad.com'
  private readonly proxyBaseUrl = '/api/trainerroad'
  
  constructor(private readonly timeout = 30000) {}

  /**
   * Authenticate with TrainerRoad using direct backend request to TrainerRoad
   */
  async authenticate(credentials: TrainerRoadAuthCredentials): Promise<TrainerRoadAuthResponse> {
    try {
      console.log('🔄 TRAINERROAD: Authenticating via direct backend request to TrainerRoad')
      
      const response = await fetch(`${this.proxyBaseUrl}/auth/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new TrainerRoadAPIError(
          result.message || 'Authentication failed',
          response.status
        )
      }

      console.log('✅ TRAINERROAD: Direct authentication successful')
      return result

    } catch (error) {
      console.error('❌ TRAINERROAD: Authentication failed:', error)
      if (error instanceof TrainerRoadAPIError) {
        throw error
      }
      throw new TrainerRoadAPIError(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Check if user has valid TrainerRoad session
   */
  async checkAuthStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.proxyBaseUrl}/auth/status`)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Sign out from TrainerRoad
   */
  async signOut(): Promise<void> {
    try {
      await fetch(`${this.proxyBaseUrl}/auth/signout`, { method: 'POST' })
      console.log('✅ TRAINERROAD: Signed out successfully')
    } catch (error) {
      console.error('❌ TRAINERROAD: Sign out failed:', error)
    }
  }

  /**
   * Fetch recent activities for the authenticated user
   * @param limit Number of activities to fetch (default: 20, max: 50)
   */
  async getRecentActivities(limit = 20): Promise<TrainerRoadActivity[]> {
    if (limit > 50) {
      throw new TrainerRoadAPIError('Limit cannot exceed 50 activities')
    }

    try {
      console.log('🔄 TRAINERROAD: Fetching recent activities')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(`${this.proxyBaseUrl}/activities/recent?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
        credentials: 'include', // Include cookies for authentication
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 401) {
          throw new TrainerRoadAPIError(
            'Not authenticated with TrainerRoad. Please sign in first.',
            401
          )
        }
        
        if (response.status === 429) {
          throw new TrainerRoadAPIError(
            'Rate limit exceeded. Please try again later.',
            429
          )
        }

        const errorText = await response.text().catch(() => 'Unknown error')
        throw new TrainerRoadAPIError(
          `TrainerRoad API error: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        )
      }

      const data: TrainerRoadActivitiesResponse = await response.json()

      if (!Array.isArray(data)) {
        throw new TrainerRoadAPIError('Invalid response format from TrainerRoad API')
      }

      // Sort by most recent first and limit results
      const sortedActivities = data
        .sort((a, b) => new Date(b.Started).getTime() - new Date(a.Started).getTime())
        .slice(0, limit)

      console.log(`✅ TRAINERROAD: Fetched ${sortedActivities.length} activities`)
      return sortedActivities

    } catch (error) {
      if (error instanceof TrainerRoadAPIError) {
        throw error
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TrainerRoadAPIError('Request timeout: TrainerRoad API took too long to respond')
      }

      console.error('❌ TRAINERROAD: API request failed:', error)
      throw new TrainerRoadAPIError(
        `Failed to fetch TrainerRoad data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get activity count for authenticated user (for display purposes)
   */
  async getActivityCount(): Promise<number> {
    try {
      const activities = await this.getRecentActivities(50)
      return activities.length
    } catch (error) {
      console.warn('Could not get activity count:', error)
      return 0
    }
  }

  /**
   * Sync activities to the database
   */
  async syncActivities(limit = 20): Promise<{ imported: number; updated: number }> {
    try {
      console.log('🔄 TRAINERROAD: Syncing activities to database')
      
      const response = await fetch(`${this.proxyBaseUrl}/sync?limit=${limit}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new TrainerRoadAPIError(
            'Not authenticated with TrainerRoad. Please sign in first.',
            401
          )
        }
        throw new TrainerRoadAPIError(
          `Sync failed: ${response.status} ${response.statusText}`,
          response.status
        )
      }

      const result = await response.json()
      console.log(`✅ TRAINERROAD: Sync completed - ${result.imported} imported, ${result.updated} updated`)
      return result

    } catch (error) {
      console.error('❌ TRAINERROAD: Sync failed:', error)
      if (error instanceof TrainerRoadAPIError) {
        throw error
      }
      throw new TrainerRoadAPIError(
        `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

// Singleton instance
export const trainerRoadClient = new TrainerRoadClient()

export default trainerRoadClient
