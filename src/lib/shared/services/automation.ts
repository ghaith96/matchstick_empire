import { get } from 'svelte/store';
import { gameState, gameActions } from '../stores/gameState.js';
import type { AutoClicker, AutoSellSettings, Upgrade, UpgradeEffect } from '../types/index.js';
import { SafeBigInt } from '../utils/numbers.js';
import { createError, errorHandler } from '../utils/errors.js';
import { achievementService } from './achievements.js';

/**
 * Auto-clicker configuration and state
 */
export interface AutoClickerConfig {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costMultiplier: number; // Cost increase per purchase
  baseClicksPerSecond: number;
  maxLevel: number;
  unlockRequirement?: {
    totalProduced?: bigint;
    totalRevenue?: number;
    gamePhase?: string;
  };
}

/**
 * Production facility for automated matchstick creation
 */
export interface ProductionFacility {
  id: string;
  name: string;
  description: string;
  cost: number;
  baseProduction: bigint; // matchsticks per second
  owned: number;
  maxOwned: number;
  efficiency: number; // 0-1, can be upgraded
  maintenanceCost: number; // per second
  unlockRequirement?: {
    totalProduced?: bigint;
    autoClickersOwned?: number;
    gamePhase?: string;
  };
}

/**
 * Automation statistics
 */
export interface AutomationStats {
  totalAutoClickers: number;
  totalFacilities: number;
  autoProductionRate: bigint; // per second
  autoClickRate: number; // per second
  totalMoneySpent: number;
  efficiencyRating: number; // 0-100
  maintenanceCost: number; // per second
  netProduction: bigint; // production minus maintenance costs
}

/**
 * Auto-sell configuration
 */
export interface AutoSellConfig {
  enabled: boolean;
  threshold: bigint; // sell when matchsticks exceed this
  percentage: number; // 0-100, percentage to sell
  minPrice: number; // only sell if price >= this
  maxPerSecond: bigint; // rate limit
}

/**
 * Automation service for managing auto-clickers and production facilities
 */
export class AutomationService {
  private static instance: AutomationService;
  private autoClickInterval: number | null = null;
  private autoProductionInterval: number | null = null;
  private autoSellInterval: number | null = null;
  private maintenanceInterval: number | null = null;
  
  // Timing configuration
  private readonly autoClickFrequency = 1000; // 1 second
  private readonly autoProductionFrequency = 1000; // 1 second
  private readonly autoSellFrequency = 2000; // 2 seconds
  private readonly maintenanceFrequency = 5000; // 5 seconds

  // Auto-clicker configurations
  private readonly autoClickerConfigs: AutoClickerConfig[] = [
    {
      id: 'basic_clicker',
      name: 'Basic Auto-Clicker',
      description: 'Automatically clicks once per second',
      baseCost: 50,
      costMultiplier: 1.15,
      baseClicksPerSecond: 1,
      maxLevel: 50
    },
    {
      id: 'fast_clicker',
      name: 'Fast Auto-Clicker',
      description: 'Clicks 3 times per second with improved efficiency',
      baseCost: 250,
      costMultiplier: 1.2,
      baseClicksPerSecond: 3,
      maxLevel: 25,
      unlockRequirement: {
        totalProduced: 1000n
      }
    },
    {
      id: 'turbo_clicker',
      name: 'Turbo Auto-Clicker',
      description: 'High-speed clicking with 8 clicks per second',
      baseCost: 1000,
      costMultiplier: 1.25,
      baseClicksPerSecond: 8,
      maxLevel: 10,
      unlockRequirement: {
        totalProduced: 10000n,
        totalRevenue: 1000
      }
    },
    {
      id: 'quantum_clicker',
      name: 'Quantum Auto-Clicker',
      description: 'Theoretical physics-powered clicking at 20/second',
      baseCost: 5000,
      costMultiplier: 1.3,
      baseClicksPerSecond: 20,
      maxLevel: 5,
      unlockRequirement: {
        totalProduced: 100000n,
        totalRevenue: 10000
      }
    }
  ];

