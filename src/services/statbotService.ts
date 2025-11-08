/**
 * StatbotService - Integration with Statbot API
 * 
 * This service provides access to Statbot's comprehensive statistics tracking.
 * It enhances Mira's existing tracking with professional-grade analytics.
 * 
 * Documentation: https://docs.statbot.net/docs/category/statbot-api
 */

import { Guild } from 'discord.js'

// Statbot API Configuration
// Note: Base URL and endpoints need to be verified against actual Statbot API documentation
// The API is experimental and endpoints may vary
// Based on error messages, the API appears to be at api.statbot.net but endpoint structure is unclear
// We'll try multiple common patterns until we find the correct one
const STATBOT_API_BASE_URL = 'https://api.statbot.net' // Base URL
const DEFAULT_RATE_LIMIT_RETRY_MS = 60000 // 1 minute

export interface StatbotConfig {
  apiKey: string
  enabled: boolean
  syncInterval: number // milliseconds
  fallbackEnabled: boolean
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number // Unix timestamp
  retryAfter?: number // seconds
}

export interface StatbotMemberCount {
  unixTimestamp: number // Timestamp in milliseconds since epoch
  count: number // Number of unique members
}

export interface StatbotMemberStats {
  id: string // Discord user ID (snowflake)
  messageCount: number
  voiceCount: number // Voice activity count (in minutes or activity units)
  messageChannelCount: number
  voiceChannelCount: number
  username: string
  type: 'user' | 'bot'
  globalName: string
  nick: string
  avatar: string // Avatar hash (empty string if not available)
  guildAvatar: string // Guild avatar hash (empty string if not available)
}

export interface StatbotMessageSum {
  total: number
  period?: {
    start: string
    end: string
  }
}

export class StatbotService {
  private config: StatbotConfig
  private rateLimitInfo: RateLimitInfo | null = null
  private lastSync: Date | null = null

  constructor(config: StatbotConfig) {
    this.config = config
  }

  /**
   * Check if Statbot integration is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.config.apiKey
  }

  /**
   * Make an authenticated request to Statbot API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.isEnabled()) {
      throw new Error('Statbot API is not enabled or API key is missing')
    }

    const url = `${STATBOT_API_BASE_URL}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after')
      const retryAfterMs = retryAfter 
        ? parseInt(retryAfter) * 1000 
        : DEFAULT_RATE_LIMIT_RETRY_MS
      
      throw new RateLimitError(
        `Rate limit exceeded. Retry after ${retryAfterMs}ms`,
        retryAfterMs
      )
    }

    // Update rate limit info
    this.updateRateLimitInfo(response)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Statbot API error: ${response.status} - ${errorText}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(response: Response): void {
    const limit = response.headers.get('x-ratelimit-limit')
    const remaining = response.headers.get('x-ratelimit-remaining')
    const reset = response.headers.get('x-ratelimit-reset')

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: parseInt(reset),
      }
    }
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo
  }

  /**
   * Get unique member counts series for a guild
   * Returns time-series data of member counts
   * Endpoint: GET /v1/guilds/:guild_id/counts/members/series
   * Documentation: https://docs.statbot.net/docs/api/get-guild-member-counts/
   * Note: Requires 'stats' query parameter as an array
   * Valid values: 'text' or 'voice' (as per Statbot API documentation)
   */
  async getGuildMemberCounts(
    guildId: string,
    startDate?: Date,
    endDate?: Date,
    stats?: string[] // Valid values: 'text' or 'voice' (per Statbot API docs)
  ): Promise<StatbotMemberCount[]> {
    // Build query string - 'stats' parameter is required and must be an array
    const params: string[] = []
    
    // 'stats' is required - default to 'text' if not provided
    // Valid values per Statbot API docs: 'text' or 'voice'
    const statsArray = stats && stats.length > 0 ? stats : ['text']
    
    // Validate stat values
    const validStats = ['text', 'voice']
    const invalidStats = statsArray.filter(stat => !validStats.includes(stat))
    if (invalidStats.length > 0) {
      throw new Error(`Invalid stat values: ${invalidStats.join(', ')}. Valid values are: ${validStats.join(', ')}`)
    }
    
    // Add each stat as a separate query parameter (array format)
    // API expects: stats[]=members or stats=members&stats=online
    // Based on error, it seems to expect array notation
    statsArray.forEach(stat => {
      params.push(`stats[]=${encodeURIComponent(stat)}`)
    })
    
    if (startDate) {
      params.push(`start=${encodeURIComponent(startDate.toISOString())}`)
    }
    if (endDate) {
      params.push(`end=${encodeURIComponent(endDate.toISOString())}`)
    }
    
    const query = params.join('&')
    const endpoint = `/v1/guilds/${guildId}/counts/members/series?${query}`
    
    try {
      return await this.makeRequest<StatbotMemberCount[]>(endpoint)
    } catch (error) {
      console.error('Error fetching member counts from Statbot:', error)
      throw error
    }
  }

