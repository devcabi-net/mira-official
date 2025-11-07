import { Client, Guild, GuildMember } from 'discord.js'
import { DataPersistenceService } from './dataPersistenceService'

export interface ActiveTimeout {
  id: string
  userId: string
  guildId: string
  type: 'server_mute' | 'server_deafen' | 'temp_ban'
  duration: number // in minutes
  startTime: Date
  endTime: Date
  moderatorId: string
  reason: string
}

export class TimeoutTracker {
  private dataService: DataPersistenceService
  private client: Client
  private activeTimeouts: Map<string, ActiveTimeout> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(dataService: DataPersistenceService, client: Client) {
    this.dataService = dataService
    this.client = client
    this.startCleanupInterval()
  }

  async addTimeout(
    userId: string,
    guildId: string,
    type: 'server_mute' | 'server_deafen' | 'temp_ban',
    duration: number,
    moderatorId: string,
    reason: string
  ): Promise<ActiveTimeout> {
    const timeout: ActiveTimeout = {
      id: Date.now().toString(),
      userId,
      guildId,
      type,
      duration,
      startTime: new Date(),
      endTime: new Date(Date.now() + duration * 60 * 1000),
      moderatorId,
      reason
    }

    this.activeTimeouts.set(timeout.id, timeout)
    await this.saveTimeouts()
    
    console.log(`Added ${type} for ${duration} minutes to user ${userId}`)
    return timeout
  }

  async removeTimeout(timeoutId: string): Promise<boolean> {
    const timeout = this.activeTimeouts.get(timeoutId)
    if (!timeout) return false

    this.activeTimeouts.delete(timeoutId)
    await this.saveTimeouts()
    return true
  }

  getActiveTimeouts(userId: string): ActiveTimeout[] {
    return Array.from(this.activeTimeouts.values())
      .filter(timeout => timeout.userId === userId)
  }

  getExpiredTimeouts(): ActiveTimeout[] {
    const now = new Date()
    return Array.from(this.activeTimeouts.values())
      .filter(timeout => timeout.endTime <= now)
  }

  private startCleanupInterval(): void {
    // Check for expired timeouts every 30 seconds
    this.cleanupInterval = setInterval(async () => {
      await this.processExpiredTimeouts()
    }, 30000)
  }

  private async processExpiredTimeouts(): Promise<void> {
    const expiredTimeouts = this.getExpiredTimeouts()
    
    for (const timeout of expiredTimeouts) {
      try {
        await this.handleExpiredTimeout(timeout)
        await this.removeTimeout(timeout.id)
        console.log(`Timeout ${timeout.id} expired and was processed`)
      } catch (error) {
        console.error(`Error processing expired timeout ${timeout.id}:`, error)
      }
    }
  }

  private async handleExpiredTimeout(timeout: ActiveTimeout): Promise<void> {
    try {
      // Get the guild and member
      const guild = await this.client.guilds.fetch(timeout.guildId)
      if (!guild) {
        console.warn(`Guild ${timeout.guildId} not found for timeout ${timeout.id}`)
        return
      }

      const member = await guild.members.fetch(timeout.userId).catch(() => null)
      if (!member) {
        console.warn(`Member ${timeout.userId} not found in guild ${timeout.guildId}`)
        return
      }

      // Handle different timeout types
      switch (timeout.type) {
        case 'server_mute':
          if (member.voice.mute) {
            await member.voice.setMute(false, `Mute expired: ${timeout.reason}`)
            console.log(`Unmuted user ${timeout.userId} after timeout expired`)
          }
          break
        case 'server_deafen':
          if (member.voice.deaf) {
            await member.voice.setDeaf(false, `Deafen expired: ${timeout.reason}`)
            console.log(`Undeafened user ${timeout.userId} after timeout expired`)
          }
          break
        case 'temp_ban':
          try {
            await guild.members.unban(timeout.userId, `Temporary ban expired: ${timeout.reason}`)
            console.log(`Unbanned user ${timeout.userId} after temporary ban expired`)
          } catch (error) {
            console.warn(`Could not unban user ${timeout.userId}:`, error)
          }
          break
      }
    } catch (error) {
      console.error(`Error handling expired timeout ${timeout.id}:`, error)
    }
  }

  private async saveTimeouts(): Promise<void> {
    const timeouts = Array.from(this.activeTimeouts.values())
    await this.dataService.saveActiveTimeouts(timeouts)
  }

  async loadTimeouts(): Promise<void> {
    try {
      const timeouts = await this.dataService.getActiveTimeouts()
      this.activeTimeouts.clear()
      
      for (const timeout of timeouts) {
        // Only load timeouts that haven't expired
        if (new Date(timeout.endTime) > new Date()) {
          this.activeTimeouts.set(timeout.id, {
            ...timeout,
            startTime: new Date(timeout.startTime),
            endTime: new Date(timeout.endTime)
          })
        }
      }
    } catch (error) {
      console.error('Error loading timeouts:', error)
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}
