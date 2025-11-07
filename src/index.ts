import { 
  Client, 
  GatewayIntentBits, 
  Collection,
  Events 
} from 'discord.js'
import { loadConfig } from '@/utils/config'
import { getEvents } from '@/events'
import { getCommands } from '@/commands'
import { DataPersistenceService } from '@/services/dataPersistenceService'
import { CurrencyService } from '@/services/currencyService'
import { LoggingService } from '@/services/loggingService'
import { TimeoutTracker } from '@/services/timeoutTracker'

class MiraBot {
  private client: Client
  private config: ReturnType<typeof loadConfig>
  private dataService: DataPersistenceService
  private currencyService: CurrencyService
  private loggingService: LoggingService
  private timeoutTracker: TimeoutTracker

  constructor() {
    this.config = loadConfig()
    
    // Initialize services
    this.dataService = new DataPersistenceService()
    this.loggingService = new LoggingService(this.config.verification.logChannelId)
    this.currencyService = new CurrencyService(this.config.currency, this.dataService, this.loggingService)
    
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
      
      await this.client.login(this.config.token)
      
      console.log('✅ Bot started successfully!')
      
    } catch (error) {
      console.error('❌ Failed to start bot:', error)
      process.exit(1)
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Shutting down bot...')
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