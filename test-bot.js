#!/usr/bin/env node

// Simple test to verify configuration loading
try {
  console.log('🧪 Testing bot configuration...')
  
  // Test path resolution
  const { loadConfig } = require('./dist/utils/config')
  const config = loadConfig()
  
  console.log('✅ Configuration loaded successfully!')
  console.log('📊 Bot Configuration:')
  console.log(`  - Environment: ${config.environment}`)
  console.log(`  - Guild ID: ${config.guildId}`)
  console.log(`  - Unverified Role: ${config.verification.unverifiedRoleId}`)
  console.log(`  - Verified Role: ${config.verification.verifiedRoleId}`)
  console.log(`  - Verifier Role: ${config.verification.verifierRoleId}`)
  console.log(`  - Log Channel: ${config.verification.logChannelId}`)
  
  console.log('\n🎉 All tests passed! Bot is ready to run.')
  
} catch (error) {
  console.error('❌ Test failed:', error.message)
  process.exit(1)
} 