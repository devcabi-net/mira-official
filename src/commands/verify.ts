import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  GuildMember 
} from 'discord.js'
import { VerificationService } from '@/services/verificationService'
import { VerificationConfig } from '@/types'

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('Verify a user by removing unverified role and adding verified role')
  .addUserOption(option =>
    option
      .setName('target')
      .setDescription('The user to verify')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('reason')
      .setDescription('Optional reason for verification')
      .setRequired(false)
      .setMaxLength(500)
  )

export async function execute(
  interaction: ChatInputCommandInteraction,
  config: VerificationConfig
): Promise<void> {
  try {
    // Defer reply to give time for processing
    await interaction.deferReply()

    // Get the target user
    const targetUserOption = interaction.options.getUser('target', true)
    const targetMember = await interaction.guild?.members.fetch(targetUserOption.id)

    if (!targetMember) {
      await interaction.editReply({
        embeds: [{
          title: '❌ Error',
          description: 'Could not find the target user in this server.',
          color: 0xff0000
        }]
      })
      return
    }

    // Get optional reason
    const reason = interaction.options.getString('reason') || undefined

    // Create verification service and process
    const verificationService = new VerificationService(config)
    const result = await verificationService.verifyUser(
      interaction,
      targetMember,
      reason
    )

    // Send response
    await verificationService.sendVerificationResponse(interaction, result)

  } catch (error) {
    console.error('Error executing verify command:', error)
    
    await interaction.editReply({
      embeds: [{
        title: '❌ Error',
        description: 'An unexpected error occurred while processing the verification.',
        color: 0xff0000
      }]
    })
  }
} 