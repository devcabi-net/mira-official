# Mira Discord Verification Bot

A robust Discord bot built with Discord.js and TypeScript for user verification management. The bot provides a clean, scalable solution for verifying users by managing role assignments and logging verification activities.

## 🚀 Features

- **Slash Command Integration**: Modern Discord slash command `/verify` for user verification
- **Role Management**: Automatically removes unverified role and adds verified role
- **Permission System**: Comprehensive permission validation for verifiers
- **Logging System**: Detailed logging of all verification activities to specified channels
- **Error Handling**: Robust error handling with user-friendly messages
- **TypeScript**: Full TypeScript support with strict type checking
- **Scalable Architecture**: Clean, modular codebase designed for easy extension

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- Discord Bot Token
- Discord Application with proper permissions
- Discord Server (Guild) with configured roles

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mira-discord-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Discord bot configuration:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_CLIENT_ID=your_discord_client_id_here
   DISCORD_GUILD_ID=your_guild_id_here
   
   UNVERIFIED_ROLE_ID=unverified_role_id_here
   VERIFIED_ROLE_ID=verified_role_id_here
   VERIFIER_ROLE_ID=verifier_role_id_here
   
   LOG_CHANNEL_ID=log_channel_id_here
   
   NODE_ENV=development
   ```

4. **Deploy slash commands**
   ```bash
   npm run deploy
   ```

5. **Start the bot**
   ```bash
   npm run dev    # Development mode
   npm start      # Production mode
   ```

## 🔧 Configuration

### Required Discord Bot Permissions

Your Discord bot needs the following permissions:
- **Manage Roles**: To add/remove verification roles
- **Send Messages**: To send verification responses and logs
- **Use Slash Commands**: To register and use slash commands
- **Read Message History**: To access channel information

### Role Setup

1. **Unverified Role**: Assigned to new users who need verification
2. **Verified Role**: Assigned to users after successful verification
3. **Verifier Role**: Required role for users who can perform verifications

### Channel Setup

- **Log Channel**: Where verification activities are logged (must be a text channel)

## 📖 Usage

### Verification Command

```
/verify target:@username reason:Optional verification reason
```

**Parameters:**
- `target` (required): The user to verify (mention or user ID)
- `reason` (optional): Reason for verification (max 500 characters)

**Permissions Required:**
- User must have the Verifier role
- User must have "Manage Roles" permission
- User must be able to manage the target roles

### Example Usage

```
/verify target:@newuser reason:Completed onboarding process
```

## 🏗️ Project Structure

```
src/
├── commands/           # Slash command definitions
│   ├── verify.ts      # Verification command
│   └── index.ts       # Command registry
├── events/            # Discord event handlers
│   ├── ready.ts       # Bot ready event
│   ├── interactionCreate.ts  # Command interaction handler
│   └── index.ts       # Event registry
├── services/          # Business logic services
│   └── verificationService.ts  # Verification logic
├── utils/             # Utility functions
│   ├── config.ts      # Configuration management
│   ├── embeds.ts      # Discord embed utilities
│   └── permissions.ts # Permission validation
├── types/             # TypeScript type definitions
│   └── index.ts       # Global types
├── deploy-commands.ts # Command deployment script
└── index.ts           # Main bot entry point
```

## 🔍 Development

### Available Scripts

- `npm run dev`: Start bot in development mode with hot reload
- `npm run build`: Build TypeScript to JavaScript
- `npm start`: Start production bot
- `npm run deploy`: Deploy slash commands to Discord
- `npm run setup`: Interactive setup script for configuration
- `npm run test-config`: Test configuration loading
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint issues
- `npm test`: Run tests

### Adding New Commands

1. Create a new command file in `src/commands/`
2. Export `data` (SlashCommandBuilder) and `execute` function
3. Register the command in `src/commands/index.ts`

### Adding New Events

1. Create a new event file in `src/events/`
2. Export `name`, `once`, and `execute` properties
3. Register the event in `src/events/index.ts`

## 🛡️ Security Features

- **Permission Validation**: Comprehensive permission checking
- **Role Hierarchy**: Respects Discord role hierarchy
- **Input Validation**: Validates all user inputs
- **Error Handling**: Graceful error handling without exposing sensitive information
- **Logging**: Audit trail for all verification activities

## 📝 Logging

The bot logs all verification activities to the specified log channel with:
- Target user information
- Verifier information
- Verification reason (if provided)
- Timestamp
- Rich embed formatting

## 🚨 Error Handling

The bot includes comprehensive error handling:
- Permission validation errors
- Role management errors
- Network/API errors
- Invalid user input errors
- Graceful shutdown handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify your environment configuration
3. Ensure bot has proper permissions
4. Check Discord Developer Portal settings

## 🔄 Version History

- **v1.0.0**: Initial release with verification functionality
  - Slash command support
  - Role management
  - Logging system
  - Permission validation 