  /**
   * Get member statistics with counts
   * Returns members with their activity counts and channel participation
   * Endpoint: GET /v1/guilds/:guild_id/counts/members
   * Documentation: https://docs.statbot.net/docs/api/get-guild-member-stats/
   */
  async getGuildMemberStats(
    guildId: string
  ): Promise<StatbotMemberStats[]> {
    // Correct endpoint path from Statbot API docs
    // Note: This endpoint does NOT accept limit/offset parameters
    const endpoint = `/v1/guilds/${guildId}/counts/members`
    
    try {
      return await this.makeRequest<StatbotMemberStats[]>(endpoint)
    } catch (error) {
      console.error('Error fetching member stats from Statbot:', error)
      throw error
    }
  }

  /**
   * Get total message count for a guild
   * Endpoint: GET /v1/guilds/:guild_id/messages/sums
   * Documentation: https://docs.statbot.net/docs/api/get-guild-message-sums/
   */
  async getGuildMessageSum(
    guildId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<StatbotMessageSum> {
    // Build query string
    const params = new URLSearchParams()
    if (startDate) params.append('start', startDate.toISOString())
    if (endDate) params.append('end', endDate.toISOString())
    const query = params.toString()
    const querySuffix = query ? `?${query}` : ''
    
    // Correct endpoint path from Statbot API docs
    const endpoint = `/v1/guilds/${guildId}/messages/sums${querySuffix}`
    
    try {
      return await this.makeRequest<StatbotMessageSum>(endpoint)
    } catch (error) {
      console.error('Error fetching message sum from Statbot:', error)
      throw error
    }
  }

  /**
   * Get voice activity for a specific user
   * This can be used to validate/verify Mira's voice time tracking
   * Note: Voice time may be included in member stats response
   * If a dedicated endpoint exists, it needs to be verified in Statbot API docs
   */
  /**
   * Get voice time for a user from pre-fetched member stats
   * This is a helper method that doesn't make API calls
   */
  getUserVoiceTimeFromStats(userId: string, memberStats: StatbotMemberStats[]): number {
    const userStats = memberStats.find(stat => stat.id === userId)
    // voiceCount appears to be in minutes based on Statbot's tracking
    return userStats?.voiceCount || 0
  }

  /**
   * Sync voice time data with Statbot (using pre-fetched stats)
   * Validates Mira's tracking against Statbot's data
   */
  syncVoiceTimeFromStats(
    userId: string,
    miraVoiceTime: number,
    statbotTime: number
  ): { synced: boolean; statbotTime: number; difference: number } {
    const difference = Math.abs(statbotTime - miraVoiceTime)
    const synced = difference < 5 // Consider synced if difference is less than 5 minutes
    
    return {
      synced,
      statbotTime,
      difference,
    }
  }

  /**
   * Get top members by activity
   * Useful for leaderboards
   * Note: Top members endpoint may need to be verified in Statbot API docs
   * This is a placeholder - actual endpoint path needs to be confirmed
   */
  async getTopMembers(
    guildId: string,
    metric: 'messages' | 'voice' | 'activity',
    limit: number = 10
  ): Promise<StatbotMemberStats[]> {
    try {
      // TODO: Verify actual top members endpoint path from Statbot API docs
      // Based on the pattern, it might be /v1/guilds/:guild_id/tops/:metric
      const endpoint = `/v1/guilds/${guildId}/tops/${metric}?limit=${limit}`
      return await this.makeRequest<StatbotMemberStats[]>(endpoint)
    } catch (error: any) {
      // If 404, try alternative endpoint format
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        try {
          const altEndpoint = `/v1/guilds/${guildId}/counts/members/tops/${metric}?limit=${limit}`
          return await this.makeRequest<StatbotMemberStats[]>(altEndpoint)
        } catch (altError) {
          console.error(`Error fetching top members from Statbot (both endpoints failed):`, error)
          throw error
        }
      }
      console.error(`Error fetching top members from Statbot:`, error)
      throw error
    }
  }

