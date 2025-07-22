import { get } from 'svelte/store';
import { gameState, gameActions } from '../stores/gameState.js';
import type { ProductionEvent } from '../types/index.js';
import { SafeBigInt } from '../utils/numbers.js';
import { createError, errorHandler } from '../utils/errors.js';
import { achievementService } from './achievements.js';

/**
 * Production multiplier effects
 */
export interface ProductionMultiplier {
  id: string;
  name: string;
  multiplier: number;
  duration?: number; // in milliseconds, undefined for permanent
  startTime?: number;
  source: 'upgrade' | 'achievement' | 'temporary' | 'skill';
}

/**
 * Click combo system for rewarding rapid clicking
 */
export interface ClickCombo {
  count: number;
  startTime: number;
  multiplier: number;
  maxCombo: number;
  decayRate: number; // clicks per second to maintain combo
}

/**
 * Production statistics for analytics
 */
export interface ProductionStats {
  totalClicks: number;
  totalProduced: bigint;
  averageClickRate: number;
  maxCombo: number;
  sessionProduction: bigint;
  sessionClicks: number;
  sessionStartTime: number;
}

/**
 * Production service for manual matchstick creation
 */
export class ProductionService {
  private static instance: ProductionService;
  private clickCombo: ClickCombo;
  private productionStats: ProductionStats;
  private lastClickTime: number = 0;
  private recentClicks: number[] = []; // timestamps for rate calculation

