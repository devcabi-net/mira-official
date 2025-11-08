import { promises as fs } from 'fs'
import path from 'path'
import { CurrencyUser, CurrencyTransaction, ModerationLog, VoiceSession } from '@/types'
import { ActiveTimeout } from './timeoutTracker'

// File locking mechanism to prevent concurrent writes
class FileLock {
  private locks = new Map<string, Promise<void>>()
  
  async acquire(filePath: string): Promise<() => void> {
    // Wait for any existing lock on this file to be released
    while (this.locks.has(filePath)) {
      await this.locks.get(filePath)
    }
    
    // Create a new lock
    let release: () => void
    const lockPromise = new Promise<void>((resolve) => {
      release = resolve
    })
    
    this.locks.set(filePath, lockPromise)
    
    return () => {
      this.locks.delete(filePath)
      release()
    }
  }
}

// Write queue to serialize file operations
class WriteQueue {
  private queues = new Map<string, Array<() => Promise<void>>>()
  private processing = new Map<string, boolean>()
  
  async enqueue(filePath: string, operation: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      const queue = this.queues.get(filePath) || []
      queue.push(async () => {
        try {
          await operation()
          resolve()
        } catch (error) {
          reject(error)
        }
      })
      this.queues.set(filePath, queue)
      
      this.processQueue(filePath)
    })
  }
  
  private async processQueue(filePath: string): Promise<void> {
    if (this.processing.get(filePath)) return
    
    this.processing.set(filePath, true)
    
    while (true) {
      const queue = this.queues.get(filePath)
      if (!queue || queue.length === 0) break
      
      const operation = queue.shift()!
      await operation()
    }
    
    this.processing.set(filePath, false)
  }
}

