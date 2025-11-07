import { EmbedBuilder, GuildMember } from 'discord.js'
import { EmbedOptions, CurrencyUser, CurrencyTier, ModerationLog, CurrencyTransaction } from '@/types'

const COLORS = {
  SUCCESS: 0x00ff00, // Green
  ERROR: 0xff0000,   // Red
  WARNING: 0xffa500, // Orange
  INFO: 0x0099ff,    // Blue
  VERIFICATION: 0x9b59b6, // Purple
  CURRENCY: 0xffd700, // Gold
  BRONZE: 0xcd7f32,   // Bronze
  SILVER: 0xc0c0c0,   // Silver
  GOLD: 0xffd700,     // Gold
  PLATINUM: 0xe5e4e2, // Platinum
  DIAMOND: 0xb9f2ff   // Diamond
} as const

export function createEmbed(options: EmbedOptions): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(options.color || COLORS.INFO)

  if (options.title) {
    embed.setTitle(options.title)
  }

  if (options.description) {
    embed.setDescription(options.description)
  }

  if (options.fields) {
    embed.addFields(options.fields)
  }

  if (options.footer) {
    embed.setFooter({
      text: options.footer.text,
      ...(options.footer.iconURL && { iconURL: options.footer.iconURL })
    })
  }

  if (options.timestamp) {
    embed.setTimestamp()
  }

  return embed
}

export function createVerificationSuccessEmbed(
  targetUser: GuildMember,
  verifier: GuildMember,
  reason?: string
): EmbedBuilder {
  const fields = [
    {
      name: '✅ Verification Successful',
      value: `**Target User:** ${targetUser.user.tag} (<@${targetUser.id}>)`,
      inline: false
    },
    {
      name: '🔐 Verified By',
      value: `${verifier.user.tag} (<@${verifier.id}>)`,
      inline: true
    }
  ]

  if (reason) {
    fields.push({
      name: '📝 Reason',
      value: reason,
      inline: true
    })
  }

  return createEmbed({
    title: 'User Verification',
    color: COLORS.SUCCESS,
    fields,
    timestamp: true
  })
}

export function createVerificationLogEmbed(
  targetUser: GuildMember,
  verifier: GuildMember,
  reason?: string
): EmbedBuilder {
  const fields = [
    {
      name: '👤 User Verified',
      value: `**User:** <@${targetUser.id}>\n**Username:** ${targetUser.user.tag}`,
      inline: true
    },
    {
      name: '🔐 Verified By',
      value: `**User:** <@${verifier.id}>\n**Username:** ${verifier.user.tag}`,
      inline: true
    }
  ]

  if (reason) {
    fields.push({
      name: '📝 Reason',
      value: reason,
      inline: false
    })
  }

  return createEmbed({
    title: 'Verification Log',
    color: COLORS.VERIFICATION,
    fields,
    timestamp: true,
    footer: {
      text: 'Mira Verification Bot'
    }
  })
}

export function createAlreadyVerifiedEmbed(targetUser: GuildMember): EmbedBuilder {
  return createEmbed({
    title: '✅ Already Verified',
    description: `${targetUser.user.tag} (<@${targetUser.id}>) is already verified.`,
    color: COLORS.SUCCESS,
    timestamp: true
  })
}

export function createErrorEmbed(message: string): EmbedBuilder {
  return createEmbed({
    title: '❌ Error',
    description: message,
    color: COLORS.ERROR,
    timestamp: true
  })
}

export function createWarningEmbed(message: string): EmbedBuilder {
  return createEmbed({
    title: '⚠️ Warning',
    description: message,
    color: COLORS.WARNING,
    timestamp: true
  })
}

// Currency-specific embeds
export function createBalanceEmbed(user: CurrencyUser, member?: GuildMember): EmbedBuilder {
  const tierEmoji = getTierEmoji(user.tier)
  const tierColor = getTierColor(user.tier)
  
  const fields = [
    {
      name: '💰 Current Balance',
      value: `${user.balance.toLocaleString()} Social Credits`,
      inline: true
    },
    {
      name: '🏆 Tier',
      value: `${tierEmoji} ${user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}`,
      inline: true
    },
    {
      name: '⬆️ Next Tier',
      value: getNextTierInfo(user.tier),
      inline: true
    },
    {
      name: '📊 Total Earned',
      value: `${user.totalEarned.toLocaleString()} Social Credits`,
      inline: true
    },
    {
      name: '🎤 Voice Time',
      value: `${Math.floor(user.voiceTimeMinutes / 60)}h ${user.voiceTimeMinutes % 60}m`,
      inline: true
    },
        {
          name: '⏰ Last Active',
          value: `<t:${Math.floor((user.lastActive instanceof Date ? user.lastActive : new Date(user.lastActive)).getTime() / 1000)}:R>`,
          inline: true
        }
  ]

  return createEmbed({
    title: `💰 ${member?.user.tag || 'User'}'s Balance`,
    color: tierColor,
    fields,
    timestamp: true,
    footer: {
      text: 'Mira Currency System'
    }
  })
}