  private constructor() {
    this.clickCombo = {
      count: 0,
      startTime: 0,
      multiplier: 1,
      maxCombo: 50, // max combo count
      decayRate: 0.5 // clicks per second to maintain
    };

    this.productionStats = {
      totalClicks: 0,
      totalProduced: 0n,
      averageClickRate: 0,
      maxCombo: 0,
      sessionProduction: 0n,
      sessionClicks: 0,
      sessionStartTime: Date.now()
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ProductionService {
    if (!ProductionService.instance) {
      ProductionService.instance = new ProductionService();
    }
    return ProductionService.instance;
  }

  /**
   * Produce matchsticks manually (main click action)
   */
  produceMatchsticks(clickCount: number = 1): {
    produced: bigint;
    comboMultiplier: number;
    totalMultiplier: number;
    comboCount: number;
  } {
    try {
      const currentTime = Date.now();
      const currentState = get(gameState);

      // Update click statistics
      this.updateClickStats(clickCount, currentTime);

      // Calculate base production
      let baseProduction = currentState.production.manualRate * clickCount;

      // Apply combo multiplier
      const comboMultiplier = this.updateClickCombo(currentTime);

      // Calculate all multipliers
      const totalMultiplier = this.calculateTotalMultiplier(comboMultiplier);

      // Calculate final production amount
      const finalProduction = BigInt(Math.floor(baseProduction * totalMultiplier));

      // Ensure we produce at least 1 matchstick per click
      const actualProduction = finalProduction > BigInt(clickCount) ? finalProduction : BigInt(clickCount);

      // Update game state
      gameActions.addResources({ matchsticks: actualProduction });
      gameActions.updateProduction({
        totalProduced: SafeBigInt.add(currentState.production.totalProduced, actualProduction)
      });

      // Update internal stats
      this.productionStats.totalProduced = SafeBigInt.add(
        this.productionStats.totalProduced, 
        actualProduction
      );
      this.productionStats.sessionProduction = SafeBigInt.add(
        this.productionStats.sessionProduction, 
        actualProduction
      );

      // Emit production event
      gameActions.emitEvent({
        id: `production_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'manual_production',
        timestamp: currentTime,
        data: {
          produced: actualProduction,
          clickCount,
          comboMultiplier,
          totalMultiplier,
          comboCount: this.clickCombo.count,
          name: 'Like a donkey',
        },
        source: 'production_service'
      });

      // Check for achievements using centralized service
      achievementService.checkAchievements();

      // Provide haptic feedback if enabled
      this.triggerHapticFeedback();

      return {
        produced: actualProduction,
        comboMultiplier,
        totalMultiplier,
        comboCount: this.clickCombo.count
      };

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to produce matchsticks', { 
        error, 
        clickCount 
      }));
      
      // Fallback: produce at least 1 matchstick
      const fallbackProduction = BigInt(clickCount);
      gameActions.addResources({ matchsticks: fallbackProduction });
      
      return {
        produced: fallbackProduction,
        comboMultiplier: 1,
        totalMultiplier: 1,
        comboCount: 0
      };
    }
  }

  /**
   * Get current production rate per click
   */
  getCurrentProductionRate(): number {
    try {
      const currentState = get(gameState);
      const baseRate = currentState.production.manualRate;
      const totalMultiplier = this.calculateTotalMultiplier(this.clickCombo.multiplier);
      
      return baseRate * totalMultiplier;
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to calculate production rate', { error }));
      return 1;
    }
  }

  /**
   * Get current combo information
   */
  getComboInfo(): {
    count: number;
    multiplier: number;
    timeRemaining: number;
    maxCombo: number;
  } {
    const now = Date.now();
    const timeSinceLastClick = now - this.lastClickTime;
    const comboDecayTime = 2000; // 2 seconds to maintain combo
    
    const timeRemaining = Math.max(0, comboDecayTime - timeSinceLastClick);
    
    return {
      count: this.clickCombo.count,
      multiplier: this.clickCombo.multiplier,
      timeRemaining,
      maxCombo: this.clickCombo.maxCombo
    };
  }

  /**
   * Get production statistics
   */
  getProductionStats(): ProductionStats {
    this.updateAverageClickRate();
    return { ...this.productionStats };
  }

  /**
   * Reset production statistics
   */
  resetStats(): void {
    this.productionStats = {
      totalClicks: this.productionStats.totalClicks, // Keep lifetime stats
      totalProduced: this.productionStats.totalProduced,
      averageClickRate: 0,
      maxCombo: this.productionStats.maxCombo,
      sessionProduction: 0n,
      sessionClicks: 0,
      sessionStartTime: Date.now()
    };
    
    this.recentClicks = [];
    this.resetCombo();
  }

  /**
   * Reset click combo
   */
  resetCombo(): void {
    this.clickCombo = {
      count: 0,
      startTime: 0,
      multiplier: 1,
      maxCombo: this.clickCombo.maxCombo,
      decayRate: this.clickCombo.decayRate
    };
  }

  /**
   * Apply temporary production multiplier
   */
  applyTemporaryMultiplier(multiplier: number, duration: number): void {
    try {
      const currentState = get(gameState);
      const tempMultiplier: ProductionMultiplier = {
        id: `temp_${Date.now()}`,
        name: 'Temporary Boost',
        multiplier,
        duration,
        startTime: Date.now(),
        source: 'temporary'
      };

      // Add to current multipliers
      const updatedMultipliers = { ...currentState.production.multipliers };
      updatedMultipliers[tempMultiplier.id] = multiplier;

      gameActions.updateProduction({ multipliers: updatedMultipliers });

      // Set timer to remove multiplier
      setTimeout(() => {
        this.removeMultiplier(tempMultiplier.id);
      }, duration);

      gameActions.emitEvent({
        id: `multiplier_${Date.now()}`,
        type: 'multiplier_applied',
        timestamp: Date.now(),
        data: { multiplier, duration, name: `Temporary Boost ${multiplier}x` },
        source: 'production_service'
      });

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to apply multiplier', { 
        error, 
        multiplier, 
        duration 
      }));
    }
  }

  /**
   * Remove a production multiplier
   */
  removeMultiplier(multiplierId: string): void {
    try {
      const currentState = get(gameState);
      const updatedMultipliers = { ...currentState.production.multipliers };
      delete updatedMultipliers[multiplierId];

      gameActions.updateProduction({ multipliers: updatedMultipliers });
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to remove multiplier', { 
        error, 
        multiplierId 
      }));
    }
  }

  /**
   * Private methods
   */
  private updateClickStats(clickCount: number, currentTime: number): void {
    this.productionStats.totalClicks += clickCount;
    this.productionStats.sessionClicks += clickCount;
    this.lastClickTime = currentTime;

    // Track recent clicks for rate calculation (last 10 seconds)
    this.recentClicks.push(currentTime);
    const tenSecondsAgo = currentTime - 10000;
    this.recentClicks = this.recentClicks.filter(time => time > tenSecondsAgo);
  }

  private updateClickCombo(currentTime: number): number {
    const timeSinceLastClick = currentTime - this.lastClickTime;
    const comboDecayTime = 2000; // 2 seconds to maintain combo

    if (timeSinceLastClick > comboDecayTime) {
      // Combo expired, reset
      this.clickCombo.count = 1;
      this.clickCombo.startTime = currentTime;
      this.clickCombo.multiplier = 1;
    } else {
      // Continue combo
      this.clickCombo.count = Math.min(this.clickCombo.count + 1, this.clickCombo.maxCombo);
      
      // Calculate combo multiplier (1% increase per combo, max 50%)
      this.clickCombo.multiplier = 1 + (this.clickCombo.count - 1) * 0.01;
    }

    // Update max combo stat
    this.productionStats.maxCombo = Math.max(
      this.productionStats.maxCombo, 
      this.clickCombo.count
    );

    return this.clickCombo.multiplier;
  }

  private calculateTotalMultiplier(comboMultiplier: number): number {
    try {
      const currentState = get(gameState);
      
      // Get base multipliers from game state
      let totalMultiplier = comboMultiplier;
      
      // Apply permanent multipliers
      const multipliers = currentState.production.multipliers;
      for (const [id, multiplier] of Object.entries(multipliers)) {
        if (typeof multiplier === 'number' && multiplier > 0) {
          totalMultiplier *= multiplier;
        }
      }

      return totalMultiplier;
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to calculate total multiplier', { error }));
      return comboMultiplier;
    }
  }

  private updateAverageClickRate(): void {
    const currentTime = Date.now();
    const recentClickCount = this.recentClicks.length;
    const timeWindow = Math.min(10000, currentTime - this.productionStats.sessionStartTime);
    
    if (timeWindow > 0) {
      this.productionStats.averageClickRate = (recentClickCount / timeWindow) * 1000;
    }
  }



  private triggerHapticFeedback(): void {
    try {
      const currentState = get(gameState);
      
      if (currentState.settings.hapticEnabled && 'vibrate' in navigator) {
        // Short vibration for each click
        navigator.vibrate(10);
      }
    } catch (error) {
      // Silent fail for haptic feedback
      console.debug('Haptic feedback not available:', error);
    }
  }
}

// Export singleton instance
export const productionService = ProductionService.getInstance(); 
