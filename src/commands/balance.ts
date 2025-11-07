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
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const targetUser = interaction.options.getUser('user')
    const userId = targetUser?.id || interaction.user.id
    const member = interaction.guild?.members.cache.get(userId) as GuildMember

    // Get user data
    const user = await currencyService.getUser(userId)
    
    if (!user) {
      await interaction.editReply({
        embeds: [createErrorEmbed('User not found in currency system.')]
      })
      return
    }

    // Create balance embed
    const embed = createBalanceEmbed(user, member)
    await interaction.editReply({ embeds: [embed] })

  } catch (error) {
    console.error('Error executing balance command:', error)
    
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while checking balance.')]
    })
  }
}
