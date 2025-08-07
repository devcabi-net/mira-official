import { REST, Routes } from 'discord.js'
import { loadConfig } from '@/utils/config'
import { getCommandData } from '@/commands'

async function deployCommands(): Promise<void> {
  try {
    const config = loadConfig()
    const commands = getCommandData()

    console.log('🚀 Starting command deployment...')
    console.log(`📝 Deploying ${commands.length} command(s)`)

    const rest = new REST({ version: '10' }).setToken(config.token)

    // Deploy commands to the specific guild for faster updates during development
    const data = await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    ) as any[]

    console.log(`✅ Successfully deployed ${data.length} command(s) to guild ${config.guildId}`)
    console.log('📋 Deployed commands:')
    data.forEach(command => {
      console.log(`  - /${command.name}: ${command.description}`)
    })

  } catch (error) {
    console.error('❌ Error deploying commands:', error)
    process.exit(1)
  }
}

// Run deployment if this file is executed directly
if (require.main === module) {
  deployCommands()
}

export { deployCommands } 