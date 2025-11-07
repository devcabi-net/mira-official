import { GuildMember, Guild } from 'discord.js'
import { 
  CurrencyUser, 
  CurrencyTransaction, 
  CurrencyResult, 
  CurrencyTier, 
  CurrencyConfig,
  ModerationAction,
  ModerationLog
} from '@/types'
import { DataPersistenceService } from './dataPersistenceService'
import { LoggingService } from './loggingService'

export class CurrencyService {
  private config: CurrencyConfig
  private dataService: DataPersistenceService
  private loggingService: LoggingService
  private userCooldowns = new Map<string, Map<string, number>>() // userId -> actionId -> timestamp

  constructor(config: CurrencyConfig, dataService: DataPersistenceService, loggingService: LoggingService) {
    this.config = config
    this.dataService = dataService
    this.loggingService = loggingService
  }

  // Expose services for role actions (needed for logging)
  getDataService(): DataPersistenceService {
    return this.dataService
  }

  getLoggingService(): LoggingService {
    return this.loggingService
  }

  // User Management
  async getUser(userId: string): Promise<CurrencyUser | null> {
    const user = await this.dataService.getUser(userId)
    if (user) {
      // Ensure dates are properly converted from JSON
      user.lastActive = user.lastActive instanceof Date ? user.lastActive : new Date(user.lastActive)
    }
    return user
  }

  async getOrCreateUser(userId: string): Promise<CurrencyUser> {
    let user = await this.getUser(userId)
    
    if (!user) {
      user = {
        userId,
        balance: 0,
        totalEarned: 0,
        lastActive: new Date(),
        voiceTimeMinutes: 0,
        tier: 'bronze'
      }
      await this.dataService.saveUser(user)
    } else {
      // Ensure dates are properly converted from JSON
      user.lastActive = user.lastActive instanceof Date ? user.lastActive : new Date(user.lastActive)
    }
    
    return user
  }

  async getUserBalance(userId: string): Promise<number> {
    const user = await this.getOrCreateUser(userId)
    return user.balance
  }

  async getUserTier(userId: string): Promise<CurrencyTier> {
    const user = await this.getOrCreateUser(userId)
    return this.calculateTier(user.balance)
  }

  // Currency Operations
  async addCurrency(
    userId: string, 
    amount: number, 
    reason: string, 
    metadata?: Record<string, any>,
    guild?: Guild,
    member?: GuildMember
  ): Promise<CurrencyResult> {
    try {
      const user = await this.getOrCreateUser(userId)
      const oldBalance = user.balance
      const oldTier = user.tier
      
      user.balance += amount
      user.totalEarned += amount
      // Don't auto-upgrade tiers - users must purchase them
      user.lastActive = new Date()
      
      await this.dataService.saveUser(user)
      
      // Log transaction
      const transaction: CurrencyTransaction = {
        id: this.generateId(),
        userId,
        type: 'earn',
        amount,
        reason,
        timestamp: new Date(),
        metadata: metadata || {}
      }
      await this.dataService.addTransaction(transaction)
      
      // No automatic tier upgrades - users must purchase them
      
      return {
        success: true,
        message: `Added ${amount} currency. New balance: ${user.balance}`,
        newBalance: user.balance,
        tier: user.tier
      }
    } catch (error) {
      console.error('Failed to add currency:', error)
      return {
        success: false,
        message: 'Failed to add currency. Please try again.'
      }
    }
  }

  async deductCurrency(
    userId: string, 
    amount: number, 
    reason: string, 
    metadata?: Record<string, any>,
    guild?: Guild,
    member?: GuildMember
  ): Promise<CurrencyResult> {
    try {
      const user = await this.getOrCreateUser(userId)
      
      if (user.balance < amount) {
        return {
          success: false,
          message: `Insufficient currency. Required: ${amount}, Available: ${user.balance}`
        }
      }
      
      user.balance -= amount
      // Don't auto-downgrade tiers - they stay purchased
      user.lastActive = new Date()
      
      await this.dataService.saveUser(user)
      
      // Log transaction
      const transaction: CurrencyTransaction = {
        id: this.generateId(),
        userId,
        type: 'spend',
        amount: -amount,
        reason,
        timestamp: new Date(),
        metadata: metadata || {}
      }
      await this.dataService.addTransaction(transaction)
      
      // Log spending to Discord (this is important for moderation actions)
      if (guild) {
        await this.loggingService.logCurrencyTransaction(guild, transaction, member)
      }
      
      return {
        success: true,
        message: `Deducted ${amount} currency. New balance: ${user.balance}`,
        newBalance: user.balance,
        tier: user.tier
      }
    } catch (error) {
      console.error('Failed to deduct currency:', error)
      return {
        success: false,
        message: 'Failed to deduct currency. Please try again.'
      }
    }
  }

