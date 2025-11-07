import { Collection } from 'discord.js'
import * as verify from './verify'
import * as balance from './balance'
import * as leaderboard from './leaderboard'
import * as tier from './tier'
import * as marketplace from './marketplace'

export interface Command {
  data: any
  execute: (interaction: any, ...args: any[]) => Promise<void>
}

export const commands = new Collection<string, Command>()

// Register commands
commands.set(verify.data.name, verify)
commands.set(balance.data.name, balance)
commands.set(leaderboard.data.name, leaderboard)
commands.set(tier.data.name, tier)
commands.set(marketplace.data.name, marketplace)

export function getCommands(): Collection<string, Command> {
  return commands
}

export function getCommandData() {
  return commands.map(command => command.data.toJSON())
} 