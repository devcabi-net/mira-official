import { 
  Client, 
  GatewayIntentBits, 
  Collection,
  Events 
} from 'discord.js'
import { loadConfig } from '@/utils/config'
import { getEvents } from '@/events'
import { getCommands } from '@/commands'

class MiraBot {
  private client: Client
  private config: ReturnType<typeof loadConfig>

  constructor() {
    this.config = loadConfig()
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    })

    this.setupEventHandlers()
    this.setupErrorHandling()
  }

  private setupEventHandlers(): void {
    const events = getEvents()

    for (const event of events.values()) {
      if (event.once) {
        this.client.once(event.name, (...args: any[]) => {
          if (event.name === Events.InteractionCreate) {
            event.execute(args[0], this.config.verification)
          } else {
            event.execute(args[0])
          }
        })
      } else {
        this.client.on(event.name, (...args: any[]) => {
          if (event.name === Events.InteractionCreate) {
            event.execute(args[0], this.config.verification)
          } else {
            event.execute(args[0])
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