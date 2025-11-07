import { 
  VoiceState, 
  VoiceChannel,
  Events 
} from 'discord.js'
import { CurrencyService } from '@/services/currencyService'
import { DataPersistenceService } from '@/services/dataPersistenceService'
import { VoiceSession } from '@/types'

export const name = Events.VoiceStateUpdate
export const once = false

// Track active voice sessions
const activeSessions = new Map<string, VoiceSession>()

// Track periodic currency awards
const currencyAwardIntervals = new Map<string, NodeJS.Timeout>()

export async function execute(
  oldState: VoiceState,
  newState: VoiceState,
  currencyService: CurrencyService,
  dataService: DataPersistenceService
): Promise<void> {
  try {
    const userId = newState.member?.id
    if (!userId) return

    const guild = newState.guild

    // User joined a voice channel
    if (!oldState.channelId && newState.channelId) {
      await handleVoiceJoin(userId, newState.channelId!, dataService, currencyService, guild)
    }
    
    // User left a voice channel
    else if (oldState.channelId && !newState.channelId) {
      await handleVoiceLeave(userId, oldState.channelId!, currencyService, dataService, guild)
    }
    
    // User switched voice channels
    else if (oldState.channelId !== newState.channelId && newState.channelId) {
      await handleVoiceLeave(userId, oldState.channelId!, currencyService, dataService, guild)
      await handleVoiceJoin(userId, newState.channelId, dataService, currencyService, guild)
    }
    
    // User was disconnected (moved to null channel)
    else if (oldState.channelId && !newState.channelId) {
      await handleVoiceLeave(userId, oldState.channelId!, currencyService, dataService, guild)
    }

  } catch (error) {
    console.error('Error in voice state update:', error)
  }
}

async function handleVoiceJoin(
  userId: string, 
  channelId: string, 
  dataService: DataPersistenceService,
  currencyService: CurrencyService,
  guild?: any
): Promise<void> {
  try {
    const session: VoiceSession = {
      userId,
      channelId,
      startTime: new Date()
    }
    
    activeSessions.set(userId, session)
    await dataService.saveVoiceSession(session)
    
    // Start periodic currency awards (every minute)
    const interval = setInterval(async () => {
      try {
        const member = guild?.members.cache.get(userId)
        await currencyService.addVoiceTime(userId, 1, guild, member) // Award 1 minute worth
      } catch (error) {
        console.error(`Error awarding currency to ${userId}:`, error)
      }
    }, 60000) // Every 60 seconds
    
    currencyAwardIntervals.set(userId, interval)
    
    console.log(`User ${userId} joined voice channel ${channelId} - started currency earning`)
  } catch (error) {
    console.error('Error handling voice join:', error)
  }
}

async function handleVoiceLeave(
  userId: string, 
  channelId: string, 
  currencyService: CurrencyService,
  dataService: DataPersistenceService,
  guild?: any
): Promise<void> {
  try {
    const session = activeSessions.get(userId)
    if (!session) return

    // Stop the periodic currency award
    const interval = currencyAwardIntervals.get(userId)
    if (interval) {
      clearInterval(interval)
      currencyAwardIntervals.delete(userId)
    }

    // Calculate final duration and award any remaining time
    const endTime = new Date()
    const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / (1000 * 60))
    
    if (duration > 0) {
      // Award any remaining time (less than 1 minute)
      const remainingSeconds = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000) % 60
      if (remainingSeconds > 30) { // Award if more than 30 seconds remaining
        const member = guild?.members.cache.get(userId)
        await currencyService.addVoiceTime(userId, 1, guild, member) // Award 1 minute worth
      }
      
      // Update session with end time
      session.endTime = endTime
      session.duration = duration
      await dataService.saveVoiceSession(session)
      
      console.log(`User ${userId} left voice channel ${channelId} after ${duration} minutes`)
    }
    
    activeSessions.delete(userId)
  } catch (error) {
    console.error('Error handling voice leave:', error)
  }
}

// Periodic cleanup for disconnected users
export function startVoiceSessionCleanup(currencyService: CurrencyService, dataService: DataPersistenceService): void {
  setInterval(async () => {
    try {
      const now = new Date()
      const timeoutMinutes = 5 // Consider session dead after 5 minutes of no updates
      
      for (const [userId, session] of activeSessions.entries()) {
        const timeSinceLastUpdate = (now.getTime() - session.startTime.getTime()) / (1000 * 60)
        
        if (timeSinceLastUpdate > timeoutMinutes) {
          // Force end the session
          await handleVoiceLeave(userId, session.channelId, currencyService, dataService)
        }
      }
    } catch (error) {
      console.error('Error in voice session cleanup:', error)
    }
  }, 60000) // Run every minute
}
