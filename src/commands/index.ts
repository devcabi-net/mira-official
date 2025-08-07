import { Collection } from 'discord.js'
import * as verify from './verify'
import { VerificationConfig } from '@/types'

export interface Command {
  data: any
  execute: (interaction: any, config: VerificationConfig) => Promise<void>
}

export const commands = new Collection<string, Command>()

// Register commands
commands.set(verify.data.name, verify)

export function getCommands(): Collection<string, Command> {
  return commands
}

export function getCommandData() {
  return commands.map(command => command.data.toJSON())
} 