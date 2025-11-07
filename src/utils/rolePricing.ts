import { Role, Guild } from 'discord.js'

/**
 * Calculate the cost to give or take a role based on its hierarchy position
 * Uses linear interpolation: Top role = 1,000,000 credits, Bottom role = 50,000 credits
 * Creates a smooth gradient pricing between minimum and maximum
 */
export function calculateRoleCost(role: Role, guild: Guild): number {
  const MIN_COST = 50000
  const MAX_COST = 1000000
  
  // Get all roles sorted by position (highest first)
  const roles = guild.roles.cache
    .filter(r => !r.managed && r.id !== guild.id) // Exclude managed roles (bot roles) and @everyone
    .sort((a, b) => b.position - a.position) // Sort descending (highest position first)
  
  if (roles.size === 0) {
    return MIN_COST
  }
  
  const maxPosition = roles.first()!.position
  const minPosition = roles.last()!.position
  const rolePosition = role.position
  
  // If only one role or all roles at same position, return max cost
  if (maxPosition === minPosition) {
    return MAX_COST
  }
  
  // Calculate position ratio (0.0 = top role, 1.0 = bottom role)
  // Higher positions (lower numbers in Discord) = closer to 0.0 = more expensive
  const positionRange = maxPosition - minPosition
  const positionFromTop = maxPosition - rolePosition
  const ratio = positionFromTop / positionRange
  
  // Linear interpolation: ratio 0 = MAX_COST, ratio 1 = MIN_COST
  // cost = MAX_COST - (ratio * (MAX_COST - MIN_COST))
  const cost = MAX_COST - (ratio * (MAX_COST - MIN_COST))
  
  // Ensure cost is within bounds (safety check)
  return Math.round(Math.max(MIN_COST, Math.min(MAX_COST, cost)))
}

/**
 * Get the highest position available for role management
 */
export function getMaxRolePosition(guild: Guild): number {
  const roles = guild.roles.cache
    .filter(r => !r.managed && r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
  
  return roles.first()?.position || 0
}

/**
 * Check if a role can be managed (bot's role must be higher)
 */
export function canManageRole(botRole: Role | null, targetRole: Role): boolean {
  if (!botRole) return false
  return botRole.position > targetRole.position
}

/**
 * Check if a role is protected (system roles, @everyone, managed roles)
 */
export function isProtectedRole(role: Role, protectedRoleIds: string[]): boolean {
  // Check if it's @everyone
  if (role.id === role.guild.id) return true
  
  // Check if it's a managed role (bot roles)
  if (role.managed) return true
  
  // Check if it's in protected roles list
  if (protectedRoleIds.includes(role.id)) return true
  
  return false
}

