import { Events, Client } from 'discord.js'

export const name = Events.ClientReady
export const once = true

export async function execute(client: Client): Promise<void> {
  console.log(`🚀 ${client.user?.tag} is online and ready!`)
  console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`)
  console.log(`👥 Serving ${client.users.cache.size} user(s)`)
  
  // Set bot status
  client.user?.setActivity('verifying users', { type: 2 }) // Watching
} 