  // Voice Time Tracking
  async addVoiceTime(userId: string, minutes: number, guild?: Guild, member?: GuildMember): Promise<CurrencyResult> {
    const currencyEarned = minutes * this.config.currencyPerMinute
    
    const result = await this.addCurrency(
      userId, 
      currencyEarned, 
      `Voice time: ${minutes} minutes`,
      { voiceTime: minutes },
      guild,
      member
    )
    
    if (result.success) {
      // Update voice time tracking
      const user = await this.getOrCreateUser(userId)
      user.voiceTimeMinutes += minutes
      await this.dataService.saveUser(user)
      
      // Only log significant voice milestones (every 1000 minutes)
      if (guild && member && user.voiceTimeMinutes % 1000 === 0) {
        await this.loggingService.logVoiceMilestone(guild, member, user.voiceTimeMinutes, currencyEarned)
      }
    }
    
    return result
  }

  // Moderation Actions
  async canPerformModerationAction(
    userId: string, 
    actionId: string
  ): Promise<{ canPerform: boolean; error?: string; action?: ModerationAction }> {
    const action = this.config.moderationActions.find(a => a.id === actionId)
    if (!action) {
      return { canPerform: false, error: 'Invalid moderation action' }
    }
    
    const user = await this.getOrCreateUser(userId)
    
    // Check currency requirement
    if (user.balance < action.cost) {
      return { 
        canPerform: false, 
        error: `Insufficient currency. Required: ${action.cost}, Available: ${user.balance}`,
        action 
      }
    }
    
    // Check tier requirement
    if (!this.hasRequiredTier(user.tier, action.requiredTier)) {
      return { 
        canPerform: false, 
        error: `Insufficient tier. Required: ${action.requiredTier}, Current: ${user.tier}`,
        action 
      }
    }
    
    // Check cooldown
    const cooldownCheck = this.checkCooldown(userId, actionId, action.cooldown)
    if (!cooldownCheck.canUse) {
      return { 
        canPerform: false, 
        error: `Action on cooldown. Available in ${cooldownCheck.remainingTime} minutes`,
        action 
      }
    }
    
    return { canPerform: true, action }
  }

  async performModerationAction(
    moderatorId: string,
    targetId: string,
    actionId: string,
    reason: string,
    guild?: Guild
  ): Promise<{ success: boolean; message: string; cost?: number }> {
    const canPerform = await this.canPerformModerationAction(moderatorId, actionId)
    
    if (!canPerform.canPerform || !canPerform.action) {
      return {
        success: false,
        message: canPerform.error || 'Cannot perform moderation action'
      }
    }
    
    const action = canPerform.action
    
    // Deduct currency
    const deductResult = await this.deductCurrency(
      moderatorId,
      action.cost,
      `Moderation action: ${action.name}`,
      { targetId, actionId, reason },
      guild
    )
    
    if (!deductResult.success) {
      return {
        success: false,
        message: deductResult.message
      }
    }
    
    // Set cooldown
    this.setCooldown(moderatorId, actionId, action.cooldown)
    
    // Log moderation action
    const log: ModerationLog = {
      id: this.generateId(),
      moderatorId,
      targetId,
      action: action.name,
      cost: action.cost,
      reason,
      timestamp: new Date(),
      success: true
    }
    await this.dataService.addModerationLog(log)
    
    // Log to Discord if guild is provided
    if (guild) {
      await this.loggingService.logModerationAction(guild, log)
    }
    
    return {
      success: true,
      message: `Successfully performed ${action.name}. Cost: ${action.cost} Social Credits`,
      cost: action.cost
    }
  }

