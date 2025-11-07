import { 
  TextChannel, 
  GuildMember, 
  ChatInputCommandInteraction,
  Guild
} from 'discord.js'
import { 
  createVerificationLogEmbed, 
  createModerationLogEmbed,
  createCurrencyTransactionEmbed 
} from '@/utils/embeds'
import { ModerationLog, CurrencyTransaction } from '@/types'

export class LoggingService {
  private logChannelId: string

  constructor(logChannelId: string) {
    this.logChannelId = logChannelId
  }

  private async getLogChannel(guild: Guild): Promise<TextChannel | null> {
    try {
      const logChannel = guild.channels.cache.get(this.logChannelId) as TextChannel
      if (!logChannel) {
        console.warn('Log channel not found:', this.logChannelId)
        return null
      }
      return logChannel
    } catch (error) {
      console.error('Failed to get log channel:', error)
      return null
    }
  }

  // Verification logging (existing functionality)
  async logVerification(
    interaction: ChatInputCommandInteraction,
    targetUser: GuildMember,
    verifier: GuildMember,
    reason?: string
  ): Promise<void> {
    try {
      const logChannel = await this.getLogChannel(interaction.guild!)
      if (!logChannel) return

      const logEmbed = createVerificationLogEmbed(targetUser, verifier, reason)
      await logChannel.send({ embeds: [logEmbed] })
    } catch (error) {
      console.error('Failed to log verification:', error)
      // Don't fail the verification if logging fails
    }
  }

  // Currency transaction logging
  async logCurrencyTransaction(
    guild: Guild,
    transaction: CurrencyTransaction,
    member?: GuildMember
  ): Promise<void> {
    try {
      const logChannel = await this.getLogChannel(guild)
      if (!logChannel) return

      const embed = createCurrencyTransactionEmbed(transaction, member)
      await logChannel.send({ embeds: [embed] })
    } catch (error) {
      console.error('Failed to log currency transaction:', error)
    }
  }

  // Moderation action logging
  async logModerationAction(
    guild: Guild,
    log: ModerationLog
  ): Promise<void> {
    try {
      const logChannel = await this.getLogChannel(guild)
      if (!logChannel) return

      const embed = createModerationLogEmbed(log)
      await logChannel.send({ embeds: [embed] })
    } catch (error) {
      console.error('Failed to log moderation action:', error)
    }
  }

  // Voice time milestone logging
  async logVoiceMilestone(
    guild: Guild,
    member: GuildMember,
    voiceTimeMinutes: number,
    currencyEarned: number
  ): Promise<void> {
    try {
      const logChannel = await this.getLogChannel(guild)
      if (!logChannel) return

      const hours = Math.floor(voiceTimeMinutes / 60)
      const minutes = voiceTimeMinutes % 60

      const embed = {
        title: '🎤 Voice Time Milestone',
        color: 0x00ff00,
        fields: [
          {
            name: '👤 User',
            value: `${member.user.tag} (<@${member.id}>)`,
            inline: true
          },
          {
            name: '⏰ Voice Time',
            value: `${hours}h ${minutes}m`,
            inline: true
          },
          {
            name: '💰 Currency Earned',
            value: `${currencyEarned.toLocaleString()} Social Credits`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Mira Currency System'
        }
      }

      await logChannel.send({ embeds: [embed] })
    } catch (error) {
      console.error('Failed to log voice milestone:', error)
    }
  }

  // Tier upgrade logging
  async logTierUpgrade(
    guild: Guild,
    member: GuildMember,
    oldTier: string,
    newTier: string,
    balance: number
  ): Promise<void> {
    try {
      const logChannel = await this.getLogChannel(guild)
      if (!logChannel) return

      const tierEmojis = {
        bronze: '🥉',
        silver: '🥈',
        gold: '🥇',
        platinum: '💎',
        diamond: '💠'
      }

      const embed = {
        title: '🏆 Tier Upgrade!',
        color: 0xffd700,
        fields: [
          {
            name: '👤 User',
            value: `${member.user.tag} (<@${member.id}>)`,
            inline: true
          },
          {
            name: '📈 Tier Change',
            value: `${tierEmojis[oldTier as keyof typeof tierEmojis] || '🥉'} → ${tierEmojis[newTier as keyof typeof tierEmojis] || '🥉'}`,
            inline: true
          },
          {
            name: '💰 Current Balance',
            value: `${balance.toLocaleString()} Social Credits`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Mira Currency System'
        }
      }

      await logChannel.send({ embeds: [embed] })
    } catch (error) {
      console.error('Failed to log tier upgrade:', error)
    }
  }
}
