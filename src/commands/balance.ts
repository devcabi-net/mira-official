import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags
} from 'discord.js'
import { CurrencyService } from '@/services/currencyService'
import { CurrencyConfig } from '@/types'
import { createBalanceEmbed, createErrorEmbed } from '@/utils/embeds'

export const data = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('Check your currency balance and tier')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('User to check balance for (optional)')
      .setRequired(false)
  )

export async function execute(
  interaction: ChatInputCommandInteraction,
  config: CurrencyConfig,
  currencyService: CurrencyService
): Promise<void> {
  let deferred = false
  
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    deferred = true

    const targetUser = interaction.options.getUser('user')
    const userId = targetUser?.id || interaction.user.id
    const member = interaction.guild?.members.cache.get(userId) as GuildMember

    // Get user data
    const user = await currencyService.getUser(userId)
    
    if (!user) {
      if (deferred && !interaction.replied) {
        await interaction.editReply({
          embeds: [createErrorEmbed('User not found in currency system.')]
        })
      }
      return
    }

    // Create balance embed
    const embed = createBalanceEmbed(user, member)
    if (deferred && !interaction.replied) {
      await interaction.editReply({ embeds: [embed] })
    }

  } catch (error: any) {
    console.error('Error executing balance command:', error)
    
    // Handle "Unknown interaction" error - interaction expired
    if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
      console.warn('Interaction expired before response could be sent')
      return
    }
    
    // Try to respond if interaction is still valid
    try {
      if (deferred && !interaction.replied) {
        await interaction.editReply({
          embeds: [createErrorEmbed('An error occurred while checking balance.')]
        })
      } else if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [createErrorEmbed('An error occurred while checking balance.')],
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