export function createLeaderboardEmbed(users: CurrencyUser[], type: 'balance' | 'voice' = 'balance'): EmbedBuilder {
  const title = type === 'balance' ? '💰 Currency Leaderboard' : '🎤 Voice Time Leaderboard'
  const color = type === 'balance' ? COLORS.CURRENCY : COLORS.INFO
  
  const fields = users.map((user, index) => {
    const tierEmoji = getTierEmoji(user.tier)
    const value = type === 'balance' 
      ? `${user.balance.toLocaleString()} Social Credits`
      : `${Math.floor(user.voiceTimeMinutes / 60)}h ${user.voiceTimeMinutes % 60}m`
    
    return {
      name: `${getRankEmoji(index + 1)} ${tierEmoji} <@${user.userId}>`,
      value: value,
      inline: false
    }
  })

  return createEmbed({
    title,
    color,
    fields,
    timestamp: true,
    footer: {
      text: `Showing top ${users.length} users`
    }
  })
}

export function createModerationLogEmbed(log: ModerationLog): EmbedBuilder {
  const statusEmoji = log.success ? '✅' : '❌'
  const statusColor = log.success ? COLORS.SUCCESS : COLORS.ERROR
  
  const fields = [
    {
      name: '🛡️ Action',
      value: log.action,
      inline: true
    },
    {
      name: '👤 Moderator',
      value: `<@${log.moderatorId}>`,
      inline: true
    },
    {
      name: '🎯 Target',
      value: `<@${log.targetId}>`,
      inline: true
    },
    {
      name: '💰 Cost',
      value: `${log.cost.toLocaleString()} Social Credits`,
      inline: true
    },
    {
      name: '📝 Reason',
      value: log.reason,
      inline: false
    }
  ]

  if (log.error) {
    fields.push({
      name: '❌ Error',
      value: log.error,
      inline: false
    })
  }

  return createEmbed({
    title: `${statusEmoji} Moderation Action`,
    color: statusColor,
    fields,
    timestamp: true,
    footer: {
      text: 'Mira Moderation System'
    }
  })
}

export function createModerationActionEmbed(
  action: string,
  target: GuildMember,
  cost: number,
  reason: string
): EmbedBuilder {
  return createEmbed({
    title: '🛡️ Moderation Action Performed',
    color: COLORS.WARNING,
    fields: [
      {
        name: 'Action',
        value: action,
        inline: true
      },
      {
        name: 'Target',
        value: `${target.user.tag} (<@${target.id}>)`,
        inline: true
      },
      {
        name: 'Cost',
        value: `${cost.toLocaleString()} Social Credits`,
        inline: true
      },
      {
        name: 'Reason',
        value: reason,
        inline: false
      }
    ],
    timestamp: true
  })
}

export function createCurrencyTransactionEmbed(
  transaction: CurrencyTransaction,
  member?: GuildMember
): EmbedBuilder {
  const typeEmoji = transaction.type === 'earn' ? '💰' : transaction.type === 'spend' ? '💸' : '🔄'
  const typeColor = transaction.type === 'earn' ? COLORS.SUCCESS : transaction.type === 'spend' ? COLORS.ERROR : COLORS.INFO
  
  const fields = [
    {
      name: '👤 User',
      value: member ? `${member.user.tag} (<@${member.id}>)` : `<@${transaction.userId}>`,
      inline: true
    },
    {
      name: '💵 Amount',
      value: `${transaction.amount > 0 ? '+' : ''}${transaction.amount.toLocaleString()} Social Credits`,
      inline: true
    },
    {
      name: '📝 Reason',
      value: transaction.reason,
      inline: false
    }
  ]

  if (transaction.metadata?.voiceTime) {
    fields.push({
      name: '🎤 Voice Time',
      value: `${transaction.metadata.voiceTime} minutes`,
      inline: true
    })
  }

  return createEmbed({
    title: `${typeEmoji} Currency Transaction`,
    color: typeColor,
    fields,
    timestamp: true,
    footer: {
      text: 'Mira Currency System'
    }
  })
}

// Utility functions
function getTierEmoji(tier: CurrencyTier): string {
  const emojis = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    diamond: '💠'
  }
  return emojis[tier] || '🥉'
}

function getTierColor(tier: CurrencyTier): number {
  const colors = {
    bronze: COLORS.BRONZE,
    silver: COLORS.SILVER,
    gold: COLORS.GOLD,
    platinum: COLORS.PLATINUM,
    diamond: COLORS.DIAMOND
  }
  return colors[tier] || COLORS.BRONZE
}

function getRankEmoji(rank: number): string {
  const emojis = {
    1: '🥇',
    2: '🥈',
    3: '🥉'
  }
  return emojis[rank as keyof typeof emojis] || `${rank}.`
}

function getNextTierInfo(currentTier: CurrencyTier): string {
  const tierInfo = {
    bronze: '🥈 Silver: 10,000 Social Credits',
    silver: '🥇 Gold: 25,000 Social Credits',
    gold: '💎 Platinum: 50,000 Social Credits',
    platinum: '💠 Diamond: 100,000 Social Credits',
    diamond: 'Max tier reached!'
  }
  return tierInfo[currentTier] || 'Unknown tier'
}

export { COLORS } 