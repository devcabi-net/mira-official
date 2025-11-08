# 🏆 Social Credits System

Welcome to the revolutionary **Social Credits System**! This system rewards active community members with **Social Credits** for participating in voice channels, which can then be used to purchase moderation powers and unlock higher tiers.

## 🎯 **How It Works**

### **Earning Social Credits**
- **Voice Channel Participation**: Earn **1 Social Credit per minute** while in any voice channel
- **Automatic Tracking**: The system automatically tracks your time and awards credits every minute
- **No Manual Claims**: Credits are added automatically - just stay active in voice channels!

### **Tier System**
Your Social Credits balance determines which tier you can purchase, which unlocks different moderation abilities. Tiers must be manually purchased - they don't upgrade automatically!

| Tier | Required Credits | Unlocks |
|------|----------------|---------|
| 🥉 **Bronze** | 0+ | Basic voice channel earning |
| 🥈 **Silver** | 10,000+ | Renaming users, 5-minute timeouts |
| 🥇 **Gold** | 25,000+ | 1-hour timeouts, remove timeouts |
| 💎 **Platinum** | 50,000+ | 1-day timeouts |
| 💠 **Diamond** | 100,000+ | 7-day timeouts, voice mute/deafen controls, role give/take |

---

## 🛠️ **Available Commands**

### **📊 `/balance`**
Check your current Social Credits balance and tier status.
- **Usage**: `/balance` or `/balance @user`
- **Shows**: Current balance, tier, total earned, and voice time

### **🏆 `/tier`**
Purchase tier upgrades to unlock more moderation actions.
- **Usage**: `/tier upgrade: [tier]`
- **Costs**:
  - 🥈 Silver: 10,000 Social Credits
  - 🥇 Gold: 25,000 Social Credits  
  - 💎 Platinum: 50,000 Social Credits
  - 💠 Diamond: 100,000 Social Credits

### **🛒 `/marketplace`**
The **one-stop shop** for all your Social Credits needs! Two simple subcommands for everything:

#### **`/marketplace action`** - Perform Moderation Actions
- **🎯 Smart User Selection**: Use Discord's built-in user picker (no more user IDs!)
- **🔍 Autocomplete Actions**: Type to search through available actions
- **⚡ Instant Execution**: Actions are performed immediately
- **💰 Real-time Pricing**: See exact costs as you type

#### **`/marketplace upgrade`** - Purchase Tier Upgrades
- **🏆 Easy Selection**: Choose from available tier upgrades
- **💎 Clear Pricing**: See exact costs for each tier
- **🚀 Instant Unlock**: New powers available immediately

#### **Available Actions:**
- **🏷️ Rename User** (2,000 credits) - Change any user's nickname
- **⏰ Timeout 5 Minutes** (3,000 credits) - Timeout for 5 minutes (auto-expires)
- **⏰ Timeout 1 Hour** (8,000 credits) - Timeout for 1 hour (auto-expires)
- **⏰ Timeout 1 Day** (25,000 credits) - Timeout for 1 day (auto-expires)
- **⏰ Timeout 7 Days** (75,000 credits) - Timeout for 7 days (auto-expires)
- **✅ Remove Timeout** (15,000 credits) - Remove timeout from a user (help your friends!)
- **🎭 Give Role** (Dynamic pricing - top role: 1,000,000 credits) - Give a role to a user. Top role costs 1M credits, lower roles cost exponentially less (minimum 50k)
- **🎭 Take Role** (Dynamic pricing - top role: 1,000,000 credits) - Remove a role from a user. Top role costs 1M credits, lower roles cost exponentially less (minimum 50k)
- **🔇 Server Mute** (120,000 credits) - Mute a user in voice channels (~2,000 hours VC)
- **🔊 Server Unmute** (100,000 credits) - Unmute a user in voice channels (~1,667 hours VC)
- **🔇 Server Deafen** (120,000 credits) - Deafen a user in voice channels (~2,000 hours VC)
- **🔊 Server Undeafen** (100,000 credits) - Undeafen a user in voice channels (~1,667 hours VC)

### **📈 `/leaderboard`**
View the top Social Credits earners in the server.
- **Shows**: Top 10 users by balance and voice time
- **Updates**: Real-time rankings

---

## 💰 **Moderation Actions & Costs**

