import { 
  Client, 
  GatewayIntentBits, 
  Collection,
  Events 
} from 'discord.js'
import { loadConfig, loadStatbotConfig } from '@/utils/config'
import { getEvents } from '@/events'
import { getCommands } from '@/commands'
import { DataPersistenceService } from '@/services/dataPersistenceService'
import { CurrencyService } from '@/services/currencyService'
import { LoggingService } from '@/services/loggingService'
import { TimeoutTracker } from '@/services/timeoutTracker'
import { StatbotService } from '@/services/statbotService'

class MiraBot {
  private client: Client
  private config: ReturnType<typeof loadConfig>
  private dataService: DataPersistenceService
  private currencyService: CurrencyService
  private loggingService: LoggingService
  private timeoutTracker: TimeoutTracker
  private statbotService: StatbotService | null = null
  private statbotSyncInterval: NodeJS.Timeout | null = null

  constructor() {
    this.config = loadConfig()
    
    // Initialize services
    this.dataService = new DataPersistenceService()
    this.loggingService = new LoggingService(this.config.verification.logChannelId)
    this.currencyService = new CurrencyService(this.config.currency, this.dataService, this.loggingService)
    
    // Initialize StatbotService if enabled (optional integration)
    const statbotConfig = loadStatbotConfig()
    if (statbotConfig.enabled && statbotConfig.apiKey) {
      try {
        this.statbotService = new StatbotService(statbotConfig)
        console.log('📊 Statbot integration enabled')
      } catch (error) {
        console.warn('⚠️ Failed to initialize StatbotService:', error)
        console.warn('⚠️ Bot will continue without Statbot integration')
        this.statbotService = null
      }
    } else {
      console.log('ℹ️ Statbot integration disabled (set STATBOT_ENABLED=true and STATBOT_API_KEY to enable)')
    }
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // Required for voice tracking
      ]
    })

    // Initialize timeout tracker after client is created
    this.timeoutTracker = new TimeoutTracker(this.dataService, this.client)
    
    this.setupEventHandlers().catch(console.error)
    this.setupErrorHandling()
  }

  /**
   * Get StatbotService instance (null if not enabled)
   */
  getStatbotService(): StatbotService | null {
    return this.statbotService
  }

  private async setupEventHandlers(): Promise<void> {
    // Initialize data service
    await this.dataService.initialize()
    
    const events = getEvents()

    for (const event of events.values()) {
      if (event.once) {
        this.client.once(event.name, (...args: any[]) => {
          if (event.name === Events.InteractionCreate) {
            event.execute(args[0], this.config.verification, this.currencyService, this.config.currency, this.timeoutTracker)
          } else if (event.name === 'voiceStateUpdate') {
            event.execute(args[0], args[1], this.currencyService, this.dataService)
          } else {
            event.execute(...args)
          }
        })
      } else {
        this.client.on(event.name, (...args: any[]) => {
          if (event.name === Events.InteractionCreate) {
            event.execute(args[0], this.config.verification, this.currencyService, this.config.currency, this.timeoutTracker)
          } else if (event.name === 'voiceStateUpdate') {
            event.execute(args[0], args[1], this.currencyService, this.dataService)
          } else {
            event.execute(...args)
          }
        })
      }
    }
  }

  private setupErrorHandling(): void {
    process.on('unhandledRejection', (error) => {
      console.error('Unhandled promise rejection:', error)
    })

    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error)
      process.exit(1)
    })

    this.client.on('error', (error) => {
      console.error('Discord client error:', error)
    })
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 Starting Mira Discord Bot...')
      console.log(`📊 Environment: ${this.config.environment}`)
      
      // Health check Statbot if enabled
      if (this.statbotService?.isEnabled()) {
        try {
          console.log('🔍 Checking Statbot API connectivity...')
          const isHealthy = await this.statbotService.healthCheck(this.config.guildId)
          if (isHealthy) {
            console.log('✅ Statbot API connection verified')
            
            // Perform initial sync on startup
            try {
              await this.statbotService.syncAllUsers(
                this.config.guildId,
                async () => await this.dataService.getAllUsers(),
                async (userId: string, voiceTimeMinutes: number) => {
                  await this.currencyService.updateVoiceTime(userId, voiceTimeMinutes)
                }
              )
            } catch (syncError) {
              console.warn('⚠️ Statbot startup sync failed:', syncError)
              console.warn('⚠️ Bot will continue - hourly sync will retry')
            }
            
            // Set up hourly sync interval
            const syncInterval = this.config.statbot?.syncInterval || 3600000 // Default 1 hour
            this.statbotSyncInterval = setInterval(async () => {
              try {
                if (this.statbotService?.shouldSync()) {
                  await this.statbotService.syncAllUsers(
                    this.config.guildId,
                    async () => await this.dataService.getAllUsers(),
                    async (userId: string, voiceTimeMinutes: number) => {
                      await this.currencyService.updateVoiceTime(userId, voiceTimeMinutes)
                    }
                  )
                }
              } catch (error) {
                console.error('⚠️ Statbot hourly sync error:', error)
              }
            }, syncInterval)
            
            console.log(`⏰ Statbot hourly sync enabled (interval: ${syncInterval / 1000 / 60} minutes)`)
          } else {
            console.warn('⚠️ Statbot API health check failed - bot will continue with fallback')
          }
        } catch (error) {
          console.warn('⚠️ Statbot API health check error:', error)
          console.warn('⚠️ Bot will continue without Statbot integration')
        }
      }
      
      await this.client.login(this.config.token)
      
      console.log('✅ Bot started successfully!')
      
      // Log Statbot status
      if (this.statbotService?.isEnabled()) {
        console.log('📊 Statbot integration: ENABLED')
      } else {
        console.log('📊 Statbot integration: DISABLED')
      }
      
    } catch (error) {
      console.error('❌ Failed to start bot:', error)
      process.exit(1)
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Shutting down bot...')
    
    // Clear Statbot sync interval
    if (this.statbotSyncInterval) {
      clearInterval(this.statbotSyncInterval)
      this.statbotSyncInterval = null
    }
    
    this.client.destroy()
    process.exit(0)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

// Start the bot
const bot = new MiraBot()
bot.start().catch(console.error) 