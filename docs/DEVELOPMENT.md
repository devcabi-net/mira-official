# 👨‍💻 Development Documentation

**Internal Developer Documentation** - Technical details, architecture, and development guidelines for the Mira Discord Bot.

---

## 📐 Architecture Overview

### **Service Layer Architecture**

The bot follows a clean service-oriented architecture:

```
┌─────────────────────────────────────┐
│         Discord.js Client           │
│    (Event handlers & Commands)      │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────────┐
│  Commands  │  │     Events       │
└──────┬──────┘  └──────┬───────────┘
       │                │
       └───────┬────────┘
               │
    ┌──────────▼──────────┐
    │   Service Layer     │
    ├─────────────────────┤
    │ CurrencyService     │
    │ DataPersistenceService │
    │ LoggingService      │
    │ TimeoutTracker      │
    └─────────────────────┘
```

### **Core Services**

1. **CurrencyService** (`src/services/currencyService.ts`)
   - Handles all currency operations (add, deduct, tier upgrades)
   - Manages moderation action validation
   - Cooldown tracking
   - User balance management

2. **DataPersistenceService** (`src/services/dataPersistenceService.ts`)
   - File-based JSON storage
   - Write queue system to prevent concurrent writes
   - File locking mechanism
   - Backup/recovery functionality

3. **LoggingService** (`src/services/loggingService.ts`)
   - Centralized Discord channel logging
   - Verification logs
   - Moderation action logs
   - Currency transaction logs

4. **TimeoutTracker** (`src/services/timeoutTracker.ts`)
   - Manages temporary voice actions (mutes/deafens)
   - Auto-expires timeouts
   - Persists across bot restarts (when loaded)

5. **StatbotService** (`src/services/statbotService.ts`)
   - Optional integration with Statbot API
   - Voice time validation and sync
   - Bulk member statistics retrieval
   - Rate limit handling
   - Graceful fallback system

---

## 🏗️ Project Structure

```
src/
├── commands/              # Slash command definitions
│   ├── balance.ts        # Balance checking command
│   ├── leaderboard.ts    # Leaderboard command
│   ├── marketplace.ts    # Marketplace command
│   ├── tier.ts           # Tier upgrade command
│   ├── verify.ts         # Verification command
│   └── index.ts          # Command registry
│
├── events/                # Discord event handlers
│   ├── ready.ts          # Bot ready event
│   ├── interactionCreate.ts  # Command interaction handler
│   ├── voiceStateUpdate.ts    # Voice tracking event
│   └── index.ts          # Event registry
│
├── services/              # Business logic services
│   ├── currencyService.ts         # Currency operations
│   ├── dataPersistenceService.ts  # Data persistence
│   ├── loggingService.ts          # Logging functionality
│   ├── timeoutTracker.ts         # Timeout management
│   ├── verificationService.ts     # Verification logic
│   └── statbotService.ts          # Statbot API integration (optional)
│
├── types/                 # TypeScript type definitions
│   └── index.ts          # Global types
│
├── utils/                 # Utility functions
│   ├── config.ts         # Configuration management
│   ├── embeds.ts         # Discord embed utilities
│   └── permissions.ts    # Permission validation
│
├── deploy-commands.ts     # Command deployment script
└── index.ts              # Main bot entry point
```

---

## 🔧 Development Setup

### **Prerequisites**
- Node.js 18.0.0+
- TypeScript 5.3.2+
- npm or yarn

### **Available Scripts**

```bash
# Development
npm run dev          # Start bot with hot reload (ts-node)
npm run watch        # Start bot with nodemon watching

# Build
npm run build        # Compile TypeScript to JavaScript
npm start            # Run compiled bot (production)

# Deployment
npm run deploy       # Deploy slash commands to Discord

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically

# Testing
npm test             # Run test suite (when implemented)
npm run test-config  # Test configuration loading
```

### **Development Workflow**

1. **Make Changes**
   - Edit TypeScript files in `src/`
   - Bot auto-reloads in dev mode

2. **Test Changes**
   - Test commands in Discord
   - Check console logs
   - Verify data persistence

3. **Build & Deploy**
   ```bash
   npm run build      # Compile to JavaScript
   npm run deploy     # Deploy commands (if adding new commands)
   npm start          # Run production build
   ```

---

## ➕ Adding New Features

### **Adding a New Command**

1. **Create Command File** (`src/commands/newcommand.ts`):
```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('newcommand')
  .setDescription('Description of command')

export async function execute(
  interaction: ChatInputCommandInteraction,
  // Add required services/config as needed
): Promise<void> {
  await interaction.reply('Command executed!')
}
```

2. **Register Command** (`src/commands/index.ts`):
```typescript
import * as newcommand from './newcommand'
commands.set(newcommand.data.name, newcommand)
```