  /**
   * Check if we should sync (based on sync interval)
   */
  shouldSync(): boolean {
    if (!this.lastSync) return true
    
    const now = new Date()
    const timeSinceLastSync = now.getTime() - this.lastSync.getTime()
    
    return timeSinceLastSync >= this.config.syncInterval
  }

  /**
   * Mark that a sync has occurred
   */
  markSynced(): void {
    this.lastSync = new Date()
  }

  /**
   * Sync all users' voice time with Statbot
   * Compares Mira's tracking with Statbot's data and logs differences
   * Fetches all member stats once, then processes users from that data
   * If bulk fetch fails, sync is skipped entirely (no individual API calls)
   * @param guildId - Discord guild ID
   * @param getAllUsers - Function to get all users from data service
   * @param updateUserVoiceTime - Optional function to update user's voice time if needed
   */
  async syncAllUsers(
    guildId: string,
    getAllUsers: () => Promise<Array<{ userId: string; voiceTimeMinutes: number }>>,
    updateUserVoiceTime?: (userId: string, voiceTimeMinutes: number) => Promise<void>
  ): Promise<{ synced: number; total: number; differences: Array<{ userId: string; miraTime: number; statbotTime: number; difference: number }> }> {
    try {
      const users = await getAllUsers()
      const total = users.length
      let synced = 0
      const differences: Array<{ userId: string; miraTime: number; statbotTime: number; difference: number }> = []

      // Fetch all member stats ONCE - if this fails, skip sync entirely
      let statbotMemberStats: StatbotMemberStats[] = []
      let statbotStatsMap: Map<string, number> = new Map()
      
      try {
        // Fetch member stats with retry logic for rate limits
        const maxRetries = 3
        let retryCount = 0
        while (retryCount < maxRetries) {
          try {
            statbotMemberStats = await this.getGuildMemberStats(guildId)
            // Create a map for quick lookup
            // Note: voiceCount from Statbot API represents voice activity (in minutes)
            statbotMemberStats.forEach(stat => {
              if (stat.voiceCount !== undefined) {
                statbotStatsMap.set(stat.id, stat.voiceCount)
              }
            })
            break // Success
          } catch (error: any) {
            if (error instanceof RateLimitError) {
              retryCount++
              const waitTime = error.retryAfterMs || 10000
              if (retryCount === 1) {
                console.log(`⏳ Statbot rate limited. Waiting ${waitTime}ms before retry...`)
              }
              await new Promise(resolve => setTimeout(resolve, waitTime))
            } else {
              // For other errors (like 400 Bad Request), don't retry
              throw error
            }
          }
        }
      } catch (error: any) {
        // If bulk fetch fails, skip sync entirely - don't try individual lookups
        const errorMsg = error.message || String(error)
        if (errorMsg.includes('400') || errorMsg.includes('Bad Request')) {
          console.warn('⚠️ Statbot API: Bulk fetch failed (invalid parameters). Skipping sync.')
        } else {
          console.warn('⚠️ Statbot API: Bulk fetch failed. Skipping sync.')
        }
        this.markSynced() // Mark as synced to prevent retry spam
        return { synced: 0, total, differences: [] }
      }

      // If we got here, we have the stats - process users
      console.log(`🔄 Syncing ${total} users with Statbot (${statbotMemberStats.length} stats available)...`)
      
      for (let i = 0; i < users.length; i++) {
        const user = users[i]
        if (!user) continue
        
        try {
          // Get voice time from pre-fetched stats
          const statbotTime = statbotStatsMap.get(user.userId) || 0
          const difference = Math.abs(statbotTime - user.voiceTimeMinutes)
          const tolerance = 5 // Consider synced if difference is less than 5 minutes
          const isSynced = difference < tolerance

          if (isSynced) {
            synced++
          } else {
            differences.push({
              userId: user.userId,
              miraTime: user.voiceTimeMinutes,
              statbotTime: statbotTime,
              difference: difference
            })

            // Optionally update user's voice time if Statbot has more accurate data
            // Only update if difference is significant (more than 10 minutes)
            if (updateUserVoiceTime && difference > 10 && statbotTime > user.voiceTimeMinutes) {
              await updateUserVoiceTime(user.userId, statbotTime)
            }
          }
        } catch (error) {
          // Silently continue - don't spam errors
        }
      }

      console.log(`✅ Statbot sync complete: ${synced}/${total} users synced`)
      if (differences.length > 0 && differences.length <= 10) {
        // Only log differences if there are few (avoid spam)
        const topDifferences = differences
          .sort((a, b) => b.difference - a.difference)
          .slice(0, 5)
        if (topDifferences.length > 0) {
          console.log(`📊 Top differences: ${topDifferences.length} users`)
        }
      }

      this.markSynced()
      
      return { synced, total, differences }
    } catch (error) {
      console.error('❌ Error during Statbot sync:', error)
      this.markSynced() // Mark as synced to prevent retry spam
      return { synced: 0, total: 0, differences: [] }
    }
  }

