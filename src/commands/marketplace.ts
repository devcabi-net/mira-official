import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  GuildMember, 
  MessageFlags,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'
import { CurrencyService } from '@/services/currencyService'
import { CurrencyConfig, ModerationAction } from '@/types'
import { createErrorEmbed, createEmbed } from '@/utils/embeds'
import { calculateRoleCost, canManageRole, isProtectedRole } from '@/utils/rolePricing'

export const data = new SlashCommandBuilder()
  .setName('marketplace')
  .setDescription('Purchase moderation actions with your Social Credits')
  .addSubcommand(subcommand =>
    subcommand
      .setName('action')
      .setDescription('Purchase a moderation action')
      .addStringOption(option =>
        option
          .setName('action')
          .setDescription('Choose the moderation action')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addUserOption(option =>
        option
          .setName('target')
          .setDescription('User to moderate')
          .setRequired(false)
      )
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('Role to give/take (only for role actions)')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason for the action (optional)')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('nickname')
          .setDescription('New nickname (only for rename action)')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('upgrade')
      .setDescription('Purchase tier upgrades')
      .addStringOption(option =>
        option
          .setName('tier')
          .setDescription('Choose tier to upgrade to')
          .setRequired(true)
          .addChoices(
            { name: '🥈 Silver Tier (10,000 credits)', value: 'silver' },
            { name: '🥇 Gold Tier (25,000 credits)', value: 'gold' },
            { name: '💎 Platinum Tier (50,000 credits)', value: 'platinum' },
            { name: '💠 Diamond Tier (100,000 credits)', value: 'diamond' }
          )
      )
  )

export async function execute(
  interaction: ChatInputCommandInteraction,
  config: CurrencyConfig,
  currencyService: CurrencyService
): Promise<void> {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const member = interaction.member as GuildMember
    const user = await currencyService.getUser(member.id)
    
    if (!user) {
      await interaction.editReply({
        embeds: [createErrorEmbed('You are not in the currency system. Join a voice channel to start earning!')]
      })
      return
    }

    const subcommand = interaction.options.getSubcommand()

    if (subcommand === 'action') {
      await handleModerationAction(interaction, config, currencyService, user)
    } else if (subcommand === 'upgrade') {
      await handleTierUpgrade(interaction, config, currencyService, user)
    }

  } catch (error) {
    console.error('Error executing marketplace command:', error)
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while processing your request.')]
    })
  }
}