3. **Deploy Command**:
```bash
npm run deploy
```

### **Adding a New Event**

1. **Create Event File** (`src/events/newEvent.ts`):
```typescript
import { Events } from 'discord.js'

export const name = Events.YourEventName
export const once = false  // or true for one-time events

export async function execute(...args: any[]): Promise<void> {
  // Handle event
}
```

2. **Register Event** (`src/events/index.ts`):
```typescript
import * as newEvent from './newEvent'
events.set(newEvent.name, newEvent)
```

### **Adding a New Service**

1. **Create Service File** (`src/services/newService.ts`):
```typescript
export class NewService {
  constructor(/* dependencies */) {}
  
  async doSomething(): Promise<void> {
    // Service logic
  }
}
```

2. **Initialize in Bot** (`src/index.ts`):
```typescript
this.newService = new NewService(/* dependencies */)
```

---

## 🗄️ Data Storage

### **File-Based Storage**

All data is stored in JSON files in the `data/` directory:

- `users.json` - User currency data (balance, tier, voice time)
- `transactions.json` - Currency transaction history
- `moderation-logs.json` - Moderation action logs
- `voice-sessions.json` - Voice channel session tracking
- `timeouts.json` - Active timeout tracking

### **Data Format**

**User Data:**
```typescript
{
  userId: string
  balance: number
  totalEarned: number
  lastActive: Date
  voiceTimeMinutes: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
}
```

### **File Locking & Concurrency**

The `DataPersistenceService` implements:
- Write queue to serialize file operations
- File locking to prevent concurrent writes
- Retry logic with exponential backoff
- Automatic directory creation

---

## 🔍 Configuration

### **Environment Variables**

Required in `.env`:
```env
DISCORD_TOKEN=          # Bot token
DISCORD_CLIENT_ID=      # Bot application ID
DISCORD_GUILD_ID=       # Server ID
UNVERIFIED_ROLE_ID=     # Unverified role ID
VERIFIED_ROLE_ID=       # Verified role ID
VERIFIER_ROLE_ID=       # Verifier role ID
LOG_CHANNEL_ID=         # Log channel ID
```

Optional:
```env
CURRENCY_PER_MINUTE=1   # Credits per minute (default: 1)
PROTECTED_ROLES=        # Comma-separated role IDs
NODE_ENV=development    # Environment

# Statbot API Integration (optional)
STATBOT_API_KEY=        # Statbot API key
STATBOT_ENABLED=false   # Enable Statbot integration
STATBOT_SYNC_INTERVAL=3600000  # Sync interval in ms (default: 1 hour)
STATBOT_FALLBACK_ENABLED=true  # Enable fallback if Statbot fails
```

### **Moderation Actions Configuration**

Actions are defined in `src/utils/config.ts`. To add/modify:

```typescript
{
  id: 'action-id',           // Unique identifier
  name: 'Action Name',       // Display name
  cost: 1000,                 // Social Credits cost
  cooldown: 60,              // Cooldown in minutes
  dailyLimit: 5,             // Uses per day
  requiredTier: 'silver',    // Minimum tier required
  description: 'Description' // Action description
}
```

---

## 🐛 Known Issues & Technical Debt

### **Current Issues**

1. **Daily Limits Not Enforced** ⚠️ HIGH
   - Location: `src/services/currencyService.ts`
   - Issue: `dailyLimit` defined but never checked
   - Impact: Users can spam moderation actions
   - Fix: Implement daily limit tracking

2. **TimeoutTracker Not Loading on Startup** ⚠️ MEDIUM
   - Location: `src/index.ts`
   - Issue: `loadTimeouts()` exists but never called
   - Impact: Active timeouts lost on restart
   - Fix: Call `timeoutTracker.loadTimeouts()` in `setupEventHandlers()`

3. **Voice Session Cleanup Never Runs** ⚠️ MEDIUM
   - Location: `src/events/voiceStateUpdate.ts`
   - Issue: `startVoiceSessionCleanup()` function exists but unused
   - Impact: Potential memory leak
   - Fix: Call cleanup function during initialization

4. **Event Handler Registration** ⚠️ LOW
   - Location: `src/index.ts:59, 69`
   - Issue: Uses string literal instead of `Events.VoiceStateUpdate`
   - Impact: Low, but poor practice
   - Fix: Use Discord.js constants

### **Technical Debt**

1. **Duplicate Code**
   - Moderation action handling duplicated in `marketplace.ts` and `interactionCreate.ts`
   - Should be extracted to a shared function

2. **Magic Numbers**
   - Hardcoded values scattered throughout code
   - Should be extracted to constants

3. **No Unit Tests**
   - Test suite exists but empty
   - Need tests for critical paths (currency calculations, tier logic)

