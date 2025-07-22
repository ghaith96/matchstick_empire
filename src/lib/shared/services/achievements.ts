import { get } from 'svelte/store';
import { gameState, gameActions } from '../stores/gameState.js';

/**
 * Simple achievement definition for the service
 */
export interface SimpleAchievement {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  points: number;
  requirements: {
    type: string;
    resource?: string;
    amount?: bigint;
    stat?: string;
    value?: number;
    phase?: string;
  };
  reward: {
    type: string;
    amount?: number;
    multiplier?: number;
  };
  unlocked: boolean;
}

/**
 * Simple achievement service for managing player accomplishments
 */
export class AchievementService {
  private static instance: AchievementService;
  private achievements: SimpleAchievement[] = [];

  private constructor() {
    this.initializeAchievements();
  }

  public static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  /**
   * Initialize achievement definitions
   */
  private initializeAchievements(): void {
    this.achievements = [
      // Production achievements
      {
        id: 'first_match',
        name: 'First Light',
        description: 'Create your very first matchstick',
        category: 'production',
        difficulty: 'easy',
        points: 5,
        requirements: { type: 'resource_total', resource: 'matchsticks', amount: 1n },
        reward: { type: 'money', amount: 10 },
        unlocked: false
      },
      {
        id: 'first_hundred',
        name: 'Century Maker',
        description: 'Produce 100 matchsticks',
        category: 'production',
        difficulty: 'easy',
        points: 10,
        requirements: { type: 'resource_total', resource: 'matchsticks', amount: 100n },
        reward: { type: 'money', amount: 50 },
        unlocked: false
      },
      {
        id: 'thousand_matches',
        name: 'Master Craftsman',
        description: 'Produce 1,000 matchsticks',
        category: 'production',
        difficulty: 'medium',
        points: 25,
        requirements: { type: 'resource_total', resource: 'matchsticks', amount: 1000n },
        reward: { type: 'money', amount: 200 },
        unlocked: false
      },

      // Trading achievements
      {
        id: 'first_sale',
        name: 'First Sale',
        description: 'Make your first sale',
        category: 'trading',
        difficulty: 'easy',
        points: 5,
        requirements: { type: 'stat_threshold', stat: 'totalSold', value: 1 },
        reward: { type: 'money', amount: 25 },
        unlocked: false
      },
      {
        id: 'merchant_apprentice',
        name: 'Merchant Apprentice',
        description: 'Earn $100 in total revenue',
        category: 'trading',
        difficulty: 'easy',
        points: 10,
        requirements: { type: 'stat_threshold', stat: 'totalRevenue', value: 100 },
        reward: { type: 'money', amount: 50 },
        unlocked: false
      },
      {
        id: 'bulk_trader',
        name: 'Bulk Trader',
        description: 'Sell 1,000 matchsticks in total',
        category: 'trading',
        difficulty: 'medium',
        points: 20,
        requirements: { type: 'stat_threshold', stat: 'totalSold', value: 1000 },
        reward: { type: 'money', amount: 100 },
        unlocked: false
      },

      // Automation achievements
      {
        id: 'automation_investor',
        name: 'Automation Investor',
        description: 'Spend $500 on automation',
        category: 'automation',
        difficulty: 'medium',
        points: 15,
        requirements: { type: 'stat_threshold', stat: 'totalAutomationSpent', value: 500 },
        reward: { type: 'money', amount: 75 },
        unlocked: false
      },
      {
        id: 'clicker_collector',
        name: 'Clicker Collector',
        description: 'Own 10 auto-clickers',
        category: 'automation',
        difficulty: 'medium',
        points: 20,
        requirements: { type: 'stat_threshold', stat: 'totalAutoClickers', value: 10 },
        reward: { type: 'money', amount: 100 },
        unlocked: false
      },

      // Progression achievements
      {
        id: 'automation_phase',
        name: 'Industrial Revolution',
        description: 'Reach the automation phase',
        category: 'progression',
        difficulty: 'medium',
        points: 30,
        requirements: { type: 'phase_reached', phase: 'automation' },
        reward: { type: 'money', amount: 150 },
        unlocked: false
      }
    ];
  }

  /**
   * Initialize the service (placeholder for compatibility)
   */
  public async initialize(): Promise<void> {
    // Service is already initialized in constructor
  }

  /**
   * Check for newly unlocked achievements
   */
  public checkAchievements(): SimpleAchievement[] {
    const state = get(gameState);
    const newlyUnlocked: SimpleAchievement[] = [];

    for (const achievement of this.achievements) {
      if (achievement.unlocked) continue;

      if (this.isAchievementMet(achievement, state)) {
        achievement.unlocked = true;
        newlyUnlocked.push(achievement);
        
        // Apply reward
        this.applyReward(achievement.reward);
        
                 // Update game state
         gameActions.updateAchievements({
           unlocked: [...(state.achievements.unlocked || []), achievement.id],
           stats: {
             ...state.achievements.stats,
             totalUnlocked: (state.achievements.stats.totalUnlocked || 0) + 1
           }
         });

        // Emit event
        gameActions.emitEvent({
          id: `achievement_${achievement.id}_${Date.now()}`,
          type: 'achievement_unlocked',
          timestamp: Date.now(),
          data: {
            achievementId: achievement.id,
            name: achievement.name,
            points: achievement.points,
            reward: achievement.reward
          },
          source: 'achievement_service'
        });
      }
    }

    return newlyUnlocked;
  }

