import { Collection } from 'discord.js'
import * as ready from './ready'
import * as interactionCreate from './interactionCreate'
import * as voiceStateUpdate from './voiceStateUpdate'
import { VerificationConfig } from '@/types'

export interface Event {
  name: string
  once: boolean
  execute: (...args: any[]) => Promise<void> | void
}

export const events = new Collection<string, Event>()

// Register events
events.set(ready.name, ready)
events.set(interactionCreate.name, interactionCreate)
events.set(voiceStateUpdate.name, voiceStateUpdate)

export function getEvents(): Collection<string, Event> {
  return events
} 