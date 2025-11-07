import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  MessageFlags
} from 'discord.js'
import { CurrencyService } from '@/services/currencyService'
import { CurrencyConfig } from '@/types'
import { createLeaderboardEmbed, createErrorEmbed } from '@/utils/embeds'

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View currency and voice time leaderboards')
  .addStringOption(option =>
    option
      .setName('type')
      .setDescription('Type of leaderboard to view')
      .setRequired(true)
      .addChoices(
        { name: 'Currency Balance', value: 'balance' },
        { name: 'Voice Time', value: 'voice' }
      )
  )
  .addIntegerOption(option =>
    option
      .setName('limit')
      .setDescription('Number of users to show (1-25)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(25)
  )

export async function execute(
  interaction: ChatInputCommandInteraction,
  config: CurrencyConfig,
  currencyService: CurrencyService
): Promise<void> {
  try {
    await interaction.deferReply()

    const type = interaction.options.getString('type', true) as 'balance' | 'voice'
    const limit = interaction.options.getInteger('limit') || 10

    // Get leaderboard data
    const users = type === 'balance' 
      ? await currencyService.getLeaderboard(limit)
      : await currencyService.getVoiceTimeLeaderboard(limit)

    if (users.length === 0) {
      await interaction.editReply({
        embeds: [createErrorEmbed('No users found in the leaderboard.')]
      })
      return
    }

    // Create leaderboard embed
    const embed = createLeaderboardEmbed(users, type)
    await interaction.editReply({ embeds: [embed] })

  } catch (error) {
    console.error('Error executing leaderboard command:', error)
    
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while fetching the leaderboard.')]
    })
  }
}
