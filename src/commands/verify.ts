import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags
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
  let deferred = false
  
  try {
    // Defer reply to give time for processing (ephemeral)
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    deferred = true

    // Get the target user
    const targetUserOption = interaction.options.getUser('target', true)
    const targetMember = await interaction.guild?.members.fetch(targetUserOption.id)

    if (!targetMember) {
      if (deferred && !interaction.replied) {
        await interaction.editReply({
          embeds: [{
            title: '❌ Error',
            description: 'Could not find the target user in this server.',
            color: 0xff0000
          }]
        })
      }
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

    // If the user is already verified, add the targetUser to the result for the response
    if (!result.success && result.alreadyVerified) {
      result.targetUser = targetMember
    }

    // Send response
    await verificationService.sendVerificationResponse(interaction, result)

  } catch (error: any) {
    console.error('Error executing verify command:', error)
    
    // Handle "Unknown interaction" error - interaction expired
    if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
      console.warn('Interaction expired before response could be sent')
      return
    }
    
    // Try to respond if interaction is still valid
    try {
      if (deferred && !interaction.replied) {
        await interaction.editReply({
          embeds: [{
            title: '❌ Error',
            description: 'An unexpected error occurred while processing the verification.',
            color: 0xff0000
          }]
        })
      } else if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [{
            title: '❌ Error',
            description: 'An unexpected error occurred while processing the verification.',
            color: 0xff0000
          }],
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