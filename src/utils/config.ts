import dotenv from 'dotenv'
import { BotConfig, VerificationConfig } from '@/types'

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

export function loadConfig(): BotConfig {
  return {
    token: validateRequiredEnvVar('DISCORD_TOKEN'),
    clientId: validateRequiredEnvVar('DISCORD_CLIENT_ID'),
    guildId: validateRequiredEnvVar('DISCORD_GUILD_ID'),
    verification: loadVerificationConfig(),
    environment: process.env.NODE_ENV || 'development'
  }
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
} 