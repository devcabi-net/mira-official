import { Collection } from 'discord.js'
import * as ready from './ready'
import * as interactionCreate from './interactionCreate'
import { VerificationConfig } from '@/types'

export interface Event {
  name: string
  once: boolean
  execute: (interaction: any, config?: VerificationConfig) => Promise<void> | void
}

export const events = new Collection<string, Event>()

// Register events
events.set(ready.name, ready)
events.set(interactionCreate.name, interactionCreate)

export function getEvents(): Collection<string, Event> {
  return events
} 