  // Leaderboard
  async getLeaderboard(limit: number = 10): Promise<CurrencyUser[]> {
    const users = await this.dataService.getAllUsers()
    return users
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit)
  }

  async getVoiceTimeLeaderboard(limit: number = 10): Promise<CurrencyUser[]> {
    const users = await this.dataService.getAllUsers()
    return users
      .sort((a, b) => b.voiceTimeMinutes - a.voiceTimeMinutes)
      .slice(0, limit)
  }

  // Utility Methods
  private calculateTier(balance: number, purchasedTier?: CurrencyTier): CurrencyTier {
    // If user has purchased a tier, use that instead of balance-based calculation
    if (purchasedTier) {
      return purchasedTier
    }
    return 'bronze' // Default tier, upgrades must be purchased
  }

  // Prestige System - Purchase tier upgrades
  async purchaseTierUpgrade(userId: string, targetTier: CurrencyTier, guild?: Guild, member?: GuildMember): Promise<CurrencyResult> {
    try {
      const user = await this.getOrCreateUser(userId)
      const currentTier = user.tier
      
      // Check if user can upgrade to this tier
      const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
      const currentIndex = tierOrder.indexOf(currentTier)
      const targetIndex = tierOrder.indexOf(targetTier)
      
      if (targetIndex <= currentIndex) {
        return {
          success: false,
          message: `You are already at ${currentTier} tier or higher.`
        }
      }
      
      // Calculate cost for tier upgrade
      const cost = this.getTierUpgradeCost(targetTier)
      
      if (user.balance < cost) {
        return {
          success: false,
          message: `Insufficient currency. Required: ${cost.toLocaleString()}, Available: ${user.balance.toLocaleString()}`
        }
      }
      
      // Deduct currency and upgrade tier
      user.balance -= cost
      user.tier = targetTier
      user.lastActive = new Date()
      
      await this.dataService.saveUser(user)
      
      // Log the purchase
      const transaction: CurrencyTransaction = {
        id: this.generateId(),
        userId,
        type: 'spend',
        amount: -cost,
        reason: `Tier upgrade to ${targetTier}`,
        timestamp: new Date(),
        metadata: { tierUpgrade: true, fromTier: currentTier, toTier: targetTier }
      }
      await this.dataService.addTransaction(transaction)
      
      // Log to Discord
      if (guild && member) {
        await this.loggingService.logTierUpgrade(guild, member, currentTier, targetTier, user.balance)
      }
      
      return {
        success: true,
        message: `Successfully upgraded to ${targetTier} tier! Cost: ${cost.toLocaleString()} currency`,
        newBalance: user.balance,
        tier: targetTier
      }
    } catch (error) {
      console.error('Failed to purchase tier upgrade:', error)
      return {
        success: false,
        message: 'Failed to purchase tier upgrade. Please try again.'
      }
    }
  }

  private getTierUpgradeCost(tier: CurrencyTier): number {
    const costs = {
      bronze: 0,
      silver: 10000,    // 10k currency
      gold: 25000,      // 25k currency  
      platinum: 50000,  // 50k currency
      diamond: 100000   // 100k currency
    }
    return costs[tier]
  }

  private hasRequiredTier(userTier: CurrencyTier, requiredTier: CurrencyTier): boolean {
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
    const userTierIndex = tierOrder.indexOf(userTier)
    const requiredTierIndex = tierOrder.indexOf(requiredTier)
    
    return userTierIndex >= requiredTierIndex
  }

  private checkCooldown(userId: string, actionId: string, cooldownMinutes: number): { canUse: boolean; remainingTime: number } {
    const userCooldowns = this.userCooldowns.get(userId) || new Map()
    const lastUsed = userCooldowns.get(actionId) || 0
    const now = Date.now()
    const cooldownMs = cooldownMinutes * 60 * 1000
    
    if (now - lastUsed < cooldownMs) {
      const remainingMs = cooldownMs - (now - lastUsed)
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000))
      return { canUse: false, remainingTime: remainingMinutes }
    }
    
    return { canUse: true, remainingTime: 0 }
  }

  private setCooldown(userId: string, actionId: string, cooldownMinutes: number): void {
    if (!this.userCooldowns.has(userId)) {
      this.userCooldowns.set(userId, new Map())
    }
    
    const userCooldowns = this.userCooldowns.get(userId)!
    userCooldowns.set(actionId, Date.now())
  }

  // Expose cooldown setting for role actions
  setActionCooldown(userId: string, actionId: string, cooldownMinutes: number): void {
    this.setCooldown(userId, actionId, cooldownMinutes)
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}
