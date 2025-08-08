import { 
  Events, 
  Interaction, 
  ChatInputCommandInteraction,
  MessageFlags
} from 'discord.js'
import { getCommands } from '@/commands'
import { VerificationConfig } from '@/types'

export const name = Events.InteractionCreate
export const once = false

export async function execute(
  interaction: Interaction,
  config?: VerificationConfig
): Promise<void> {
  if (!interaction.isChatInputCommand()) return

  if (!config) {
    console.error('No verification config provided')
    return
  }

  const command = getCommands().get(interaction.commandName)

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`)
    return
  }

  try {
    await command.execute(interaction, config)
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error)
    
    const errorMessage = {
      embeds: [{
        title: '❌ Error',
        description: 'There was an error while executing this command!',
        color: 0xff0000
      }]
    }

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage)
    } else {
      await interaction.reply({ ...errorMessage, flags: MessageFlags.Ephemeral })
    }
  }
} 