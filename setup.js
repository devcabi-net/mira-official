#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function setup() {
  console.log('🚀 Mira Discord Bot Setup')
  console.log('========================\n')
  
  console.log('This script will help you configure your Discord bot.')
  console.log('You will need the following information:')
  console.log('- Discord Bot Token')
  console.log('- Discord Client ID')
  console.log('- Discord Guild (Server) ID')
  console.log('- Role IDs for unverified, verified, and verifier roles')
  console.log('- Log channel ID\n')

  const token = await question('Discord Bot Token: ')
  const clientId = await question('Discord Client ID: ')
  const guildId = await question('Discord Guild ID: ')
  const unverifiedRoleId = await question('Unverified Role ID: ')
  const verifiedRoleId = await question('Verified Role ID: ')
  const verifierRoleId = await question('Verifier Role ID: ')
  const logChannelId = await question('Log Channel ID: ')

  const envContent = `# Discord Bot Configuration
DISCORD_TOKEN=${token}
DISCORD_CLIENT_ID=${clientId}
DISCORD_GUILD_ID=${guildId}

# Role Configuration
UNVERIFIED_ROLE_ID=${unverifiedRoleId}
VERIFIED_ROLE_ID=${verifiedRoleId}
VERIFIER_ROLE_ID=${verifierRoleId}

# Channel Configuration
LOG_CHANNEL_ID=${logChannelId}

# Bot Configuration
NODE_ENV=development
`

  fs.writeFileSync('.env', envContent)
  
  console.log('\n✅ Configuration saved to .env file!')
  console.log('\nNext steps:')
  console.log('1. Run: npm run deploy (to deploy slash commands)')
  console.log('2. Run: npm run dev (to start the bot in development mode)')
  console.log('3. Run: npm start (to start the bot in production mode)')
  
  rl.close()
}

setup().catch(console.error) 