// Autocomplete handler for action options
export async function handleAutocomplete(
  interaction: any,
  config: CurrencyConfig,
  currencyService: CurrencyService
): Promise<void> {
  try {
    const focusedValue = interaction.options.getFocused()
    
    // Use getOrCreateUser instead of getUser to ensure new users can see options
    // This creates a user with default values (bronze tier, 0 balance) if they don't exist
    const user = await currencyService.getOrCreateUser(interaction.user.id)

    // IMPORTANT: Show ALL actions in autocomplete regardless of tier
    // Tier restrictions are enforced at execution time, not in autocomplete
    // This allows users to see what actions are available even if they can't use them yet
    let availableActions = config.moderationActions

    // Filter based on focused value (user's typed input)
    // If focusedValue is empty or just whitespace, show all actions
    const searchTerm = focusedValue?.trim().toLowerCase() || ''
    const filteredActions = searchTerm 
      ? availableActions.filter(action =>
          action.name.toLowerCase().includes(searchTerm) ||
          action.description.toLowerCase().includes(searchTerm) ||
          action.id.toLowerCase().includes(searchTerm)
        )
      : availableActions // Show all if no search term

    const choices = filteredActions.map(action => {
      // Calculate discounted cost based on user's tier
      const userTier = user?.tier || 'bronze'
      const discountedCost = currencyService.calculateDiscountedCost(action.cost, userTier)
      const discountAmount = action.cost - discountedCost
      
      // For role actions, show note about dynamic pricing
      if (action.id === 'role-give' || action.id === 'role-take') {
        // Role actions use dynamic pricing based on role hierarchy
        // Show base cost with discount note if applicable
        const discountNote = discountAmount > 0 ? ` (${discountAmount.toLocaleString()} off for ${userTier} tier)` : ''
        return {
          name: `${action.name} (Dynamic pricing - select role)${discountNote}`,
          value: action.id
        }
      }
      
      // For other actions, show discounted price with original price if discounted
      if (discountAmount > 0) {
        return {
          name: `${action.name} (${discountedCost.toLocaleString()} credits, was ${action.cost.toLocaleString()})`,
          value: action.id
        }
      } else {
        return {
          name: `${action.name} (${action.cost.toLocaleString()} credits)`,
          value: action.id
        }
      }
    })

    // Always respond, even if empty (Discord requires a response within 3 seconds)
    // If there are no matching actions, send empty array rather than failing silently
    await interaction.respond(choices.slice(0, 25)) // Discord limit
  } catch (error: any) {
    console.error('Error in autocomplete handler:', error)
    console.error('Error details:', {
      userId: interaction.user?.id,
      commandName: interaction.commandName,
      focusedValue: interaction.options?.getFocused?.(),
      errorCode: error.code,
      errorMessage: error.message
    })
    
    // If interaction already responded or expired, just log and return
    if (error.code === 10062 || error.message?.includes('Unknown interaction') || error.message?.includes('already been responded')) {
      console.warn('Autocomplete interaction expired or already responded')
      return
    }
    
    // Try to respond with empty array as fallback to prevent "No options found" error
    try {
      if (!interaction.responded) {
        await interaction.respond([])
      }
    } catch (respondError: any) {
      // If we can't respond, log it but don't throw - interaction may have expired
      if (respondError.code !== 10062) {
        console.error('Failed to send autocomplete fallback response:', respondError)
      }
    }
  }
}