| Action | Cost | Cooldown | Daily Limit | Required Tier |
|--------|------|----------|-------------|---------------|
| 🏷️ **Rename User** | 2,000 | 1 hour | 5 uses | Silver+ |
| ⏰ **Timeout 5 Minutes** | 3,000 | 2 hours | 3 uses | Silver+ |
| ⏰ **Timeout 1 Hour** | 8,000 | 6 hours | 2 uses | Gold+ |
| ⏰ **Timeout 1 Day** | 25,000 | 24 hours | 1 use | Platinum+ |
| ⏰ **Timeout 7 Days** | 75,000 | 48 hours | 1 use | Diamond |
| ✅ **Remove Timeout** | 15,000 | 3 hours | 3 uses | Gold+ |
| 🎭 **Give Role** | Dynamic* | 24 hours | 1 use | Diamond |
| 🎭 **Take Role** | Dynamic* | 24 hours | 1 use | Diamond |
| 🔇 **Server Mute** | 120,000 | 24 hours | 1 use | Diamond |
| 🔊 **Server Unmute** | 100,000 | 24 hours | 1 use | Diamond |
| 🔇 **Server Deafen** | 120,000 | 24 hours | 1 use | Diamond |
| 🔊 **Server Undeafen** | 100,000 | 24 hours | 1 use | Diamond |

\* **Dynamic Pricing:** Role actions use **linear gradient pricing** based on the role's position in the server hierarchy. The **top role** costs **1,000,000 credits**, and the **lowest role** costs **50,000 credits**. All roles in between have a smooth gradient - higher roles cost proportionally more. Example: If you have 10 roles, the top costs 1M, bottom costs 50k, and roles scale evenly between them (1M → 900k → 800k → ... → 150k → 50k).

**Note:** Discord timeouts automatically expire when the duration ends. No manual unbanning needed! Ban and kick actions are not available through the Social Credits system. Role actions require the bot's role to be higher than the target role, and protected roles cannot be managed.

---

## 🛡️ **Protection System**

### **Protected Roles**
Users with certain roles cannot be moderated by the Social Credits system:
- Server administrators and moderators are protected
- Custom protected roles can be configured
- Protected users are immune to all Social Credits moderation actions

### **Cooldowns & Limits**
- **Cooldowns**: Prevent spam by limiting how often you can use actions
- **Daily Limits**: Prevent abuse by limiting total uses per day
- **Tier Requirements**: Higher-tier actions require more Social Credits to unlock

---

## 🎮 **How to Get Started**

1. **Join a Voice Channel** - Start earning Social Credits immediately!
2. **Check Your Balance** - Use `/balance` to see your current credits
3. **Upgrade Your Tier** - Use `/marketplace upgrade` to unlock more powerful actions
4. **Start Moderating** - Use `/marketplace action` to moderate users with Discord's user picker!
5. **Enjoy the Power** - Help keep the server clean with your Social Credits!

---

## 📋 **Important Notes**

### **Earning Social Credits**
- ✅ **Automatic**: Credits are awarded every minute you're in voice
- ✅ **Persistent**: Credits are saved and never expire
- ✅ **Fair**: Everyone earns the same rate (1 credit per minute)
- ✅ **Transparent**: All transactions are logged and auditable

### **Using Social Credits**
- ⚠️ **Non-refundable**: Once spent, credits cannot be recovered
- ⚠️ **Cooldowns**: Respect the cooldown periods between actions
- ⚠️ **Daily Limits**: Don't exceed your daily action limits
- ⚠️ **Protected Users**: Cannot moderate users with protected roles

### **Tier System**
- 🎯 **Manual Upgrades**: Tiers don't upgrade automatically - you must purchase them
- 🎯 **Permanent**: Once purchased, tier upgrades are permanent
- 🎯 **Cumulative**: Higher tiers include all lower-tier benefits

---

## 🚀 **Pro Tips**

1. **Stay Active**: The more time you spend in voice channels, the more credits you earn
2. **Plan Your Spending**: Save up for higher-tier upgrades to unlock better moderation tools
3. **Use the Marketplace**: Everything is in one place - no need to remember multiple commands
4. **Check the Leaderboard**: See how you rank against other community members
5. **Read the Descriptions**: The marketplace shows exactly what each action does and costs

---

## 🎉 **Start Your Journey Today!**

Join a voice channel and start earning Social Credits to become a powerful community moderator! The more you participate, the more influence you'll have in keeping our server a great place for everyone.

**Remember**: With great power comes great responsibility. Use your Social Credits wisely to help maintain a positive community environment! 🌟
