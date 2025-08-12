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