async function handleRoleAction(
  interaction: ChatInputCommandInteraction,
  config: CurrencyConfig,
  currencyService: CurrencyService,
  user: any,
  actionId: string,
  targetMember: GuildMember | null,
  reason: string
): Promise<void> {
  // Validate inputs
  if (!targetMember) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Target user is required for role actions.')]
    })
    return
  }

  const role = interaction.options.getRole('role')
  if (!role) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Role is required for role actions.')]
    })
    return
  }

  if (!interaction.guild) {
    await interaction.editReply({
      embeds: [createErrorEmbed('This command can only be used in a server.')]
    })
    return
  }

  // Check if role is protected
  const protectedRoles = config.protectedRoles || []
  if (isProtectedRole(role as any, protectedRoles)) {
    await interaction.editReply({
      embeds: [createErrorEmbed('This role is protected and cannot be managed through Social Credits.')]
    })
    return
  }

  // Check if bot can manage this role
  const botMember = await interaction.guild.members.fetch(interaction.client.user!.id)
  const botRole = botMember.roles.highest
  
  if (!canManageRole(botRole, role as any)) {
    await interaction.editReply({
      embeds: [createErrorEmbed('The bot cannot manage this role. The bot\'s role must be higher than the target role.')]
    })
    return
  }

  // Calculate dynamic cost based on role hierarchy
  // Top role costs 1,000,000 credits, lower roles cost exponentially less
  const baseDynamicCost = calculateRoleCost(role as any, interaction.guild)
  
  // Apply tier-based discount to dynamic role cost
  const discountedCost = currencyService.calculateDiscountedCost(baseDynamicCost, user.tier)
  const discountAmount = baseDynamicCost - discountedCost

  // Check if user has enough credits (using discounted cost)
  if (user.balance < discountedCost) {
    await interaction.editReply({
      embeds: [createErrorEmbed(
        `Insufficient Social Credits. Required: ${discountedCost.toLocaleString()} credits (cost based on role hierarchy${discountAmount > 0 ? `, ${discountAmount.toLocaleString()} discount for ${user.tier} tier` : ''}), Available: ${user.balance.toLocaleString()} credits`
      )]
    })
    return
  }

  // Check if target already has/doesn't have the role
  const hasRole = targetMember.roles.cache.has(role.id)
  if (actionId === 'role-give' && hasRole) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Target user already has this role.')]
    })
    return
  }
  if (actionId === 'role-take' && !hasRole) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Target user does not have this role.')]
    })
    return
  }

  // Check cooldown (no tier requirement - all actions available to all users)
  const roleAction = config.moderationActions.find(a => a.id === actionId)
  if (roleAction) {
    // Check cooldown manually (we bypass cost check since it's dynamic)
    const userCooldowns = (currencyService as any).userCooldowns
    if (userCooldowns) {
      const userCooldownMap = userCooldowns.get(interaction.user.id) || new Map()
      const lastUsed = userCooldownMap.get(actionId) || 0
      const now = Date.now()
      const cooldownMs = roleAction.cooldown * 60 * 1000
      
      if (now - lastUsed < cooldownMs) {
        const remainingMs = cooldownMs - (now - lastUsed)
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000))
        await interaction.editReply({
          embeds: [createErrorEmbed(`Action on cooldown. Available in ${remainingMinutes} minutes.`)]
        })
        return
      }
    }
  }

  // Deduct currency with discounted dynamic cost
  const deductResult = await currencyService.deductCurrency(
    interaction.user.id,
    discountedCost,
    `Role ${actionId === 'role-give' ? 'give' : 'take'}: ${role.name}`,
    { targetId: targetMember.id, roleId: role.id, actionId, originalCost: baseDynamicCost, discountedCost, userTier: user.tier },
    interaction.guild,
    interaction.member as any
  )

  if (!deductResult.success) {
    await interaction.editReply({
      embeds: [createErrorEmbed(deductResult.message)]
    })
    return
  }
  
  // Set cooldown after successful currency deduction
  if (roleAction) {
    currencyService.setActionCooldown(interaction.user.id, actionId, roleAction.cooldown)
  }

  // Perform the role action
  try {
    if (actionId === 'role-give') {
      await targetMember.roles.add(role.id, reason)
    } else {
      await targetMember.roles.remove(role.id, reason)
    }

    const actionName = actionId === 'role-give' ? 'Give Role' : 'Take Role'
    const discountMessage = discountAmount > 0 
      ? `\n🎉 Discount: ${discountAmount.toLocaleString()} credits (${user.tier} tier discount!)`
      : ''
    const embed = createEmbed({
      title: '✅ Role Action Successful',
      description: `**${actionName}** performed successfully!\n\n💰 Cost: ${discountedCost.toLocaleString()} Social Credits${discountMessage}\n👤 Target: ${targetMember.user.tag}\n🎭 Role: ${role.name}\n📝 Reason: ${reason}`,
      color: 0x00ff00,
      fields: [
        {
          name: '📊 Role Hierarchy Info',
          value: `Role Position: ${(role as any).position}\nBase Cost: ${baseDynamicCost.toLocaleString()} credits\nCost calculated based on role hierarchy position`,
          inline: false
        }
      ]
    })

    await interaction.editReply({ embeds: [embed] })

    // Log moderation action
    const log = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      moderatorId: interaction.user.id,
      targetId: targetMember.id,
      action: `${actionName}: ${role.name}`,
      cost: discountedCost, // Store the actual cost paid (with discount)
      reason,
      timestamp: new Date(),
      success: true
    }
    
    // Access services through the currencyService (need to make them accessible or add methods)
    // For now, we'll log directly via the service's internal methods
    // The currencyService already has access to dataService and loggingService
    if (interaction.guild) {
      // Log via CurrencyService's exposed services
      const dataService = currencyService.getDataService()
      const loggingService = currencyService.getLoggingService()
      
      await dataService.addModerationLog(log)
      await loggingService.logModerationAction(interaction.guild, log)
    }

  } catch (discordError: any) {
    console.error('Discord role action failed:', discordError)
    
    // Refund the currency
    await currencyService.addCurrency(
      interaction.user.id,
      discountedCost,
      `Refund for failed ${actionId} action`,
      { refund: true, originalCost: baseDynamicCost, discountedCost },
      interaction.guild,
      interaction.member as any
    )

    await interaction.editReply({
      embeds: [createErrorEmbed(`Failed to ${actionId === 'role-give' ? 'give' : 'take'} the role. Social Credits have been refunded. Error: ${discordError.message}`)]
    })
  }
}

