import dotenv from 'dotenv'
import { BotConfig, VerificationConfig, CurrencyConfig, CurrencyTier } from '@/types'
import { StatbotConfig } from '@/services/statbotService'

dotenv.config()

function validateRequiredEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function loadVerificationConfig(): VerificationConfig {
  return {
    unverifiedRoleId: validateRequiredEnvVar('UNVERIFIED_ROLE_ID'),
    verifiedRoleId: validateRequiredEnvVar('VERIFIED_ROLE_ID'),
    verifierRoleId: validateRequiredEnvVar('VERIFIER_ROLE_ID'),
    logChannelId: validateRequiredEnvVar('LOG_CHANNEL_ID')
  }
}

function loadCurrencyConfig(): CurrencyConfig {
  return {
    currencyPerMinute: parseInt(process.env.CURRENCY_PER_MINUTE || '1'),
    protectedRoles: (process.env.PROTECTED_ROLES || '').split(',').filter(Boolean),
    auditChannelId: validateRequiredEnvVar('LOG_CHANNEL_ID'), // Use existing log channel
    moderationActions: [
      // Bronze tier - No actions (must upgrade)
      
      // Silver tier actions
      {
        id: 'rename',
        name: 'Rename User',
        cost: 2000,
        cooldown: 60,
        dailyLimit: 5,
        requiredTier: 'silver',
        description: 'Change a user\'s nickname to whatever you want'
      },
      {
        id: 'timeout-5min',
        name: 'Timeout 5 Minutes',
        cost: 3000,
        cooldown: 120,
        dailyLimit: 3,
        requiredTier: 'silver',
        description: 'Timeout a user for 5 minutes (auto-expires)'
      },
      
      // Gold tier actions
      {
        id: 'timeout-1hour',
        name: 'Timeout 1 Hour',
        cost: 8000,
        cooldown: 360,
        dailyLimit: 2,
        requiredTier: 'gold',
        description: 'Timeout a user for 1 hour (auto-expires)'
      },
      {
        id: 'remove-timeout',
        name: 'Remove Timeout',
        cost: 15000,
        cooldown: 180,
        dailyLimit: 3,
        requiredTier: 'gold',
        description: 'Remove timeout from a user (help your friends!)'
      },
      
      // Platinum tier actions
      {
        id: 'timeout-1day',
        name: 'Timeout 1 Day',
        cost: 25000,
        cooldown: 1440,
        dailyLimit: 1,
        requiredTier: 'platinum',
        description: 'Timeout a user for 1 day (auto-expires)'
      },
      {
        id: 'unmute',
        name: 'Server Unmute',
        cost: 100000,
        cooldown: 1440,
        dailyLimit: 1,
        requiredTier: 'platinum',
        description: 'Unmute a user in voice channels (~1,667 hours in VC)'
      },
      
      // Diamond tier actions (most powerful)
      {
        id: 'timeout-7days',
        name: 'Timeout 7 Days',
        cost: 75000,
        cooldown: 2880,
        dailyLimit: 1,
        requiredTier: 'diamond',
        description: 'Timeout a user for 7 days (auto-expires)'
      },
      {
        id: 'mute',
        name: 'Server Mute',
        cost: 120000,
        cooldown: 1440,
        dailyLimit: 1,
        requiredTier: 'diamond',
        description: 'Mute a user in voice channels (~2,000 hours in VC)'
      },
      {
        id: 'deafen',
        name: 'Server Deafen',
        cost: 120000,
        cooldown: 1440,
        dailyLimit: 1,
        requiredTier: 'diamond',
        description: 'Deafen a user in voice channels (~2,000 hours in VC)'
      },
      {
        id: 'undeafen',
        name: 'Server Undeafen',
        cost: 100000,
        cooldown: 1440,
        dailyLimit: 1,
        requiredTier: 'diamond',
        description: 'Undeafen a user in voice channels (~1,667 hours in VC)'
      },
      {
        id: 'role-give',
        name: 'Give Role',
        cost: 1000000, // Top role cost, actual cost calculated dynamically (top role = 1M, lower roles cost less)
        cooldown: 1440,
        dailyLimit: 1,
        requiredTier: 'diamond',
        description: 'Give a role to a user (top role costs 1M credits, lower roles cost exponentially less)'
      },
      {
        id: 'role-take',
        name: 'Take Role',
        cost: 1000000, // Top role cost, actual cost calculated dynamically (top role = 1M, lower roles cost less)
        cooldown: 1440,
        dailyLimit: 1,
        requiredTier: 'diamond',
        description: 'Remove a role from a user (top role costs 1M credits, lower roles cost exponentially less)'
      }
    ],
    tierThresholds: {
      bronze: 0,
      silver: 10000,
      gold: 25000,
      platinum: 50000,
      diamond: 100000
    }
  }
}

export function loadStatbotConfig(): StatbotConfig {
  return {
    apiKey: process.env.STATBOT_API_KEY || '',
    enabled: process.env.STATBOT_ENABLED === 'true',
    syncInterval: parseInt(process.env.STATBOT_SYNC_INTERVAL || '3600000'), // 1 hour default
    fallbackEnabled: process.env.STATBOT_FALLBACK_ENABLED !== 'false' // true by default
  }
}

export function loadConfig(): BotConfig {
  return {
    token: validateRequiredEnvVar('DISCORD_TOKEN'),
    clientId: validateRequiredEnvVar('DISCORD_CLIENT_ID'),
    guildId: validateRequiredEnvVar('DISCORD_GUILD_ID'),
    verification: loadVerificationConfig(),
    currency: loadCurrencyConfig(),
    environment: process.env.NODE_ENV || 'development'
  }
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
} 