  /**
   * Health check - verify API connectivity and authentication
   * Uses the member counts endpoint to verify API is working
   * Endpoint: GET /v1/guilds/:guild_id/counts/members/series
   * Note: Requires 'stats' query parameter with valid values: 'text' or 'voice'
   */
  async healthCheck(guildId: string): Promise<boolean> {
    try {
      // Use a known working endpoint to verify API connectivity
      // Pass 'text' as the required 'stats' parameter (valid value per Statbot API docs)
      await this.getGuildMemberCounts(guildId, undefined, undefined, ['text'])
      return true
    } catch (error: any) {
      // If it's a 401/403, API key might be invalid
      if (error.message?.includes('401') || error.message?.includes('403')) {
        console.error('❌ Statbot API authentication failed - check your API key')
        return false
      }
      // If it's a 400, might be missing required parameters or invalid stat values
      if (error.message?.includes('400') || error.message?.includes('Bad Request')) {
        if (error.message?.includes('must be equal to one of the allowed values')) {
          console.warn('⚠️ Statbot API: Invalid stat value - valid values are: text, voice')
        } else {
          console.warn('⚠️ Statbot API bad request - check required parameters')
        }
        return false
      }
      // If it's a network error, API might be unreachable
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        console.error('❌ Statbot API unreachable - check network connectivity')
        return false
      }
      // For 404, endpoint might not exist (shouldn't happen with correct paths)
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        console.warn('⚠️ Statbot API endpoint not found - verify endpoint paths are correct')
        return false
      }
      // For other errors, log but don't fail completely
      console.error('Statbot health check error:', error.message || error)
      return false
    }
  }
}

/**
 * Custom error for rate limiting
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfterMs: number
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

