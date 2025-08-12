import { EmbedBuilder, GuildMember } from 'discord.js'
import { EmbedOptions } from '@/types'

const COLORS = {
  SUCCESS: 0x00ff00, // Green
  ERROR: 0xff0000,   // Red
  WARNING: 0xffa500, // Orange
  INFO: 0x0099ff,    // Blue
  VERIFICATION: 0x9b59b6 // Purple
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

export { COLORS } 