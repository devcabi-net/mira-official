import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, MessageFlags } from 'discord.js'
import { CurrencyService } from '@/services/currencyService'
import { CurrencyConfig, CurrencyTier } from '@/types'
import { createErrorEmbed, createEmbed } from '@/utils/embeds'

export const data = new SlashCommandBuilder()
  .setName('tier')
  .setDescription('Purchase tier upgrades to unlock more moderation actions.')
  .addStringOption(option =>
    option
      .setName('upgrade')
      .setDescription('Choose which tier to upgrade to')
      .setRequired(true)
      .addChoices(
        { name: '🥈 Silver Tier (10,000 Social Credits)', value: 'silver' },
        { name: '🥇 Gold Tier (25,000 Social Credits)', value: 'gold' },
        { name: '💎 Platinum Tier (50,000 Social Credits)', value: 'platinum' },
        { name: '💠 Diamond Tier (100,000 Social Credits)', value: 'diamond' }
      )
  )

export async function execute(
  interaction: ChatInputCommandInteraction,
  config: CurrencyConfig,
  currencyService: CurrencyService
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const targetTier = interaction.options.getString('upgrade') as CurrencyTier
  const member = interaction.member as GuildMember

  try {
    const result = await currencyService.purchaseTierUpgrade(
      member.id,
      targetTier,
      interaction.guild!,
      member
    )

    if (result.success) {
      const embed = createEmbed({
        title: '🏆 Tier Upgrade Successful!',
        description: result.message,
        color: 0x00ff00,
        fields: [
          {
            name: '💰 New Balance',
            value: `${result.newBalance?.toLocaleString() || 0} Social Credits`,
            inline: true
          },
          {
            name: '🏆 New Tier',
            value: result.tier ? result.tier.charAt(0).toUpperCase() + result.tier.slice(1) : 'Unknown',
            inline: true
          }
        ]
      })

      await interaction.editReply({ embeds: [embed] })
    } else {
      await interaction.editReply({
        embeds: [createErrorEmbed(result.message)]
      })
    }
  } catch (error) {
    console.error('Error purchasing tier upgrade:', error)
    await interaction.editReply({
      embeds: [createErrorEmbed('Failed to purchase tier upgrade. Please try again later.')]
    })
  }
}