export class DataPersistenceService {
  private dataDir: string
  private usersFile: string
  private transactionsFile: string
  private moderationLogsFile: string
  private voiceSessionsFile: string
  private timeoutsFile: string
  private fileLock: FileLock
  private writeQueue: WriteQueue

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir
    this.usersFile = path.join(dataDir, 'users.json')
    this.transactionsFile = path.join(dataDir, 'transactions.json')
    this.moderationLogsFile = path.join(dataDir, 'moderation-logs.json')
    this.voiceSessionsFile = path.join(dataDir, 'voice-sessions.json')
    this.timeoutsFile = path.join(dataDir, 'timeouts.json')
    this.fileLock = new FileLock()
    this.writeQueue = new WriteQueue()
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true })
      
      // Initialize files if they don't exist
      await this.ensureFileExists(this.usersFile, '{}')
      await this.ensureFileExists(this.transactionsFile, '[]')
      await this.ensureFileExists(this.moderationLogsFile, '[]')
      await this.ensureFileExists(this.voiceSessionsFile, '[]')
    } catch (error) {
      console.error('Failed to initialize data persistence:', error)
      throw error
    }
  }

  private async ensureFileExists(filePath: string, defaultContent: string): Promise<void> {
    try {
      await fs.access(filePath)
    } catch {
      await fs.writeFile(filePath, defaultContent, 'utf8')
    }
  }

  // User Data Management
  async getUser(userId: string): Promise<CurrencyUser | null> {
    try {
      const data = await this.readJsonFile(this.usersFile)
      // Ensure data is an object (not array or null)
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        console.warn(`Users file has invalid structure, reinitializing`)
        const defaultData = {}
        await this.writeJsonFile(this.usersFile, defaultData)
        return null
      }
      return data[userId] || null
    } catch (error) {
      console.error(`Failed to get user ${userId}:`, error)
      return null
    }
  }

  async saveUser(user: CurrencyUser): Promise<void> {
    return this.writeQueue.enqueue(this.usersFile, async () => {
      try {
        const data = await this.readJsonFile(this.usersFile)
        // Ensure data is an object
        const usersData = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {}
        usersData[user.userId] = user
        await this.writeJsonFile(this.usersFile, usersData)
      } catch (error) {
        console.error(`Failed to save user ${user.userId}:`, error)
        throw error
      }
    })
  }

  async getAllUsers(): Promise<CurrencyUser[]> {
    try {
      const data = await this.readJsonFile(this.usersFile)
      // Ensure data is an object
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return []
      }
      return Object.values(data)
    } catch (error) {
      console.error('Failed to get all users:', error)
      return []
    }
  }

  // Transaction Management
  async addTransaction(transaction: CurrencyTransaction): Promise<void> {
    return this.writeQueue.enqueue(this.transactionsFile, async () => {
      try {
        const transactions = await this.readJsonFile(this.transactionsFile)
        // Ensure transactions is an array
        const transactionsArray = Array.isArray(transactions) ? transactions : []
        transactionsArray.push(transaction)
        await this.writeJsonFile(this.transactionsFile, transactionsArray)
      } catch (error) {
        console.error('Failed to add transaction:', error)
        throw error
      }
    })
  }

  async getUserTransactions(userId: string, limit: number = 50): Promise<CurrencyTransaction[]> {
    try {
      const transactions = await this.readJsonFile(this.transactionsFile)
      // Ensure transactions is an array
      if (!Array.isArray(transactions)) {
        return []
      }
      return transactions
        .filter((t: CurrencyTransaction) => t.userId === userId)
        .sort((a: CurrencyTransaction, b: CurrencyTransaction) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, limit)
    } catch (error) {
      console.error(`Failed to get transactions for user ${userId}:`, error)
      return []
    }
  }

  // Moderation Logs
  async addModerationLog(log: ModerationLog): Promise<void> {
    return this.writeQueue.enqueue(this.moderationLogsFile, async () => {
      try {
        const logs = await this.readJsonFile(this.moderationLogsFile)
        // Ensure logs is an array
        const logsArray = Array.isArray(logs) ? logs : []
        logsArray.push(log)
        await this.writeJsonFile(this.moderationLogsFile, logsArray)
      } catch (error) {
        console.error('Failed to add moderation log:', error)
        throw error
      }
    })
  }

  async getModerationLogs(limit: number = 100): Promise<ModerationLog[]> {
    try {
      const logs = await this.readJsonFile(this.moderationLogsFile)
      // Ensure logs is an array
      if (!Array.isArray(logs)) {
        return []
      }
      return logs
        .sort((a: ModerationLog, b: ModerationLog) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, limit)
    } catch (error) {
      console.error('Failed to get moderation logs:', error)
      return []
    }
  }

  // Voice Sessions
  async saveVoiceSession(session: VoiceSession): Promise<void> {
    return this.writeQueue.enqueue(this.voiceSessionsFile, async () => {
      try {
        const sessions = await this.readJsonFile(this.voiceSessionsFile)
        // Ensure sessions is an array
        const sessionsArray = Array.isArray(sessions) ? sessions : []
        sessionsArray.push(session)
        await this.writeJsonFile(this.voiceSessionsFile, sessionsArray)
      } catch (error) {
        console.error('Failed to save voice session:', error)
        throw error
      }
    })
  }

  async getActiveVoiceSessions(): Promise<VoiceSession[]> {
    try {
      const sessions = await this.readJsonFile(this.voiceSessionsFile)
      // Ensure sessions is an array
      if (!Array.isArray(sessions)) {
        return []
      }
      return sessions.filter((s: VoiceSession) => !s.endTime)
    } catch (error) {
      console.error('Failed to get active voice sessions:', error)
      return []
    }
  }

  // Utility Methods
  private async readJsonFile(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      const trimmedContent = content.trim()
      
      // Handle empty files
      if (!trimmedContent) {
        console.warn(`JSON file ${filePath} is empty, initializing with default content`)
        return this.getDefaultContentForFile(filePath)
      }
      
      try {
        return JSON.parse(trimmedContent)
      } catch (parseError) {
        // Handle corrupted JSON - try to recover
        console.error(`JSON file ${filePath} is corrupted, attempting recovery:`, parseError)
        return this.recoverCorruptedFile(filePath, parseError)
      }
    } catch (error: any) {
      // Handle file not found or other read errors
      if (error.code === 'ENOENT') {
        console.warn(`JSON file ${filePath} not found, initializing with default content`)
        const defaultContent = this.getDefaultContentForFile(filePath)
        await this.writeJsonFile(filePath, defaultContent)
        return defaultContent
      }
      console.error(`Failed to read JSON file ${filePath}:`, error)
      throw error
    }
  }

  private getDefaultContentForFile(filePath: string): any {
    if (filePath === this.usersFile) {
      return {}
    } else if (filePath === this.transactionsFile) {
      return []
    } else if (filePath === this.moderationLogsFile) {
      return []
    } else if (filePath === this.voiceSessionsFile) {
      return []
    } else if (filePath === this.timeoutsFile) {
      return []
    }
    return {}
  }

  private async recoverCorruptedFile(filePath: string, parseError: any): Promise<any> {
    try {
      // Try to create a backup of the corrupted file
      const backupPath = `${filePath}.corrupted.${Date.now()}`
      try {
        const corruptedContent = await fs.readFile(filePath, 'utf8')
        await fs.writeFile(backupPath, corruptedContent, 'utf8')
        console.log(`Created backup of corrupted file: ${backupPath}`)
      } catch (backupError) {
        console.warn(`Failed to create backup of corrupted file:`, backupError)
      }

      // Initialize with default content
      const defaultContent = this.getDefaultContentForFile(filePath)
      await this.writeJsonFile(filePath, defaultContent)
      console.warn(`Recovered corrupted file ${filePath} by reinitializing with default content`)
      return defaultContent
    } catch (recoveryError) {
      console.error(`Failed to recover corrupted file ${filePath}:`, recoveryError)
      // Return default content anyway to prevent complete failure
      return this.getDefaultContentForFile(filePath)
    }
  }

  private async writeJsonFile(filePath: string, data: any, maxRetries: number = 3): Promise<void> {
    const release = await this.fileLock.acquire(filePath)
    
    try {
      const content = JSON.stringify(data, null, 2)
      
      // Retry logic with exponential backoff
      let lastError: Error | null = null
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          await fs.writeFile(filePath, content, 'utf8')
          return // Success, exit the retry loop
        } catch (error: any) {
          lastError = error
          
          // If it's an EBUSY error and we have retries left, wait and try again
          if (error.code === 'EBUSY' && attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 100 // Exponential backoff: 100ms, 200ms, 400ms
            console.warn(`File ${filePath} is busy, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
          
          // If it's not an EBUSY error or we're out of retries, throw immediately
          throw error
        }
      }
      
      // If we get here, all retries failed
      throw lastError
    } finally {
      release()
    }
  }

  // Backup and Recovery
  async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupDir = path.join(this.dataDir, 'backups', timestamp)
      
      await fs.mkdir(backupDir, { recursive: true })
      
      await fs.copyFile(this.usersFile, path.join(backupDir, 'users.json'))
      await fs.copyFile(this.transactionsFile, path.join(backupDir, 'transactions.json'))
      await fs.copyFile(this.moderationLogsFile, path.join(backupDir, 'moderation-logs.json'))
      await fs.copyFile(this.voiceSessionsFile, path.join(backupDir, 'voice-sessions.json'))
      
      return backupDir
    } catch (error) {
      console.error('Failed to create backup:', error)
      throw error
    }
  }

  // Timeout Management
  async saveActiveTimeouts(timeouts: ActiveTimeout[]): Promise<void> {
    try {
      await fs.writeFile(this.timeoutsFile, JSON.stringify(timeouts, null, 2))
    } catch (error) {
      console.error('Error saving active timeouts:', error)
    }
  }

  async getActiveTimeouts(): Promise<ActiveTimeout[]> {
    try {
      const data = await fs.readFile(this.timeoutsFile, 'utf-8')
      return JSON.parse(data) as ActiveTimeout[]
    } catch (error) {
      console.error('Error reading active timeouts:', error)
      return []
    }
  }
}
