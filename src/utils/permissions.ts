import { 
  GuildMember, 
  ChatInputCommandInteraction,
  PermissionResolvable 
} from 'discord.js'
import { VerificationConfig } from '@/types'

export function hasRequiredRole(
  member: GuildMember,
  requiredRoleId: string
): boolean {
  return member.roles.cache.has(requiredRoleId)
}

export function hasRequiredPermissions(
  member: GuildMember,
  permissions: PermissionResolvable[]
): boolean {
  return permissions.every(permission => 
    member.permissions.has(permission)
  )
}

export function validateVerifierPermissions(
  member: GuildMember,
  config: VerificationConfig
): { hasPermission: boolean; error?: string } {
  // Check if user has the verifier role
  if (!hasRequiredRole(member, config.verifierRoleId)) {
    return {
      hasPermission: false,
      error: 'You do not have permission to verify users. You need the Verifier role.'
    }
  }

  return { hasPermission: true }
}

export function validateTargetUser(
  targetMember: GuildMember,
  config: VerificationConfig
): { isValid: boolean; error?: string; alreadyVerified?: boolean } {
  // Check if target user already has the verified role
  if (targetMember.roles.cache.has(config.verifiedRoleId)) {
    return {
      isValid: false,
      error: 'This user is already verified.',
      alreadyVerified: true
    }
  }

  // User is valid for verification (doesn't have verified role)
  return { isValid: true }
}

export function canManageRole(
  member: GuildMember,
  roleId: string
): boolean {
  const role = member.guild.roles.cache.get(roleId)
  if (!role) return false

  // Check if the member can manage this specific role
  return member.permissions.has('ManageRoles') && 
         member.roles.highest.position > role.position
} 