  // Production facility configurations
  private readonly facilityConfigs: ProductionFacility[] = [
    {
      id: 'basic_factory',
      name: 'Basic Matchstick Factory',
      description: 'Produces 5 matchsticks per second automatically',
      cost: 500,
      baseProduction: 5n,
      owned: 0,
      maxOwned: 10,
      efficiency: 1.0,
      maintenanceCost: 2,
      unlockRequirement: {
        totalProduced: 5000n
      }
    },
    {
      id: 'advanced_factory',
      name: 'Advanced Production Line',
      description: 'High-efficiency production of 25 matchsticks/second',
      cost: 2500,
      baseProduction: 25n,
      owned: 0,
      maxOwned: 5,
      efficiency: 1.0,
      maintenanceCost: 8,
      unlockRequirement: {
        totalProduced: 50000n,
        autoClickersOwned: 5
      }
    },
    {
      id: 'mega_plant',
      name: 'Mega Production Plant',
      description: 'Industrial-scale production at 100 matchsticks/second',
      cost: 15000,
      baseProduction: 100n,
      owned: 0,
      maxOwned: 2,
      efficiency: 1.0,
      maintenanceCost: 30,
      unlockRequirement: {
        type: 'resource',
        condition: 'totalProduced',
        value: 500000n,
        description: 'Requires 500,000 total production'
      }
    }
  ];

