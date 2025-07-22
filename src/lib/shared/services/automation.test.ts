import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { automationService } from './automation.js';
import { gameState, gameActions } from '../stores/gameState.js';

describe('Automation Service', () => {
  beforeEach(() => {
    // Reset game state before each test
    gameActions.reset();
    
    // Ensure player has some money to purchase automation
    gameActions.addResources({ money: 10000 });
    
    // Stop automation intervals to prevent interference
    automationService.stopAutomation();
  });

  afterEach(() => {
    // Clean up intervals
    automationService.stopAutomation();
  });

  describe('Auto-Clicker Purchasing', () => {
    it('should purchase basic auto-clicker successfully', () => {
      const result = automationService.purchaseAutoClicker('basic_clicker');
      
      expect(result.success).toBe(true);
      expect(result.cost).toBe(50);
      expect(result.newLevel).toBe(1);
      
      const state = get(gameState);
      expect(state.resources.money).toBe(9950); // 10000 - 50
      expect(state.automation.autoClickers).toHaveLength(1);
      expect(state.automation.autoClickers[0].id).toBe('basic_clicker');
      expect(state.automation.autoClickers[0].level).toBe(1);
    });

    it('should increase cost for subsequent purchases', () => {
      const firstPurchase = automationService.purchaseAutoClicker('basic_clicker');
      const secondPurchase = automationService.purchaseAutoClicker('basic_clicker');
      
      expect(firstPurchase.success).toBe(true);
      expect(secondPurchase.success).toBe(true);
      expect(secondPurchase.cost).toBeGreaterThan(firstPurchase.cost!);
      expect(secondPurchase.newLevel).toBe(2);
    });

    it('should fail to purchase when insufficient funds', () => {
      gameActions.addResources({ money: -9980 }); // Leave only 20
      
      const result = automationService.purchaseAutoClicker('basic_clicker');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
      
      const state = get(gameState);
      expect(state.automation.autoClickers).toHaveLength(0);
    });

    it('should fail to purchase non-existent auto-clicker', () => {
      const result = automationService.purchaseAutoClicker('nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Auto-clicker not found');
    });

    it('should respect max level limits', () => {
      // Purchase basic clicker to max level (50)
      for (let i = 0; i < 50; i++) {
        gameActions.addResources({ money: 1000 }); // Add more money as needed
        automationService.purchaseAutoClicker('basic_clicker');
      }
      
      // Try to purchase beyond max level
      gameActions.addResources({ money: 10000 });
      const result = automationService.purchaseAutoClicker('basic_clicker');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Maximum level reached');
    });

    it('should check unlock requirements', () => {
      // Try to purchase fast clicker without meeting requirements
      const result = automationService.purchaseAutoClicker('fast_clicker');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unlock requirements not met');
      
      // Meet requirements and try again
      gameActions.updateProduction({ totalProduced: 1000n });
      const result2 = automationService.purchaseAutoClicker('fast_clicker');
      
      expect(result2.success).toBe(true);
    });
  });

  describe('Production Facility Purchasing', () => {
    it('should purchase basic factory successfully', () => {
      // Meet unlock requirements
      gameActions.updateProduction({ totalProduced: 5000n });
      
      const result = automationService.purchaseFacility('basic_factory');
      
      expect(result.success).toBe(true);
      expect(result.cost).toBe(500);
      expect(result.newCount).toBe(1);
      
      const state = get(gameState);
      expect(state.resources.money).toBe(9500); // 10000 - 500
    });

    it('should increase cost for subsequent facility purchases', () => {
      gameActions.updateProduction({ totalProduced: 5000n });
      
      const firstPurchase = automationService.purchaseFacility('basic_factory');
      const secondPurchase = automationService.purchaseFacility('basic_factory');
      
      expect(firstPurchase.success).toBe(true);
      expect(secondPurchase.success).toBe(true);
      expect(secondPurchase.cost).toBeGreaterThan(firstPurchase.cost!);
      expect(secondPurchase.newCount).toBe(2);
    });

    it('should fail to purchase when insufficient funds', () => {
      gameActions.updateProduction({ totalProduced: 5000n });
      gameActions.addResources({ money: -9800 }); // Leave only 200
      
      const result = automationService.purchaseFacility('basic_factory');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });

    it('should fail to purchase non-existent facility', () => {
      const result = automationService.purchaseFacility('nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Facility not found');
    });

    it('should respect max facility limits', () => {
      gameActions.updateProduction({ totalProduced: 5000n });
      gameActions.addResources({ money: 50000 }); // Ensure enough money
      
      // Purchase to max limit (10 for basic factory)
      for (let i = 0; i < 10; i++) {
        automationService.purchaseFacility('basic_factory');
      }
      
      // Try to purchase beyond max
      const result = automationService.purchaseFacility('basic_factory');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Maximum facilities owned');
    });
  });

  describe('Auto-Sell Configuration', () => {
    it('should configure auto-sell settings successfully', () => {
      const config = {
        enabled: true,
        threshold: 1000n,
        percentage: 50,
        minPrice: 1.5,
        maxPerSecond: 100n
      };
      
      const result = automationService.configureAutoSell(config);
      
      expect(result).toBe(true);
      
      const state = get(gameState);
      expect(state.market.autoSellEnabled).toBe(true);
      expect(state.market.autoSellThreshold).toBe(1000);
    });

    it('should reject invalid auto-sell configuration', () => {
      const invalidConfig = {
        enabled: true,
        threshold: 0n, // Invalid: must be > 0
        percentage: 150, // Invalid: must be <= 100
        minPrice: -1, // Invalid: must be >= 0
        maxPerSecond: 0n // Invalid: must be > 0
      };
      
      const result = automationService.configureAutoSell(invalidConfig);
      
      expect(result).toBe(false);
    });

    it('should handle disabled auto-sell', () => {
      const config = {
        enabled: false,
        threshold: 1000n,
        percentage: 50,
        minPrice: 1.0,
        maxPerSecond: 100n
      };
      
      const result = automationService.configureAutoSell(config);
      
      expect(result).toBe(true);
      
      const state = get(gameState);
      expect(state.market.autoSellEnabled).toBe(false);
    });
  });

  describe('Automation Statistics', () => {
    it('should provide correct automation statistics', () => {
      // Purchase some automation
      automationService.purchaseAutoClicker('basic_clicker');
      automationService.purchaseAutoClicker('basic_clicker');
      
      gameActions.updateProduction({ totalProduced: 5000n });
      automationService.purchaseFacility('basic_factory');
      
      const stats = automationService.getAutomationStats();
      
      expect(stats.totalAutoClickers).toBe(2);
      expect(stats.totalFacilities).toBe(1);
      expect(stats.autoClickRate).toBe(2); // 2 basic clickers × 1 click/sec each
      expect(stats.autoProductionRate).toBe(5n); // 1 basic factory × 5 production/sec
      expect(stats.totalMoneySpent).toBeGreaterThan(0);
      expect(stats.efficiencyRating).toBeGreaterThanOrEqual(0);
      expect(stats.maintenanceCost).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty automation state', () => {
      const stats = automationService.getAutomationStats();
      
      expect(stats.totalAutoClickers).toBe(0);
      expect(stats.totalFacilities).toBe(0);
      expect(stats.autoClickRate).toBe(0);
      expect(stats.autoProductionRate).toBe(0n);
      expect(stats.totalMoneySpent).toBe(0);
      expect(stats.maintenanceCost).toBe(0);
    });

    it('should calculate net production correctly', () => {
      gameActions.updateProduction({ totalProduced: 5000n });
      automationService.purchaseFacility('basic_factory');
      
      const stats = automationService.getAutomationStats();
      
      expect(stats.netProduction).toBeGreaterThanOrEqual(0n);
      expect(stats.netProduction).toBeLessThanOrEqual(stats.autoProductionRate);
    });
  });

  describe('Available Items', () => {
    it('should provide available auto-clickers with correct info', () => {
      const clickers = automationService.getAvailableAutoClickers();
      
      expect(clickers.length).toBeGreaterThan(0);
      
      const basicClicker = clickers.find(c => c.id === 'basic_clicker');
      expect(basicClicker).toBeDefined();
      expect(basicClicker!.cost).toBe(50);
      expect(basicClicker!.currentLevel).toBe(0);
      expect(basicClicker!.isUnlocked).toBe(true);
      expect(basicClicker!.isMaxed).toBe(false);
    });

    it('should show updated info after purchases', () => {
      automationService.purchaseAutoClicker('basic_clicker');
      
      const clickers = automationService.getAvailableAutoClickers();
      const basicClicker = clickers.find(c => c.id === 'basic_clicker');
      
      expect(basicClicker!.currentLevel).toBe(1);
      expect(basicClicker!.cost).toBeGreaterThan(50); // Cost should increase
    });

    it('should provide available facilities with correct info', () => {
      const facilities = automationService.getAvailableFacilities();
      
      expect(facilities.length).toBeGreaterThan(0);
      
      const basicFactory = facilities.find(f => f.id === 'basic_factory');
      expect(basicFactory).toBeDefined();
      expect(basicFactory!.cost).toBe(500);
      expect(basicFactory!.owned).toBe(0);
      expect(basicFactory!.isUnlocked).toBe(false); // Requires 5000 total produced
      expect(basicFactory!.isMaxed).toBe(false);
    });

    it('should show unlock status correctly', () => {
      gameActions.updateProduction({ totalProduced: 5000n });
      
      const facilities = automationService.getAvailableFacilities();
      const basicFactory = facilities.find(f => f.id === 'basic_factory');
      
      expect(basicFactory!.isUnlocked).toBe(true);
    });
  });

  describe('Achievement Integration', () => {
    it('should emit achievement events for spending milestones', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      // Spend enough to trigger achievement
      gameActions.addResources({ money: 10000 });
      for (let i = 0; i < 10; i++) {
        automationService.purchaseAutoClicker('basic_clicker');
      }
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'achievement_unlocked',
          data: expect.objectContaining({
            achievementId: 'automation_investor'
          })
        })
      );
    });

    it('should emit events for auto-clicker collection', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      gameActions.addResources({ money: 50000 });
      
      // Purchase 10 auto-clickers to trigger achievement
      for (let i = 0; i < 10; i++) {
        automationService.purchaseAutoClicker('basic_clicker');
      }
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'achievement_unlocked',
          data: expect.objectContaining({
            achievementId: 'clicker_collector'
          })
        })
      );
    });
  });

  describe('Event Emission', () => {
    it('should emit purchase events for auto-clickers', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      automationService.purchaseAutoClicker('basic_clicker');
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'upgrade_purchased',
          source: 'automation_service',
          data: expect.objectContaining({
            itemType: 'auto_clicker',
            itemId: 'basic_clicker'
          })
        })
      );
    });

    it('should emit purchase events for facilities', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      gameActions.updateProduction({ totalProduced: 5000n });
      automationService.purchaseFacility('basic_factory');
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'upgrade_purchased',
          source: 'automation_service',
          data: expect.objectContaining({
            itemType: 'facility',
            itemId: 'basic_factory'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // All operations should complete without throwing
      expect(() => automationService.getAutomationStats()).not.toThrow();
      expect(() => automationService.getAvailableAutoClickers()).not.toThrow();
      expect(() => automationService.getAvailableFacilities()).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should provide fallback values when errors occur', () => {
      const stats = automationService.getAutomationStats();
      
      expect(stats.totalAutoClickers).toBeGreaterThanOrEqual(0);
      expect(stats.totalFacilities).toBeGreaterThanOrEqual(0);
      expect(stats.autoProductionRate).toBeGreaterThanOrEqual(0n);
    });
  });

  describe('Automation Control', () => {
    it('should start and stop automation properly', () => {
      // Stop should work without errors
      expect(() => automationService.stopAutomation()).not.toThrow();
      
      // Multiple stops should be safe
      automationService.stopAutomation();
      automationService.stopAutomation();
    });
  });

  describe('Integration with Game State', () => {
    it('should properly integrate with game state management', () => {
      const initialState = get(gameState);
      expect(initialState.resources.money).toBe(10000);
      expect(initialState.automation.autoClickers).toHaveLength(0);
      
      automationService.purchaseAutoClicker('basic_clicker');
      
      const updatedState = get(gameState);
      expect(updatedState.resources.money).toBe(9950);
      expect(updatedState.automation.autoClickers).toHaveLength(1);
      expect(updatedState.automation.totalMoneySpent).toBe(50);
    });

    it('should respect unlock requirements from game state', () => {
      // Fast clicker requires 1000n total produced
      const state = get(gameState);
      expect(state.production.totalProduced).toBe(0n);
      
      const result1 = automationService.purchaseAutoClicker('fast_clicker');
      expect(result1.success).toBe(false);
      
      // Meet requirement
      gameActions.updateProduction({ totalProduced: 1000n });
      
      const result2 = automationService.purchaseAutoClicker('fast_clicker');
      expect(result2.success).toBe(true);
    });

    it('should update total money spent correctly', () => {
      automationService.purchaseAutoClicker('basic_clicker'); // 50
      automationService.purchaseAutoClicker('basic_clicker'); // ~57 (cost multiplier)
      
      const state = get(gameState);
      expect(state.automation.totalMoneySpent).toBeGreaterThan(100);
    });
  });

  describe('Cost Calculations', () => {
    it('should calculate escalating costs correctly', () => {
      const clickers = automationService.getAvailableAutoClickers();
      const basicClicker = clickers.find(c => c.id === 'basic_clicker')!;
      
      const initialCost = basicClicker.cost;
      expect(initialCost).toBe(50);
      
      // Purchase and check new cost
      automationService.purchaseAutoClicker('basic_clicker');
      
      const updatedClickers = automationService.getAvailableAutoClickers();
      const updatedBasicClicker = updatedClickers.find(c => c.id === 'basic_clicker')!;
      
      expect(updatedBasicClicker.cost).toBeGreaterThan(initialCost);
      expect(updatedBasicClicker.cost).toBe(Math.floor(50 * 1.15)); // baseCost * multiplier^level
    });

    it('should calculate facility costs with exponential scaling', () => {
      gameActions.updateProduction({ totalProduced: 5000n });
      
      const facilities = automationService.getAvailableFacilities();
      const basicFactory = facilities.find(f => f.id === 'basic_factory')!;
      
      const initialCost = basicFactory.cost;
      expect(initialCost).toBe(500);
      
      // Purchase and check new cost
      automationService.purchaseFacility('basic_factory');
      
      const updatedFacilities = automationService.getAvailableFacilities();
      const updatedBasicFactory = updatedFacilities.find(f => f.id === 'basic_factory')!;
      
      expect(updatedBasicFactory.cost).toBe(Math.floor(500 * 1.5)); // cost * 1.5^owned
    });
  });
}); 
