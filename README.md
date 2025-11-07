# 🤖 Mira Discord Bot

A comprehensive Discord bot built with Discord.js and TypeScript, featuring user verification and a Social Credits economy system. The bot helps manage your community through role-based verification and an innovative currency system that rewards voice channel participation.

## 🚀 Features

### **Verification System**
- **Slash Command Integration**: Modern `/verify` command for user verification
- **Role Management**: Automatically manages unverified/verified roles
- **Permission Validation**: Comprehensive permission checking for verifiers
- **Activity Logging**: All verification activities logged to designated channels

### **Social Credits System**
- **Voice Channel Rewards**: Earn Social Credits by participating in voice channels (1 credit per minute)
- **Tier-Based Moderation**: Purchase tier upgrades to unlock moderation powers
- **Community Marketplace**: Use credits to purchase moderation actions
- **Leaderboard**: Track top earners and most active community members
- **Auto-Tracking**: Automatic currency awards every minute you're in voice

---

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **Discord Bot Token** from [Discord Developer Portal](https://discord.com/developers/applications)
- **Discord Application** with proper permissions configured
- **Discord Server (Guild)** with configured roles and channels

---

## 🛠️ Installation & Setup

### 1. **Clone the Repository**
```bash
git clone <repository-url>
cd mira-official
```

### 2. **Install Dependencies**
```bash
npm install
```

### 3. **Configure Environment Variables**

Create a `.env` file in the root directory:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_GUILD_ID=your_guild_id_here

# Verification System
UNVERIFIED_ROLE_ID=unverified_role_id_here
VERIFIED_ROLE_ID=verified_role_id_here
VERIFIER_ROLE_ID=verifier_role_id_here

# Logging
LOG_CHANNEL_ID=log_channel_id_here

# Optional: Currency Configuration
CURRENCY_PER_MINUTE=1
PROTECTED_ROLES=role_id_1,role_id_2

# Environment
NODE_ENV=development
```

### 4. **Deploy Slash Commands**
```bash
npm run deploy
```

### 5. **Start the Bot**
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

---

## 🔧 Required Discord Bot Permissions

Your Discord bot needs the following permissions in your server:

- ✅ **Manage Roles** - For verification role management
- ✅ **Send Messages** - To send command responses and logs
- ✅ **Use Slash Commands** - To register and use slash commands
- ✅ **Read Message History** - To access channel information
- ✅ **Connect** - For voice channel tracking (Social Credits)
- ✅ **Speak** - For voice channel tracking
- ✅ **Timeout Members** - For timeout moderation actions
- ✅ **Manage Nicknames** - For rename actions
- ✅ **Mute Members** - For voice mute actions
- ✅ **Deafen Members** - For voice deafen actions

---

## 📖 Available Commands

### **Verification Commands**

#### `/verify`
Verify a user by assigning verified role and removing unverified role.

**Parameters:**
- `target` (required) - User to verify (mention or user ID)
- `reason` (optional) - Reason for verification (max 500 characters)

**Permissions Required:**
- User must have the Verifier role
- User must have "Manage Roles" permission

**Example:**
```
/verify target:@newuser reason:Completed onboarding process
```

---

### **Social Credits Commands**

#### `/balance`
Check your current Social Credits balance and tier status.

**Usage:**
- `/balance` - Check your own balance
- `/balance user:@username` - Check another user's balance

**Shows:**
- Current Social Credits balance
- Current tier (Bronze/Silver/Gold/Platinum/Diamond)
- Total credits earned
- Total voice time

#### `/leaderboard`
View the top Social Credits earners in the server.

**Shows:**
- Top 10 users by balance
- Top 10 users by voice time

#### `/tier`
Purchase tier upgrades to unlock more moderation actions.

**Tiers Available:**
- 🥈 **Silver** (10,000 credits) - Unlocks rename and 5-minute timeouts
- 🥇 **Gold** (25,000 credits) - Unlocks 1-hour timeouts and remove timeout
- 💎 **Platinum** (50,000 credits) - Unlocks 1-day timeouts
- 💠 **Diamond** (100,000 credits) - Unlocks 7-day timeouts, voice controls, and role management

**Usage:**
```
/tier upgrade:silver
```

#### `/marketplace`
The one-stop shop for all Social Credits needs.

**Subcommands:**

**`/marketplace action`** - Perform Moderation Actions
- Use Discord's built-in user picker to select target
- Autocomplete actions by typing
- See real-time pricing

**Available Actions:**
- 🏷️ **Rename User** (2,000 credits, Silver+)
- ⏰ **Timeout 5 Minutes** (3,000 credits, Silver+)
- ⏰ **Timeout 1 Hour** (8,000 credits, Gold+)
- ⏰ **Timeout 1 Day** (25,000 credits, Platinum+)
- ⏰ **Timeout 7 Days** (75,000 credits, Diamond)
- ✅ **Remove Timeout** (15,000 credits, Gold+) - Help your friends!
- 🎭 **Give Role** (Dynamic pricing, Diamond) - Cost scales exponentially with role hierarchy position
- 🎭 **Take Role** (Dynamic pricing, Diamond) - Cost scales exponentially with role hierarchy position
- 🔇 **Server Mute** (120,000 credits, Diamond)
- 🔊 **Server Unmute** (100,000 credits, Diamond)
- 🔇 **Server Deafen** (120,000 credits, Diamond)
- 🔊 **Server Undeafen** (100,000 credits, Diamond)

**Note on Role Actions:**
Role give/take actions have **dynamic pricing** based on the role's position in the server hierarchy. The **top role** costs **1,000,000 credits**, and the **lowest role** costs **50,000 credits**, with a **smooth linear gradient** between them. Higher roles cost more, with pricing scaling proportionally based on position in the hierarchy.

**`/marketplace upgrade`** - Purchase Tier Upgrades
- Same as `/tier` command
- Convenient alternative interface

**Example:**
```
/marketplace action action:timeout-5min target:@user reason:Being disruptive
```

---

## 💰 How Social Credits Work

### **Earning Credits**
- **1 Social Credit per minute** while in any voice channel
- Credits are awarded **automatically every minute**
- No manual claiming needed - just stay active in voice!

### **Tier System**
Tiers must be **manually purchased** - they don't upgrade automatically!

| Tier | Required Credits | Unlocks |
|------|----------------|---------|
| 🥉 **Bronze** | 0+ | Basic voice channel earning |
| 🥈 **Silver** | 10,000 | Renaming users, 5-minute timeouts |
| 🥇 **Gold** | 25,000 | 1-hour timeouts, remove timeouts |
| 💎 **Platinum** | 50,000 | 1-day timeouts |
| 💠 **Diamond** | 100,000 | 7-day timeouts, voice mute/deafen controls |

### **Protection System**
- Users with protected roles cannot be moderated
- Server administrators and moderators are protected
- Custom protected roles can be configured

### **Cooldowns & Limits**
- Each action has a cooldown period
- Daily limits prevent abuse
- Higher-tier actions require more credits

**Note:** Discord timeouts automatically expire when the duration ends. No manual unbanning needed! Ban and kick actions are not available through the Social Credits system.

---

## 📚 Documentation

- **[Social Credits System Guide](./SOCIAL_CREDITS_SYSTEM.md)** - Comprehensive user guide for the Social Credits system
- **[Development Documentation](./DEVELOPMENT.md)** - Technical documentation for developers (internal use)

---

## 🛡️ Security Features

- **Permission Validation**: Comprehensive permission checking on all commands
- **Role Hierarchy**: Respects Discord role hierarchy
- **Input Validation**: All user inputs are validated
- **Protected Roles**: Admin/mod roles cannot be moderated
- **Error Handling**: Graceful error handling without exposing sensitive information
- **Audit Logging**: All verification and moderation activities are logged

---

## 📝 Logging

The bot logs all activities to the specified log channel:

**Verification Logs:**
- Target user information
- Verifier information
- Verification reason
- Timestamp

**Moderation Logs:**
- Action performed
- Moderator and target
- Cost in Social Credits
- Reason
- Timestamp

---

## 🚨 Error Handling

The bot includes comprehensive error handling:
- Permission validation errors
- Role management errors
- Network/API errors
- Invalid user input errors
- Currency insufficient errors
- Graceful shutdown handling
- Automatic refunds on failed actions

---

## 🤝 Support

If you encounter any issues:

1. Check console logs for error messages
2. Verify your environment configuration (`.env` file)
3. Ensure bot has proper permissions in Discord
4. Check Discord Developer Portal settings
5. Verify all required roles and channels exist

---

## 📄 License

This project is licensed under the MIT License.

---

## 🔄 Version History

- **v2.0.0** - Added Social Credits system, marketplace, tier system
- **v1.0.0** - Initial release with verification functionality

---

*For detailed Social Credits information, see [SOCIAL_CREDITS_SYSTEM.md](./SOCIAL_CREDITS_SYSTEM.md)*  
*For developer documentation, see [DEVELOPMENT.md](./DEVELOPMENT.md)*