async function handleTierUpgrade(
  interaction: ChatInputCommandInteraction,
  config: CurrencyConfig,
  currencyService: CurrencyService,
  user: any
): Promise<void> {
  const targetTier = interaction.options.getString('tier', true) as any
  
  try {
    const result = await currencyService.purchaseTierUpgrade(user.userId, targetTier)
    
    if (result.success) {
      // Get the cost from the tier upgrade configuration
      const tierCosts: Record<string, number> = {
        'silver': 10000,
        'gold': 25000,
        'platinum': 50000,
        'diamond': 100000
      }
      const cost = tierCosts[targetTier] || 0
      
      const embed = createEmbed({
        title: '🎉 Tier Upgrade Successful!',
        description: `You have successfully upgraded to **${targetTier.charAt(0).toUpperCase() + targetTier.slice(1)} Tier**!\n\n💰 Cost: ${cost.toLocaleString()} Social Credits\n🏆 New Tier: **${targetTier.charAt(0).toUpperCase() + targetTier.slice(1)}**\n\nYou now have access to more powerful moderation actions!`,
        color: 0x00ff00
      })
      
      await interaction.editReply({ embeds: [embed] })
    } else {
      await interaction.editReply({
        embeds: [createErrorEmbed(result.message)]
      })
    }
  } catch (error) {
    console.error('Error handling tier upgrade:', error)
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred during tier upgrade.')]
    })
  }
}

async function handleModerationAction(
  interaction: ChatInputCommandInteraction,
  config: CurrencyConfig,
  currencyService: CurrencyService,
  user: any
): Promise<void> {
  const actionId = interaction.options.getString('action', true)
  const targetMember = interaction.options.getMember('target') as GuildMember | null
  const reason = interaction.options.getString('reason') || 'No reason provided'
  
  // Handle dynamic role actions separately (they bypass normal currency check)
  if (actionId === 'role-give' || actionId === 'role-take') {
    await handleRoleAction(interaction, config, currencyService, user, actionId, targetMember, reason)
    return
  }

  const action = config.moderationActions.find(a => a.id === actionId)
  
  if (!action) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Action not found.')]
    })
    return
  }
  
  // For role actions in config, we need to validate differently (they use dynamic pricing)
  if (actionId === 'role-give' || actionId === 'role-take') {
    // This shouldn't happen since we handle it above, but just in case
    await interaction.editReply({
      embeds: [createErrorEmbed('Role actions require a role parameter.')]
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
  const protectedRoles = config.protectedRoles || []
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
    const nickname = interaction.options.getString('nickname')
    if (!nickname || nickname.trim().length === 0) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Nickname is required for rename action.')]
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
        // Discord max timeout is 28 days, 7 days = 168 hours
        await targetMember.timeout(7 * 24 * 60 * 60 * 1000, reason)
        break
      case 'remove-timeout':
        // Remove timeout by setting it to null
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

    // Show discount message if applicable
    const discountMessage = result.originalCost && result.cost && result.originalCost > result.cost
      ? `\n🎉 Discount: ${(result.originalCost - result.cost).toLocaleString()} credits (${user.tier} tier discount!)`
      : ''
    
    const embed = createEmbed({
      title: '✅ Moderation Action Successful',
      description: `**${action.name}** performed successfully!\n\n💰 Cost: ${result.cost?.toLocaleString()} Social Credits${discountMessage}\n👤 Target: ${targetMember.user.tag}\n📝 Reason: ${reason}`,
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
      embeds: [createErrorEmbed('Failed to apply the action. Social Credits have been refunded.')]
    })
  }
}