  private constructor() {
    this.startAutomation();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AutomationService {
    if (!AutomationService.instance) {
      AutomationService.instance = new AutomationService();
    }
    return AutomationService.instance;
  }

  /**
   * Purchase an auto-clicker
   */
  purchaseAutoClicker(clickerId: string): {
    success: boolean;
    cost?: number;
    newLevel?: number;
    error?: string;
  } {
    try {
      const config = this.autoClickerConfigs.find(c => c.id === clickerId);
      if (!config) {
        return { success: false, error: 'Auto-clicker not found' };
      }

      const currentState = get(gameState);
      const existingClicker = currentState.automation.autoClickers.find(c => c.id === clickerId);
      const currentLevel = existingClicker?.level || 0;

      // Check if max level reached
      if (currentLevel >= config.maxLevel) {
        return { success: false, error: 'Maximum level reached' };
      }

      // Check unlock requirements
      if (!this.checkUnlockRequirement(config.unlockRequirement, currentState)) {
        return { success: false, error: 'Unlock requirements not met' };
      }

      // Calculate cost
      const cost = this.calculateAutoClickerCost(config, currentLevel);

      // Check if player has enough money
      if (currentState.resources.money < cost) {
        return { success: false, error: 'Insufficient funds' };
      }

      // Deduct cost
      gameActions.addResources({ money: -cost });

      // Update or create auto-clicker
      const newLevel = currentLevel + 1;
      const updatedClickers = [...currentState.automation.autoClickers];
      
      if (existingClicker) {
        const index = updatedClickers.findIndex(c => c.id === clickerId);
        updatedClickers[index] = {
          ...existingClicker,
          level: newLevel
        };
      } else {
        updatedClickers.push({
          id: clickerId,
          level: newLevel,
          isActive: true,
          totalClicks: 0n,
          efficiency: 1.0
        });
      }

      gameActions.updateAutomation({ autoClickers: updatedClickers });

      // Update total money spent
      const currentSpent = currentState.automation.totalMoneySpent || 0;
      const newTotalSpent = currentSpent + cost;
      gameActions.updateAutomation({ totalMoneySpent: newTotalSpent });

      // Emit purchase event
      gameActions.emitEvent({
        id: `autoclicker_purchase_${Date.now()}`,
        type: 'upgrade_purchased',
        timestamp: Date.now(),
        data: {
          itemType: 'auto_clicker',
          itemId: clickerId,
          cost,
          newLevel,
          totalSpent: newTotalSpent
        },
        source: 'automation_service'
      });

      // Check for achievements using centralized service
      achievementService.checkAchievements();

      return { success: true, cost, newLevel };

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to purchase auto-clicker', { 
        error, 
        clickerId 
      }));
      return { success: false, error: 'Purchase failed' };
    }
  }

  /**
   * Purchase a production facility
   */
  purchaseFacility(facilityId: string): {
    success: boolean;
    cost?: number;
    newCount?: number;
    error?: string;
  } {
    try {
      const config = this.facilityConfigs.find(f => f.id === facilityId);
      if (!config) {
        return { success: false, error: 'Facility not found' };
      }

      const currentState = get(gameState);
      const currentCount = config.owned;

      // Check if max owned reached
      if (currentCount >= config.maxOwned) {
        return { success: false, error: 'Maximum facilities owned' };
      }

      // Check unlock requirements
      if (!this.checkUnlockRequirement(config.unlockRequirement, currentState)) {
        return { success: false, error: 'Unlock requirements not met' };
      }

      // Calculate cost (increases with each purchase)
      const cost = Math.floor(config.cost * Math.pow(1.5, currentCount));

      // Check if player has enough money
      if (currentState.resources.money < cost) {
        return { success: false, error: 'Insufficient funds' };
      }

      // Deduct cost
      gameActions.addResources({ money: -cost });

      // Update facility count
      const facilityIndex = this.facilityConfigs.findIndex(f => f.id === facilityId);
      this.facilityConfigs[facilityIndex].owned = currentCount + 1;

      // Update total money spent
      const newTotalSpent = currentState.automation.totalMoneySpent + cost;
      gameActions.updateAutomation({ totalMoneySpent: newTotalSpent });

      // Emit purchase event
      gameActions.emitEvent({
        id: `facility_purchase_${Date.now()}`,
        type: 'upgrade_purchased',
        timestamp: Date.now(),
        data: {
          itemType: 'facility',
          itemId: facilityId,
          cost,
          newCount: currentCount + 1,
          totalSpent: newTotalSpent
        },
        source: 'automation_service'
      });

      // Check for achievements using centralized service
      achievementService.checkAchievements();

      return { success: true, cost, newCount: currentCount + 1 };

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to purchase facility', { 
        error, 
        facilityId 
      }));
      return { success: false, error: 'Purchase failed' };
    }
  }

  /**
   * Configure auto-sell settings
   */
  configureAutoSell(config: AutoSellConfig): boolean {
    try {
      // Validate configuration
      if (config.threshold <= 0n || config.percentage <= 0 || config.percentage > 100) {
        return false;
      }

      if (config.minPrice < 0 || config.maxPerSecond <= 0n) {
        return false;
      }

      const currentState = get(gameState);
      gameActions.updateMarket({
        autoSellEnabled: config.enabled,
        autoSellThreshold: Number(config.threshold)
      });

      // Store additional auto-sell config in automation state
      gameActions.updateAutomation({
        autoSellSettings: {
          threshold: config.threshold,
          percentage: config.percentage,
          minPrice: config.minPrice,
          maxPerSecond: config.maxPerSecond,
          enabled: config.enabled
        }
      });

      return true;

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to configure auto-sell', { error }));
      return false;
    }
  }

  /**
   * Get automation statistics
   */
  getAutomationStats(): AutomationStats {
    try {
      const currentState = get(gameState);
      
      // Calculate total auto-clickers
      const totalAutoClickers = currentState.automation.autoClickers.reduce(
        (sum, clicker) => sum + clicker.level, 0
      );

      // Calculate total facilities
      const totalFacilities = this.facilityConfigs.reduce(
        (sum, facility) => sum + facility.owned, 0
      );

      // Calculate auto production rate
      const autoProductionRate = this.facilityConfigs.reduce(
        (sum, facility) => SafeBigInt.add(sum, 
          SafeBigInt.multiply(facility.baseProduction, BigInt(facility.owned))), 0n
      );

      // Calculate auto click rate
      const autoClickRate = currentState.automation.autoClickers.reduce(
        (sum, clicker) => {
          const config = this.autoClickerConfigs.find(c => c.id === clicker.id);
          return sum + (config ? config.baseClicksPerSecond * clicker.level : 0);
        }, 0
      );

      // Calculate maintenance cost
      const maintenanceCost = this.facilityConfigs.reduce(
        (sum, facility) => sum + (facility.maintenanceCost * facility.owned), 0
      );

      // Calculate efficiency rating
      const efficiencyRating = this.calculateEfficiencyRating(totalAutoClickers, totalFacilities);

      // Calculate net production (considering maintenance costs as matchstick equivalent)
      const maintenanceMatchsticks = BigInt(Math.floor(maintenanceCost * 0.5)); // rough conversion
      const netProduction = SafeBigInt.subtract(autoProductionRate, maintenanceMatchsticks);

      return {
        totalAutoClickers,
        totalFacilities,
        autoProductionRate,
        autoClickRate,
        totalMoneySpent: currentState.automation.totalMoneySpent,
        efficiencyRating,
        maintenanceCost,
        netProduction: netProduction > 0n ? netProduction : 0n
      };

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to get automation stats', { error }));
      
      // Fallback stats
      return {
        totalAutoClickers: 0,
        totalFacilities: 0,
        autoProductionRate: 0n,
        autoClickRate: 0,
        totalMoneySpent: 0,
        efficiencyRating: 0,
        maintenanceCost: 0,
        netProduction: 0n
      };
    }
  }

  /**
   * Get available auto-clickers with costs and unlock status
   */
  getAvailableAutoClickers(): Array<AutoClickerConfig & { 
    cost: number; 
    currentLevel: number; 
    isUnlocked: boolean; 
    isMaxed: boolean;
  }> {
    try {
      const currentState = get(gameState);
      
      return this.autoClickerConfigs.map(config => {
        const existingClicker = currentState.automation.autoClickers.find(c => c.id === config.id);
        const currentLevel = existingClicker?.level || 0;
        const cost = this.calculateAutoClickerCost(config, currentLevel);
        const isUnlocked = this.checkUnlockRequirement(config.unlockRequirement, currentState);
        const isMaxed = currentLevel >= config.maxLevel;

        return {
          ...config,
          cost,
          currentLevel,
          isUnlocked,
          isMaxed
        };
      });

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to get available auto-clickers', { error }));
      return [];
    }
  }

  /**
   * Get available production facilities
   */
  getAvailableFacilities(): Array<ProductionFacility & { 
    cost: number; 
    isUnlocked: boolean; 
    isMaxed: boolean;
  }> {
    try {
      const currentState = get(gameState);
      
      return this.facilityConfigs.map(config => {
        const cost = Math.floor(config.cost * Math.pow(1.5, config.owned));
        const isUnlocked = this.checkUnlockRequirement(config.unlockRequirement, currentState);
        const isMaxed = config.owned >= config.maxOwned;

        return {
          ...config,
          cost,
          isUnlocked,
          isMaxed
        };
      });

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to get available facilities', { error }));
      return [];
    }
  }

  /**
   * Stop all automation
   */
  stopAutomation(): void {
    if (this.autoClickInterval) {
      clearInterval(this.autoClickInterval);
      this.autoClickInterval = null;
    }
    if (this.autoProductionInterval) {
      clearInterval(this.autoProductionInterval);
      this.autoProductionInterval = null;
    }
    if (this.autoSellInterval) {
      clearInterval(this.autoSellInterval);
      this.autoSellInterval = null;
    }
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }
  }

  /**
   * Private methods
   */
  private startAutomation(): void {
    // Start auto-clicking
    this.autoClickInterval = setInterval(() => {
      this.processAutoClickers();
    }, this.autoClickFrequency) as any;

    // Start auto production
    this.autoProductionInterval = setInterval(() => {
      this.processAutoProduction();
    }, this.autoProductionFrequency) as any;

    // Start auto-sell checking
    this.autoSellInterval = setInterval(() => {
      this.processAutoSell();
    }, this.autoSellFrequency) as any;

    // Start maintenance processing
    this.maintenanceInterval = setInterval(() => {
      this.processMaintenance();
    }, this.maintenanceFrequency) as any;
  }

  private async processAutoClickers(): Promise<void> {
    try {
      const currentState = get(gameState);
      
      for (const clicker of currentState.automation.autoClickers) {
        if (!clicker.isActive) continue;

        const config = this.autoClickerConfigs.find(c => c.id === clicker.id);
        if (!config) continue;

        const clicksPerInterval = config.baseClicksPerSecond * (this.autoClickFrequency / 1000);
        const actualClicks = Math.floor(clicksPerInterval * clicker.level * clicker.efficiency);

        if (actualClicks > 0) {
          // Use production service to generate matchsticks
          const productionService = await import('./production.js');
          const result = productionService.productionService.produceMatchsticks(actualClicks);

          // Update clicker stats
          const updatedClickers = currentState.automation.autoClickers.map(c => 
            c.id === clicker.id 
              ? { ...c, totalClicks: SafeBigInt.add(c.totalClicks, BigInt(actualClicks)) }
              : c
          );

          gameActions.updateAutomation({ autoClickers: updatedClickers });
        }
      }

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Auto-clicker processing failed', { error }));
    }
  }

  private processAutoProduction(): void {
    try {
      const totalProduction = this.facilityConfigs.reduce(
        (sum, facility) => {
          const productionPerSecond = SafeBigInt.multiply(
            facility.baseProduction, 
            BigInt(facility.owned)
          );
          const productionPerInterval = SafeBigInt.divide(
            SafeBigInt.multiply(productionPerSecond, BigInt(this.autoProductionFrequency)),
            1000n
          );
          return SafeBigInt.add(sum, productionPerInterval);
        }, 0n
      );

      if (totalProduction > 0n) {
        gameActions.addResources({ matchsticks: totalProduction });
        
        // Update production statistics
        const currentState = get(gameState);
        gameActions.updateProduction({
          totalProduced: SafeBigInt.add(currentState.production.totalProduced, totalProduction)
        });
      }

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Auto production processing failed', { error }));
    }
  }

  private async processAutoSell(): Promise<void> {
    try {
      const currentState = get(gameState);
      const autoSellSettings = currentState.automation.autoSellSettings;

      if (!autoSellSettings?.enabled || !currentState.market.autoSellEnabled) {
        return;
      }

      const currentMatchsticks = currentState.resources.matchsticks;
      
      if (currentMatchsticks < autoSellSettings.threshold) {
        return;
      }

      // Check minimum price requirement
      if (currentState.market.currentPrice < autoSellSettings.minPrice) {
        return;
      }

      // Calculate amount to sell
      const amountToSell = SafeBigInt.divide(
        SafeBigInt.multiply(currentMatchsticks, BigInt(autoSellSettings.percentage)),
        100n
      );

      // Apply rate limit
      const limitedAmount = amountToSell > autoSellSettings.maxPerSecond 
        ? autoSellSettings.maxPerSecond 
        : amountToSell;

      if (limitedAmount > 0n) {
        // Use market service to sell
        const marketService = await import('./market.js');
        marketService.marketService.sellMatchsticks(limitedAmount);
      }

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Auto-sell processing failed', { error }));
    }
  }

  private processMaintenance(): void {
    try {
      const totalMaintenanceCost = this.facilityConfigs.reduce(
        (sum, facility) => sum + (facility.maintenanceCost * facility.owned), 0
      );

      if (totalMaintenanceCost > 0) {
        const maintenancePerInterval = totalMaintenanceCost * (this.maintenanceFrequency / 1000);
        
        const currentState = get(gameState);
        
        // Deduct maintenance costs from money
        if (currentState.resources.money >= maintenancePerInterval) {
          gameActions.addResources({ money: -maintenancePerInterval });
        } else {
          // Insufficient funds - reduce facility efficiency
          this.reduceFacilityEfficiency();
        }
      }

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Maintenance processing failed', { error }));
    }
  }

  private reduceFacilityEfficiency(): void {
    // Reduce efficiency of all facilities when maintenance can't be paid
    this.facilityConfigs.forEach(facility => {
      facility.efficiency = Math.max(0.1, facility.efficiency - 0.05); // Min 10% efficiency
    });

    gameActions.emitEvent({
      id: `maintenance_warning_${Date.now()}`,
      type: 'maintenance_required',
      timestamp: Date.now(),
      data: { message: 'Facility efficiency reduced due to unpaid maintenance' },
      source: 'automation_service'
    });
  }

  private calculateAutoClickerCost(config: AutoClickerConfig, currentLevel: number): number {
    return Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentLevel));
  }

  private checkUnlockRequirement(requirement: any, gameState: any): boolean {
    if (!requirement) return true;

    if (requirement.totalProduced && gameState.production.totalProduced < requirement.totalProduced) {
      return false;
    }

    if (requirement.totalRevenue && gameState.market.totalRevenue < requirement.totalRevenue) {
      return false;
    }

    if (requirement.autoClickersOwned) {
      const totalAutoClickers = gameState.automation.autoClickers.reduce(
        (sum: number, clicker: any) => sum + clicker.level, 0
      );
      if (totalAutoClickers < requirement.autoClickersOwned) {
        return false;
      }
    }

    if (requirement.gamePhase && gameState.progression.currentPhase !== requirement.gamePhase) {
      return false;
    }

    return true;
  }

  private calculateEfficiencyRating(autoClickers: number, facilities: number): number {
    // Simple efficiency calculation based on automation balance
    const baseEfficiency = Math.min(100, (autoClickers + facilities) * 5);
    const balanceBonus = Math.min(20, Math.abs(autoClickers - facilities * 2) < 5 ? 20 : 0);
    
    return Math.min(100, baseEfficiency + balanceBonus);
  }


}

// Export singleton instance
export const automationService = AutomationService.getInstance(); 
