# 📊 Statbot API Integration

**Last Updated:** 2025-01-26  
**Status:** Active Integration  
**API Version:** 0.0.1 (Experimental)

---

## 📋 Overview

Mira bot integrates with [Statbot's API](https://docs.statbot.net/docs/api/statbot-api) to enhance voice time tracking accuracy and provide additional analytics capabilities. The integration is **optional** and designed to work alongside Mira's existing tracking system.

### **Key Features:**
- ✅ Voice time validation and sync
- ✅ Bulk member statistics retrieval
- ✅ Rate limit handling
- ✅ Graceful fallback (bot works without Statbot)
- ✅ Startup and hourly sync

---

## 🔧 Configuration

### **Environment Variables**

Add to `.env`:

```env
# Statbot API Configuration
STATBOT_API_KEY=your_api_key_here
STATBOT_ENABLED=true
STATBOT_SYNC_INTERVAL=3600000  # 1 hour in milliseconds
STATBOT_FALLBACK_ENABLED=true
```

### **Getting an API Key**

1. Go to your Discord server's Statbot dashboard
2. Navigate to: **Server Settings → Developers → API Key**
3. Generate a key (requires all Statbot Premium upgrades)
4. Copy the key to your `.env` file

**Note:** API keys are guild-specific and cannot access data from other guilds.

---

## 🔌 API Endpoints Used

### **1. Get Unique Member Counts (Series)**
- **Endpoint:** `GET /v1/guilds/:guild_id/counts/members/series`
- **Purpose:** Health check and member count trends
- **Required Parameters:**
  - `stats[]` - Array with values: `'text'` or `'voice'`
- **Response:** Array of `{ unixTimestamp: number, count: number }`

### **2. Get Members with Counts**
- **Endpoint:** `GET /v1/guilds/:guild_id/counts/members`
- **Purpose:** Bulk fetch all member statistics (used for sync)
- **Query Parameters:** Optional filters (start, end, bot, whitelist/blacklist, etc.)
- **Response:** Array of member objects with:
  - `id` - Discord user ID (snowflake)
  - `messageCount` - Message count
  - `voiceCount` - Voice activity count (in minutes)
  - `messageChannelCount` - Number of message channels participated
  - `voiceChannelCount` - Number of voice channels participated
  - `username`, `type`, `globalName`, `nick`, `avatar`, `guildAvatar`

**Important:** This endpoint does **NOT** accept `limit` or `offset` parameters.

### **3. Get Count of Messages (Sums)**
- **Endpoint:** `GET /v1/guilds/:guild_id/messages/sums`
- **Purpose:** Total message count for guild
- **Query Parameters:** Optional `start` and `end` timestamps

---

## 🔄 Sync Process

### **How It Works:**

1. **Bulk Fetch:** On startup and hourly, Mira fetches all member stats in one API call
2. **Data Mapping:** Creates a map of `userId → voiceCount` for quick lookup
3. **Comparison:** Compares Statbot's `voiceCount` with Mira's `voiceTimeMinutes`
4. **Sync Tolerance:** Considers synced if difference < 5 minutes
5. **Auto-Correction:** Updates Mira's data if Statbot has more accurate data (difference > 10 minutes)

### **Sync Behavior:**

- **If bulk fetch succeeds:** Processes all users from cached data (fast, no rate limits)
- **If bulk fetch fails:** Skips sync entirely (no individual API calls, prevents rate limit spam)
- **Error handling:** Graceful degradation, single warning message

### **Sync Schedule:**

- **On startup:** Immediate sync after health check
- **Hourly:** Automatic sync every hour (configurable via `STATBOT_SYNC_INTERVAL`)

---

## 📊 Rate Limiting

### **Statbot API Rate Limits:**

- Rate limits are enforced by Statbot
- Headers provided: `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`, `retry-after`
- Our implementation:
  - ✅ Parses rate limit headers
  - ✅ Waits for `retry-after` time when rate limited
  - ✅ Retries up to 3 times with exponential backoff
  - ✅ Uses bulk fetch to minimize API calls

### **Best Practices:**

- **Bulk operations:** Always use bulk endpoints when possible
- **Sequential processing:** Process users sequentially, not in parallel
- **Respect rate limits:** Wait for `retry-after` header before retrying
- **Error handling:** Skip sync if bulk fetch fails (don't fall back to individual calls)

---

## 🛡️ Error Handling

### **Error Types:**

1. **401/403 - Authentication Failed**
   - Check API key validity
   - Verify Statbot Premium is active
   - Bot continues with fallback

2. **400 - Bad Request**
   - Invalid query parameters
   - Missing required parameters
   - Bot skips sync gracefully

3. **404 - Not Found**
   - Endpoint path incorrect
   - Bot continues with fallback

4. **429 - Rate Limited**
   - Too many requests
   - Waits for `retry-after` time
   - Retries up to 3 times

5. **Network Errors**
   - API unreachable
   - Bot continues with fallback

### **Fallback Behavior:**

- ✅ Bot continues normal operation
- ✅ Mira's tracking system works independently
- ✅ No data loss
- ✅ Clear warning messages in logs

---

## 🔍 Health Check

The bot performs a health check on startup:

1. Tests API connectivity using member counts endpoint
2. Verifies authentication with API key
3. Logs status (success/failure)
4. Continues bot startup regardless of result

**Health Check Endpoint:**
- Uses `getGuildMemberCounts()` with `stats[]=['text']`
- Validates API is reachable and authenticated

---

## 📝 Implementation Details

### **Service Location:**
- `src/services/statbotService.ts`

### **Key Methods:**

- `healthCheck(guildId)` - Verify API connectivity
- `getGuildMemberCounts(guildId, startDate?, endDate?, stats?)` - Get member count series
- `getGuildMemberStats(guildId)` - Get all member statistics (bulk)
- `getGuildMessageSum(guildId, startDate?, endDate?)` - Get total message count
- `syncAllUsers(guildId, getAllUsers, updateUserVoiceTime?)` - Sync all users' voice time

### **Data Flow:**

```
Bot Startup
    ↓
Health Check (if enabled)
    ↓
Bulk Fetch Member Stats
    ↓
Create User Map (userId → voiceCount)
    ↓
Process Users Sequentially
    ↓
Compare & Sync (if needed)
    ↓
Hourly Sync (repeats)
```

---

## ⚠️ Important Notes

### **API Status:**
- **Experimental:** Statbot API is experimental and may change
- **Premium Required:** All Statbot Premium upgrades must be active
- **Guild-Specific:** API keys are tied to individual guilds

### **Data Accuracy:**
- Statbot's `voiceCount` represents voice activity (in minutes)
- Mira's `voiceTimeMinutes` tracks time spent in voice channels
- Sync tolerance: 5 minutes (accounts for timing differences)
- Auto-correction threshold: 10 minutes (only updates if Statbot has more data)

### **Performance:**
- Bulk fetch: 1 API call for all users
- Sequential processing: No parallel API calls
- Rate limit safe: Respects API limits
- Efficient: Uses in-memory map for lookups

---

## 🔗 References

- **Statbot API Documentation:** https://docs.statbot.net/docs/api/statbot-api
- **Get Member Counts:** https://docs.statbot.net/docs/api/get-guild-member-counts/
- **Get Member Stats:** https://docs.statbot.net/docs/api/get-guild-member-stats/
- **Get Message Sums:** https://docs.statbot.net/docs/api/get-guild-message-sums/
- **Rate Limit Headers:** https://docs.statbot.net/docs/api/schemas/ratelimitheaders
- **Statbot Support:** https://statbot.net/support (Discord: #💻-api-support)

---

## 🐛 Troubleshooting

### **Sync Not Working:**

1. Check API key is valid: `STATBOT_API_KEY` in `.env`
2. Verify Statbot is enabled: `STATBOT_ENABLED=true`
3. Check Premium status: All upgrades must be active
4. Review logs for error messages
5. Verify guild ID matches API key's guild

### **Rate Limit Errors:**

- Normal during bulk operations
- Bot automatically retries with backoff
- If persistent, increase `STATBOT_SYNC_INTERVAL`

### **400 Bad Request Errors:**

- Usually means invalid query parameters
- Check endpoint paths match API docs
- Verify required parameters are provided
- Bot will skip sync gracefully

---

*For developer documentation, see [DEVELOPMENT.md](./DEVELOPMENT.md)*

