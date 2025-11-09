import { 
  Events, 
  Interaction, 
  ChatInputCommandInteraction,
  MessageFlags,
  ModalSubmitInteraction,
  AutocompleteInteraction
} from 'discord.js'
import { getCommands } from '@/commands'
import { VerificationConfig, CurrencyConfig } from '@/types'
import { CurrencyService } from '@/services/currencyService'
import { TimeoutTracker } from '@/services/timeoutTracker'
import { createErrorEmbed, createEmbed } from '@/utils/embeds'

export const name = Events.InteractionCreate
export const once = false

export async function execute(
  interaction: Interaction,
  verificationConfig?: VerificationConfig,
  currencyService?: CurrencyService,
  currencyConfig?: CurrencyConfig,
  timeoutTracker?: TimeoutTracker
): Promise<void> {
  if (!interaction.isChatInputCommand() && !interaction.isModalSubmit() && !interaction.isAutocomplete()) return

  // Handle autocomplete interactions
  if (interaction.isAutocomplete()) {
    if (!currencyService || !currencyConfig) {
      console.error('Currency service or config not provided for autocomplete')
      // Try to respond with empty array to prevent "No options found" error
      try {
        if (!interaction.responded) {
          await interaction.respond([])
        }
      } catch (error: any) {
        // Ignore errors if interaction expired
        if (error.code !== 10062) {
          console.error('Failed to send autocomplete error response:', error)
        }
      }
      return
    }
    
    try {
      await handleAutocomplete(interaction, currencyConfig, currencyService)
    } catch (error: any) {
      console.error('Error in autocomplete handler:', error)
      
      // Handle "Unknown interaction" error - interaction expired
      if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
        console.warn('Autocomplete interaction expired before response could be sent')
        return
      }
      
      // Try to respond with empty array as fallback
      try {
        if (!interaction.responded) {
          await interaction.respond([])
        }
      } catch (respondError: any) {
        // If we can't respond, just log it - interaction likely expired
        if (respondError.code !== 10062) {
          console.error('Failed to send autocomplete fallback response:', respondError)
        }
      }
    }
    return
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    if (!currencyService || !currencyConfig) {
      console.error('Currency service or config not provided for modal submissions')
      return
    }

    try {
      await handleModalSubmit(interaction, currencyService, currencyConfig, timeoutTracker)
    } catch (error: any) {
      console.error(`Error handling modal submission:`, error)
      
      // Handle "Unknown interaction" error - interaction expired
      if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
        console.warn('Interaction expired before response could be sent')
        return
      }
      
      const errorMessage = {
        embeds: [{
          title: '❌ Error',
          description: 'There was an error while processing your request!',
          color: 0xff0000
        }]
      }

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage)
        } else {
          await interaction.reply({ ...errorMessage, flags: MessageFlags.Ephemeral })
        }
      } catch (replyError: any) {
        // If we can't reply, just log it - interaction likely expired
        if (replyError.code !== 10062) {
          console.error('Failed to send error response:', replyError)
        }
      }
    }
    return
  }

  const command = getCommands().get(interaction.commandName)

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`)
    return
  }

  try {
    // Pass appropriate config based on command type
    if (interaction.commandName === 'verify') {
      await command.execute(interaction, verificationConfig)
    } else if (['balance', 'leaderboard', 'moderate', 'tier', 'marketplace'].includes(interaction.commandName)) {
      if (!currencyService || !currencyConfig) {
        console.error('Currency service or config not provided for currency commands')
        return
      }
      await command.execute(interaction, currencyConfig, currencyService)
    } else {
      await command.execute(interaction)
    }
  } catch (error: any) {
    console.error(`Error executing ${interaction.commandName}:`, error)
    
    // Handle "Unknown interaction" error - interaction expired
    if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
      console.warn('Interaction expired before response could be sent')
      return
    }
    
    const errorMessage = {
      embeds: [{
        title: '❌ Error',
        description: 'There was an error while executing this command!',
        color: 0xff0000
      }]
    }

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage)
      } else {
        await interaction.reply({ ...errorMessage, flags: MessageFlags.Ephemeral })
      }
    } catch (replyError: any) {
      // If we can't reply, just log it - interaction likely expired
      if (replyError.code !== 10062) {
        console.error('Failed to send error response:', replyError)
      }
    }
  }
}

async function handleModalSubmit(
  interaction: ModalSubmitInteraction,
  currencyService: CurrencyService,
  currencyConfig: CurrencyConfig,
  timeoutTracker?: TimeoutTracker
): Promise<void> {
  const customId = interaction.customId
  
  if (customId.startsWith('moderation_') && customId.endsWith('_modal')) {
    // Handle moderation action modals
    await handleModerationModal(interaction, currencyService, currencyConfig)
    return
  }
  
  if (customId.startsWith('custom_') && customId.endsWith('_modal')) {
    const actionType = customId.replace('custom_', '').replace('_modal', '')
    const duration = parseInt(interaction.fields.getTextInputValue('duration'))
    const targetInput = interaction.fields.getTextInputValue('target')
    const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided'

    // Validate duration
    if (isNaN(duration) || duration < 1 || duration > 1440) {
      await interaction.reply({
        embeds: [createErrorEmbed('Duration must be between 1 and 1440 minutes.')],
        flags: MessageFlags.Ephemeral
      })
      return
    }

    // Parse target user
    let targetMember
    try {
      // Try to parse as user mention or ID
      const targetId = targetInput.replace(/[<@!>]/g, '')
      targetMember = await interaction.guild?.members.fetch(targetId)
    } catch (error) {
      await interaction.reply({
        embeds: [createErrorEmbed('Could not find the target user.')],
        flags: MessageFlags.Ephemeral
      })
      return
    }

    if (!targetMember) {
      await interaction.reply({
        embeds: [createErrorEmbed('Target user not found in this server.')],
        flags: MessageFlags.Ephemeral
      })
      return
    }

    // Check protected roles
    const protectedRoles = currencyConfig.protectedRoles || []
    const targetHasProtectedRole = targetMember.roles.cache.some(role => 
      protectedRoles.includes(role.id)
    )

    if (targetHasProtectedRole) {
      await interaction.reply({
        embeds: [createErrorEmbed('Cannot moderate users with protected roles.')],
        flags: MessageFlags.Ephemeral
      })
      return
    }

    // Calculate cost based on action type
    const costs = {
      timeout: 100,    // 100 Social Credits per minute
      mute: 50,        // 50 Social Credits per minute
      deafen: 75       // 75 Social Credits per minute
    }
    
    const costPerMinute = costs[actionType as keyof typeof costs] || 100
    const totalCost = duration * costPerMinute

    // Check if user has enough currency
    const user = await currencyService.getUser(interaction.user.id)
    if (!user || user.balance < totalCost) {
      await interaction.reply({
        embeds: [createErrorEmbed(`Insufficient currency. Required: ${totalCost.toLocaleString()} Social Credits, Available: ${user?.balance.toLocaleString() || 0} Social Credits`)],
        flags: MessageFlags.Ephemeral
      })
      return
    }

    // Deduct currency
    const deductResult = await currencyService.deductCurrency(
      interaction.user.id,
      totalCost,
      `Custom ${actionType} for ${duration} minutes`,
      { targetId: targetMember.id, duration, actionType },
      interaction.guild!,
      interaction.member as any
    )

    if (!deductResult.success) {
      await interaction.reply({
        embeds: [createErrorEmbed(deductResult.message)],
        flags: MessageFlags.Ephemeral
      })
      return
    }

    // Perform the Discord action
    try {
      switch (actionType) {
        case 'timeout':
          await targetMember.timeout(duration * 60 * 1000, reason)
          break
        case 'mute':
          await targetMember.voice.setMute(true, reason)
          // Set up automatic unmute after duration
          if (timeoutTracker) {
            await timeoutTracker.addTimeout(
              targetMember.id,
              interaction.guild!.id,
              'server_mute',
              duration,
              interaction.user.id,
              reason
            )
          }
          break
        case 'deafen':
          await targetMember.voice.setDeaf(true, reason)
          // Set up automatic undeafen after duration
          if (timeoutTracker) {
            await timeoutTracker.addTimeout(
              targetMember.id,
              interaction.guild!.id,
              'server_deafen',
              duration,
              interaction.user.id,
              reason
            )
          }
          break
      }

      const embed = createEmbed({
        title: '✅ Action Successful',
        description: `Successfully applied custom ${actionType} for ${duration} minutes`,
        color: 0x00ff00,
        fields: [
          {
            name: '🎯 Target',
            value: `${targetMember.user.tag} (<@${targetMember.id}>)`,
            inline: true
          },
          {
            name: '⏰ Duration',
            value: `${duration} minutes`,
            inline: true
          },
          {
            name: '💰 Cost',
            value: `${totalCost.toLocaleString()} Social Credits`,
            inline: true
          },
          {
            name: '📝 Reason',
            value: reason,
            inline: false
          }
        ]
      })

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      })

    } catch (discordError) {
      console.error('Discord action failed:', discordError)
      
      // Refund the currency
      await currencyService.addCurrency(
        interaction.user.id,
        totalCost,
        `Refund for failed ${actionType} action`,
        { refund: true, originalCost: totalCost },
        interaction.guild!,
        interaction.member as any
      )

      await interaction.reply({
        embeds: [createErrorEmbed('Failed to apply the action. Currency has been refunded.')],
        flags: MessageFlags.Ephemeral
      })
    }
  }
}

async function handleModerationModal(
  interaction: ModalSubmitInteraction,
  currencyService: CurrencyService,
  currencyConfig: CurrencyConfig
): Promise<void> {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    
    const customId = interaction.customId
    const actionId = customId.replace('moderation_', '').replace('_modal', '')
    const targetInput = interaction.fields.getTextInputValue('target')
    const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided'
    
    // Parse target user
    let targetMember
    try {
      const targetId = targetInput.replace(/[<@!>]/g, '')
      targetMember = await interaction.guild?.members.fetch(targetId)
    } catch (error) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Could not find the target user.')]
      })
      return
    }

    if (!targetMember) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Target user not found in this server.')]
      })
      return
    }

    // Check protected roles
    const protectedRoles = currencyConfig.protectedRoles || []
    const targetHasProtectedRole = targetMember.roles.cache.some(role => 
      protectedRoles.includes(role.id)
    )

    if (targetHasProtectedRole) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Cannot moderate users with protected roles.')]
      })
      return
    }

    // Get additional input for rename action
    let additionalData: any = {}
    if (actionId === 'rename') {
      const nickname = interaction.fields.getTextInputValue('nickname')
      if (!nickname || nickname.trim().length === 0) {
        await interaction.editReply({
          embeds: [createErrorEmbed('Nickname cannot be empty.')]
        })
        return
      }
      additionalData.nickname = nickname.trim()
    }

    // Perform the moderation action
    const result = await currencyService.performModerationAction(
      interaction.user.id,
      targetMember.id,
      actionId,
      reason,
      interaction.guild!
    )

    if (!result.success) {
      await interaction.editReply({
        embeds: [createErrorEmbed(result.message)]
      })
      return
    }

    // Actually perform the Discord action
    try {
      switch (actionId) {
        case 'rename':
          await targetMember.setNickname(additionalData.nickname, reason)
          break
        case 'timeout-5min':
          await targetMember.timeout(5 * 60 * 1000, reason)
          break
        case 'timeout-1hour':
          await targetMember.timeout(60 * 60 * 1000, reason)
          break
        case 'timeout-1day':
          await targetMember.timeout(24 * 60 * 60 * 1000, reason)
          break
        case 'timeout-7days':
          await targetMember.timeout(7 * 24 * 60 * 60 * 1000, reason)
          break
        case 'remove-timeout':
          await targetMember.timeout(null, reason)
          break
        case 'mute':
          if (targetMember.voice.channel) {
            await targetMember.voice.setMute(true, reason)
          } else {
            throw new Error('User must be in a voice channel to mute')
          }
          break
        case 'unmute':
          if (targetMember.voice.channel) {
            await targetMember.voice.setMute(false, reason)
          } else {
            throw new Error('User must be in a voice channel to unmute')
          }
          break
        case 'deafen':
          if (targetMember.voice.channel) {
            await targetMember.voice.setDeaf(true, reason)
          } else {
            throw new Error('User must be in a voice channel to deafen')
          }
          break
        case 'undeafen':
          if (targetMember.voice.channel) {
            await targetMember.voice.setDeaf(false, reason)
          } else {
            throw new Error('User must be in a voice channel to undeafen')
          }
          break
      }

      const action = currencyConfig.moderationActions.find(a => a.id === actionId)
      const embed = createEmbed({
        title: '✅ Moderation Action Successful',
        description: `**${action?.name || 'Action'}** performed successfully!\n\n💰 Cost: ${result.cost?.toLocaleString()} Social Credits\n👤 Target: ${targetMember.user.tag}\n📝 Reason: ${reason}`,
        color: 0x00ff00
      })

      await interaction.editReply({ embeds: [embed] })
    } catch (discordError) {
      console.error('Discord moderation action failed:', discordError)
      
      // Refund the currency
      await currencyService.addCurrency(
        interaction.user.id,
        result.cost || 0,
        `Refund for failed ${actionId} action`,
        { refund: true, originalCost: result.cost },
        interaction.guild!,
        interaction.member as any
      )

      await interaction.editReply({
        embeds: [createErrorEmbed('Failed to apply the action. Currency has been refunded.')]
      })
    }
  } catch (error: any) {
    console.error('Error handling moderation modal:', error)
    
    // Handle "Unknown interaction" error - interaction expired
    if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
      console.warn('Interaction expired before response could be sent')
      return
    }
    
    try {
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({
          embeds: [createErrorEmbed('An error occurred while processing the moderation action.')]
        })
      } else if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [createErrorEmbed('An error occurred while processing the moderation action.')],
          flags: MessageFlags.Ephemeral
        })
      }
    } catch (replyError: any) {
      // If we can't reply, just log it - interaction likely expired
      if (replyError.code !== 10062) {
        console.error('Failed to send error response:', replyError)
      }
    }
  }
}

async function handleAutocomplete(
  interaction: AutocompleteInteraction,
  currencyConfig: CurrencyConfig,
  currencyService: CurrencyService
): Promise<void> {
  if (interaction.commandName !== 'marketplace') {
    // If it's not a marketplace command, respond with empty array
    try {
      if (!interaction.responded) {
        await interaction.respond([])
      }
    } catch (error: any) {
      if (error.code !== 10062) {
        console.error('Failed to respond to non-marketplace autocomplete:', error)
      }
    }
    return
  }
  
  try {
    // Import the marketplace autocomplete handler
    const { handleAutocomplete: marketplaceAutocomplete } = await import('@/commands/marketplace')
    await marketplaceAutocomplete(interaction, currencyConfig, currencyService)
  } catch (error: any) {
    console.error('Error in marketplace autocomplete handler:', error)
    // Re-throw to be handled by the outer try-catch
    throw error
  }
} 