  /**
   * Check if an achievement's requirements are met
   */
  private isAchievementMet(achievement: SimpleAchievement, state: any): boolean {
    const req = achievement.requirements;

    switch (req.type) {
      case 'resource_total':
        if (req.resource === 'matchsticks') {
          return (state.production?.totalProduced || 0n) >= (req.amount || 0n);
        }
        return false;

      case 'stat_threshold':
        switch (req.stat) {
          case 'totalSold':
            return Number(state.market?.totalSold || 0n) >= (req.value || 0);
          case 'totalRevenue':
            return (state.market?.totalRevenue || 0) >= (req.value || 0);
          case 'totalAutomationSpent':
            return (state.automation?.totalMoneySpent || 0) >= (req.value || 0);
          case 'totalAutoClickers':
            const autoClickers = state.automation?.autoClickers || [];
            return autoClickers.reduce((sum: number, clicker: any) => sum + (clicker.level || 0), 0) >= (req.value || 0);
        }
        return false;

      case 'phase_reached':
        return state.progression?.currentPhase === req.phase;

      default:
        return false;
    }
  }

  /**
   * Apply achievement reward
   */
  private applyReward(reward: { type: string; amount?: number; multiplier?: number }): void {
    switch (reward.type) {
      case 'money':
        if (reward.amount) {
          gameActions.addResources({ money: reward.amount });
        }
        break;
      // Add other reward types as needed
    }
  }

  /**
   * Get all achievements
   */
  public getAllAchievements(): SimpleAchievement[] {
    return [...this.achievements];
  }

  /**
   * Get unlocked achievements
   */
  public getUnlockedAchievements(): SimpleAchievement[] {
    return this.achievements.filter(a => a.unlocked);
  }

  /**
   * Get achievement by ID
   */
  public getAchievement(id: string): SimpleAchievement | undefined {
    return this.achievements.find(a => a.id === id);
  }

  /**
   * Get achievements by category
   */
  public getAchievementsByCategory(category: string): SimpleAchievement[] {
    return this.achievements.filter(a => a.category === category);
  }

  /**
   * Get achievement statistics
   */
  public getStats(): any {
    const total = this.achievements.length;
    const unlocked = this.achievements.filter(a => a.unlocked).length;
    const points = this.achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.points, 0);

    return {
      totalAchievements: total,
      unlockedAchievements: unlocked,
      completionPercentage: total > 0 ? (unlocked / total) * 100 : 0,
      achievementPoints: points
    };
  }

  /**
   * Reset all achievements (for testing)
   */
  public resetAchievements(): void {
    this.achievements.forEach(a => a.unlocked = false);
  }

  /**
   * Stop tracking (for testing compatibility)
   */
  public stopTracking(): void {
    // No-op in simplified service
  }

  /**
   * Manually unlock achievement by ID
   */
  public unlockAchievementById(id: string): SimpleAchievement | null {
    const achievement = this.achievements.find(a => a.id === id);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      this.applyReward(achievement.reward);

      // Update game state
      const state = get(gameState);
      gameActions.updateAchievements({
        unlocked: [...(state.achievements.unlocked || []), achievement.id],
        stats: {
          ...state.achievements.stats,
          totalUnlocked: (state.achievements.stats.totalUnlocked || 0) + 1
        }
      });

      return achievement;
    }
    return null;
  }

  /**
   * Get achievement progress
   */
  public getAchievementProgress(id: string): any {
    const achievement = this.achievements.find(a => a.id === id);
    if (!achievement) return null;

    if (achievement.unlocked) {
      return {
        achievementId: id,
        progress: 1,
        isComplete: true,
        currentValue: 1,
        targetValue: 1
      };
    }

    const state = get(gameState);
    const progress = this.calculateProgress(achievement, state);

    return {
      achievementId: id,
      progress,
      isComplete: false,
      currentValue: progress,
      targetValue: 1
    };
  }

  /**
   * Calculate progress for an achievement
   */
  private calculateProgress(achievement: SimpleAchievement, state: any): number {
    const req = achievement.requirements;

    switch (req.type) {
      case 'resource_total':
        if (req.resource === 'matchsticks') {
          const current = Number(state.production?.totalProduced || 0n);
          const target = Number(req.amount || 0n);
          return target > 0 ? Math.min(current / target, 1) : 0;
        }
        return 0;

      case 'stat_threshold':
        switch (req.stat) {
          case 'totalSold':
            const current = Number(state.market?.totalSold || 0n);
            return (req.value || 0) > 0 ? Math.min(current / (req.value || 0), 1) : 0;
          case 'totalRevenue':
            return (req.value || 0) > 0 ? Math.min((state.market?.totalRevenue || 0) / (req.value || 0), 1) : 0;
          case 'totalAutomationSpent':
            return (req.value || 0) > 0 ? Math.min((state.automation?.totalMoneySpent || 0) / (req.value || 0), 1) : 0;
        }
        return 0;

      default:
        return this.isAchievementMet(achievement, state) ? 1 : 0;
    }
  }

  /**
   * Get available achievements (visible ones)
   */
  public getAvailableAchievements(): SimpleAchievement[] {
    return this.achievements.filter(a => !a.unlocked);
  }

  /**
   * Add custom achievement
   */
  public addCustomAchievement(config: any): boolean {
    if (!config.id || !config.name || this.achievements.some(a => a.id === config.id)) {
      return false;
    }

    const achievement: SimpleAchievement = {
      id: config.id,
      name: config.name,
      description: config.description || '',
      category: config.category || 'custom',
      difficulty: config.difficulty || 'medium',
      points: config.points || 10,
      requirements: config.requirements || { type: 'custom' },
      reward: config.reward || { type: 'money', amount: 10 },
      unlocked: false
    };

    this.achievements.push(achievement);
    return true;
  }
}

// Export singleton instance
export const achievementService = AchievementService.getInstance(); 
