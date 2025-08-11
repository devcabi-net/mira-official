import { 
  GuildMember, 
  TextChannel,
  ChatInputCommandInteraction 
} from 'discord.js'
import { 
  VerificationConfig, 
  VerificationResult, 
  LogEntry 
} from '@/types'
import { 
  validateVerifierPermissions, 
  validateTargetUser
} from '@/utils/permissions'
import { 
  createVerificationSuccessEmbed,
  createVerificationLogEmbed,
  createErrorEmbed 
} from '@/utils/embeds'

export class VerificationService {
  private config: VerificationConfig

  constructor(config: VerificationConfig) {
    this.config = config
  }

  async verifyUser(
    interaction: ChatInputCommandInteraction,
    targetUser: GuildMember,
    reason?: string
  ): Promise<VerificationResult> {
    try {
      // Validate verifier permissions
      const verifier = interaction.member as GuildMember
      const permissionCheck = validateVerifierPermissions(verifier, this.config)
      
      if (!permissionCheck.hasPermission) {
        return {
          success: false,
          message: permissionCheck.error || 'Permission validation failed'
        }
      }

      // Validate target user
      const targetValidation = validateTargetUser(targetUser, this.config)
      if (!targetValidation.isValid) {
        return {
          success: false,
          message: targetValidation.error || 'Target user validation failed'
        }
      }

      // Perform role changes
      await this.performRoleChanges(targetUser)

      // Log the verification
      await this.logVerification(interaction, targetUser, verifier, reason)

      return {
        success: true,
        message: `Successfully verified ${targetUser.user.tag}`,
        targetUser,
        verifier,
        reason: reason || undefined
      }

    } catch (error) {
      console.error('Verification error:', error)
      return {
        success: false,
        message: 'An error occurred during verification. Please try again.'
      }
    }
  }

  private async performRoleChanges(targetUser: GuildMember): Promise<void> {
    // Remove unverified role
    await targetUser.roles.remove(this.config.unverifiedRoleId)
    
    // Add verified role
    await targetUser.roles.add(this.config.verifiedRoleId)
  }

  private async logVerification(
    interaction: ChatInputCommandInteraction,
    targetUser: GuildMember,
    verifier: GuildMember,
    reason?: string
  ): Promise<void> {
    try {
      const logChannel = interaction.guild?.channels.cache.get(
        this.config.logChannelId
      ) as TextChannel

      if (!logChannel) {
        console.warn('Log channel not found:', this.config.logChannelId)
        return
      }

      const logEmbed = createVerificationLogEmbed(
        targetUser,
        verifier,
        reason
      )

      await logChannel.send({ embeds: [logEmbed] })

    } catch (error) {
      console.error('Failed to log verification:', error)
      // Don't fail the verification if logging fails
    }
  }

  async sendVerificationResponse(
    interaction: ChatInputCommandInteraction,
    result: VerificationResult
  ): Promise<void> {
    if (result.success && result.targetUser && result.verifier) {
      const successEmbed = createVerificationSuccessEmbed(
        result.targetUser,
        result.verifier,
        result.reason
      )

      await interaction.editReply({ 
        embeds: [successEmbed]
      })
    } else {
      const errorEmbed = createErrorEmbed(result.message)
      await interaction.editReply({ 
        embeds: [errorEmbed]
      })
    }
  }
} 