4. **File-Based Storage Limitations**
   - Won't scale well beyond medium-sized servers
   - Consider database migration for 1000+ concurrent users

---

## 🔄 Future Improvements

### **Short Term**
- [ ] Implement daily limit enforcement
- [ ] Load TimeoutTracker on startup
- [ ] Start voice session cleanup
- [ ] Add monitoring/metrics
- [ ] Implement automated backups

### **Medium Term**
- [ ] Add unit tests for critical paths
- [ ] Refactor duplicate code
- [ ] Extract magic numbers to constants
- [ ] Add JSDoc comments
- [ ] Implement command cooldowns

### **Long Term**
- [ ] Database migration (PostgreSQL/MongoDB/SQLite)
- [ ] Admin commands for currency management
- [ ] Currency transfer system
- [ ] Enhanced analytics dashboard
- [ ] Rate limiting on currency awards

---

## 🧪 Testing

### **Manual Testing Checklist**

- [ ] Verification command works with proper permissions
- [ ] Social Credits earned correctly in voice channels
- [ ] Tier purchases work correctly
- [ ] Moderation actions perform correctly
- [ ] Protected roles cannot be moderated
- [ ] Cooldowns prevent spam
- [ ] Error handling works (refunds on failures)
- [ ] Logging works correctly

### **Test Commands to Try**

```bash
# Verify a user
/verify target:@user reason:Test verification

# Check balance
/balance

# Purchase tier
/tier upgrade:silver

# Perform moderation action
/marketplace action action:timeout-5min target:@user reason:Test

# Check leaderboard
/leaderboard
```

---

## 📊 Performance Considerations

### **Current Limitations**

- File-based storage may bottleneck at 1000+ concurrent users
- All users loaded into memory for leaderboard (no pagination)
- Memory-based session tracking (lost on restart)

### **Optimization Opportunities**

- Implement pagination for leaderboard
- Add caching for frequently accessed data
- Database migration for better scalability
- Batch file operations where possible

---

## 🔒 Security Considerations

### **Current Protections**

- Permission validation on all commands
- Protected roles system
- Input validation
- Error handling without exposing sensitive info

### **Potential Improvements**

- Add rate limiting to currency awards (prevent automation abuse)
- Validate tier purchases server-side
- Add audit logging for all currency transactions
- Implement transaction signing/prevention of tampering

---

## 📝 Code Style Guidelines

### **TypeScript Best Practices**

- Use explicit types, avoid `any` where possible
- Use interfaces for data structures
- Export types from `src/types/index.ts`
- Use async/await instead of promises

### **File Naming**

- Commands: `camelCase.ts` (e.g., `marketplace.ts`)
- Services: `camelCase.ts` (e.g., `currencyService.ts`)
- Events: `camelCase.ts` (e.g., `interactionCreate.ts`)
- Types: `camelCase.ts` (e.g., `index.ts`)

### **Error Handling**

- Always use try-catch for async operations
- Log errors to console
- Provide user-friendly error messages
- Refund currency on failed actions

---

## 🚀 Deployment

### **Production Checklist**

- [ ] Update environment variables
- [ ] Build TypeScript: `npm run build`
- [ ] Deploy commands: `npm run deploy`
- [ ] Test in production environment
- [ ] Set up process manager (PM2, systemd, etc.)
- [ ] Configure auto-restart on crash
- [ ] Set up logging/monitoring
- [ ] Configure backups

### **Environment Setup**

Production `.env`:
```env
NODE_ENV=production
# ... other variables
```

---

## 📞 Development Notes

### **Discord API Limitations**

- Slash commands take up to 1 hour to update globally
- Rate limits apply to all Discord API calls
- Bot must have proper intents enabled

### **Important Reminders**

- Always test commands before deploying
- Check Discord.js documentation for breaking changes
- Timeouts auto-expire (Discord handles this)
- Voice tracking requires `GuildVoiceStates` intent

---

## 🔌 Statbot Integration

Mira bot includes optional integration with Statbot's API for enhanced voice time tracking and analytics.

**Key Features:**
- Voice time validation and sync
- Bulk member statistics retrieval
- Rate limit handling
- Graceful fallback system

**Documentation:** See [STATBOT_INTEGRATION.md](./STATBOT_INTEGRATION.md) for complete integration guide.

**Configuration:**
- Set `STATBOT_API_KEY` and `STATBOT_ENABLED=true` in `.env`
- Integration is optional - bot works without it
- Requires all Statbot Premium upgrades

---

*Last Updated: 2025-01-26*  
*For user documentation, see [README.md](../README.md) and [SOCIAL_CREDITS_SYSTEM.md](./SOCIAL_CREDITS_SYSTEM.md)*  
*For Statbot integration, see [STATBOT_INTEGRATION.md](./STATBOT_INTEGRATION.md)*

