import { 
  ChatInputCommandInteraction, 
  GuildMember, 
  TextChannel,
  PermissionResolvable 
} from 'discord.js'
import { EmbedBuilder } from 'discord.js'

export interface VerificationConfig {
  unverifiedRoleId: string
  verifiedRoleId: string
  verifierRoleId: string
  logChannelId: string
}

export interface VerificationResult {
  success: boolean
  message: string
  targetUser?: GuildMember
  verifier?: GuildMember
  reason?: string | undefined
  alreadyVerified?: boolean
}

export interface CommandContext {
  interaction: ChatInputCommandInteraction
  config: VerificationConfig
}

export interface LogEntry {
  targetUser: GuildMember
  verifier: GuildMember
  reason?: string
  timestamp: Date
}

export interface BotConfig {
  token: string
  clientId: string
  guildId: string
  verification: VerificationConfig
  currency: CurrencyConfig
  environment: string
}

export interface CommandPermissions {
  requiredRoles: string[]
  requiredPermissions: PermissionResolvable[]
}

export interface EmbedOptions {
  title?: string
  description?: string
  color?: number
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  footer?: {
    text: string
    iconURL?: string
  }
  timestamp?: boolean
}

// Currency System Types
export interface CurrencyUser {
  userId: string
  balance: number
  totalEarned: number
  lastActive: Date
  voiceTimeMinutes: number
  tier: CurrencyTier
}

export interface VoiceSession {
  userId: string
  channelId: string
  startTime: Date
  endTime?: Date
  duration?: number // in minutes
}

export interface CurrencyTransaction {
  id: string
  userId: string
  type: 'earn' | 'spend' | 'refund'
  amount: number
  reason: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ModerationAction {
  id: string
  name: string
  cost: number
  cooldown: number // minutes
  dailyLimit: number
  requiredTier: CurrencyTier
  description: string
}

export interface ModerationLog {
  id: string
  moderatorId: string
  targetId: string
  action: string
  cost: number
  reason: string
  timestamp: Date
  success: boolean
  error?: string
}

export interface CurrencyConfig {
  currencyPerMinute: number
  protectedRoles: string[]
  auditChannelId: string
  moderationActions: ModerationAction[]
  tierThresholds: Record<CurrencyTier, number>
}

export type CurrencyTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export interface CurrencyResult {
  success: boolean
  message: string
  newBalance?: number
  tier?: CurrencyTier
} 