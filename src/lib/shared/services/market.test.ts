import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { marketService } from './market.js';
import { gameState, gameActions } from '../stores/gameState.js';

describe('Market Service', () => {
  beforeEach(() => {
    // Reset game state before each test
    gameActions.reset();
    
    // Ensure player has some matchsticks to sell
    gameActions.addResources({ matchsticks: 1000n });
    
    // Stop intervals to prevent interference
    marketService.stopSimulation();
  });

  afterEach(() => {
    // Clean up intervals
    marketService.stopSimulation();
  });

  describe('Basic Trading', () => {
    it('should sell matchsticks successfully', () => {
      const result = marketService.sellMatchsticks(10n);
      
      expect(result.success).toBe(true);
      expect(result.revenue).toBeGreaterThan(0);
      expect(result.pricePerUnit).toBeGreaterThan(0);
      expect(result.marketShare).toBeGreaterThanOrEqual(0);
      
      const state = get(gameState);
      expect(state.resources.matchsticks).toBe(990n); // 1000 - 10
      expect(state.resources.money).toBe(result.revenue);
    });

    it('should fail to sell more matchsticks than available', () => {
      const result = marketService.sellMatchsticks(2000n); // More than 1000 available
      
      expect(result.success).toBe(false);
      expect(result.revenue).toBe(0);
      
      const state = get(gameState);
      expect(state.resources.matchsticks).toBe(1000n); // Unchanged
      expect(state.resources.money).toBe(0); // No money added
    });

    it('should fail to sell zero or negative amounts', () => {
      const result1 = marketService.sellMatchsticks(0n);
      const result2 = marketService.sellMatchsticks(-5n);
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      
      const state = get(gameState);
      expect(state.resources.matchsticks).toBe(1000n); // Unchanged
    });

    it('should update market statistics after sale', () => {
      marketService.sellMatchsticks(50n);
      
      const state = get(gameState);
      expect(state.market.totalSold).toBe(50n);
      expect(state.market.totalRevenue).toBeGreaterThan(0);
    });

    it('should accumulate sales across multiple transactions', () => {
      marketService.sellMatchsticks(30n);
      marketService.sellMatchsticks(20n);
      
      const state = get(gameState);
      expect(state.market.totalSold).toBe(50n);
      expect(state.resources.matchsticks).toBe(950n); // 1000 - 30 - 20
    });
  });

  describe('Price Management', () => {
    it('should provide current market price', () => {
      const price = marketService.getCurrentPrice();
      
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
    });

    it('should apply market impact for large sales', () => {
      // Large sale should have price impact
      const largeSaleResult = marketService.sellMatchsticks(500n);
      
      // Small sale for comparison
      gameActions.addResources({ matchsticks: 500n }); // Add back some for next sale
      const smallSaleResult = marketService.sellMatchsticks(10n);
      
      expect(largeSaleResult.success).toBe(true);
      expect(smallSaleResult.success).toBe(true);
      
      // Large sales typically get slightly worse prices due to market impact
      expect(largeSaleResult.pricePerUnit).toBeLessThanOrEqual(smallSaleResult.pricePerUnit * 1.1);
    });

    it('should handle price updates gracefully', () => {
      const initialPrice = marketService.getCurrentPrice();
      
      // Trigger some market activity
      marketService.sellMatchsticks(100n);
      
      const newPrice = marketService.getCurrentPrice();
      
      expect(typeof newPrice).toBe('number');
      expect(newPrice).toBeGreaterThan(0);
      
      // Price should be within reasonable bounds
      expect(newPrice).toBeGreaterThan(initialPrice * 0.5);
      expect(newPrice).toBeLessThan(initialPrice * 2);
    });
  });

  describe('Market Analysis', () => {
    it('should provide market analysis', () => {
      const analysis = marketService.getMarketAnalysis();
      
      expect(analysis).toBeDefined();
      expect(typeof analysis.currentPrice).toBe('number');
      expect(Array.isArray(analysis.priceHistory)).toBe(true);
      expect(['rising', 'falling', 'stable']).toContain(analysis.trend);
      expect(typeof analysis.volatility).toBe('number');
      expect(typeof analysis.resistance).toBe('number');
      expect(typeof analysis.support).toBe('number');
      expect(typeof analysis.marketCap).toBe('number');
      expect(typeof analysis.averageVolume).toBe('bigint');
      expect(['buy', 'sell', 'hold']).toContain(analysis.recommendation);
    });

    it('should cache market analysis for performance', () => {
      const analysis1 = marketService.getMarketAnalysis();
      const analysis2 = marketService.getMarketAnalysis();
      
      // Should be the same object when cached
      expect(analysis1).toBe(analysis2);
    });

    it('should handle empty price history gracefully', () => {
      // Fresh game state should handle empty history
      const analysis = marketService.getMarketAnalysis();
      
      expect(analysis.trend).toBe('stable');
      expect(analysis.volatility).toBe(0);
      expect(analysis.support).toBe(0);
      expect(analysis.resistance).toBe(0);
    });
  });

  describe('Trade History', () => {
    it('should track recent trades', () => {
      marketService.sellMatchsticks(25n);
      marketService.sellMatchsticks(15n);
      
      const trades = marketService.getRecentTrades();
      
      expect(trades).toHaveLength(2);
      expect(trades[0].matchsticksSold).toBe(15n); // Most recent first
      expect(trades[1].matchsticksSold).toBe(25n);
      
      // Verify trade structure
      const trade = trades[0];
      expect(trade.id).toBeDefined();
      expect(trade.timestamp).toBeGreaterThan(0);
      expect(trade.pricePerUnit).toBeGreaterThan(0);
      expect(trade.totalRevenue).toBeGreaterThan(0);
      expect(trade.marketCondition).toBeDefined();
      expect(trade.playerCash).toBeGreaterThan(0);
      expect(trade.marketShare).toBeGreaterThanOrEqual(0);
    });

    it('should limit trade history size', () => {
      // Add many trades
      for (let i = 0; i < 60; i++) {
        gameActions.addResources({ matchsticks: 1n });
        marketService.sellMatchsticks(1n);
      }
      
      const trades = marketService.getRecentTrades();
      
      // Should not exceed 50 trades
      expect(trades.length).toBeLessThanOrEqual(50);
    });

    it('should allow custom limit for trade history', () => {
      marketService.sellMatchsticks(10n);
      marketService.sellMatchsticks(20n);
      marketService.sellMatchsticks(30n);
      
      const limitedTrades = marketService.getRecentTrades(2);
      
      expect(limitedTrades).toHaveLength(2);
      expect(limitedTrades[0].matchsticksSold).toBe(30n);
      expect(limitedTrades[1].matchsticksSold).toBe(20n);
    });
  });

  describe('Market Conditions', () => {
    it('should provide available market conditions', () => {
      const conditions = marketService.getAvailableConditions();
      
      expect(Array.isArray(conditions)).toBe(true);
      expect(conditions.length).toBeGreaterThan(0);
      
      const condition = conditions[0];
      expect(condition.id).toBeDefined();
      expect(condition.name).toBeDefined();
      expect(condition.description).toBeDefined();
      expect(typeof condition.priceMultiplier).toBe('number');
      expect(['low', 'normal', 'high', 'peak']).toContain(condition.demandLevel);
      expect(typeof condition.duration).toBe('number');
      expect(typeof condition.probability).toBe('number');
      expect(Array.isArray(condition.triggers)).toBe(true);
    });

    it('should trigger specific market conditions', () => {
      const success = marketService.triggerMarketCondition('boom');
      
      expect(success).toBe(true);
      
      const state = get(gameState);
      expect(state.market.condition).toBeDefined();
      expect(state.market.condition?.description).toContain('Boom');
    });

    it('should fail to trigger non-existent conditions', () => {
      const success = marketService.triggerMarketCondition('nonexistent');
      
      expect(success).toBe(false);
      
      const state = get(gameState);
      expect(state.market.condition).toBeUndefined();
    });

    it('should affect prices when conditions are active', () => {
      const initialPrice = marketService.getCurrentPrice();
      
      // Trigger boom condition (1.4x multiplier)
      marketService.triggerMarketCondition('boom');
      
      // Sell to see the effect
      const result = marketService.sellMatchsticks(10n);
      
      expect(result.success).toBe(true);
      // Price should be influenced by the condition
      expect(result.pricePerUnit).toBeGreaterThan(initialPrice * 0.8);
    });
  });

  describe('Market Share Calculation', () => {
    it('should calculate market share correctly', () => {
      const result = marketService.sellMatchsticks(100n);
      
      expect(result.marketShare).toBeGreaterThan(0);
      expect(result.marketShare).toBeLessThanOrEqual(100);
      
      // Larger sales should increase market share
      gameActions.addResources({ matchsticks: 1000n });
      const largerResult = marketService.sellMatchsticks(1000n);
      
      expect(largerResult.marketShare).toBeGreaterThan(result.marketShare);
    });
  });

  describe('Achievement Integration', () => {
    it('should emit achievement events for milestones', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      // First sale achievement
      marketService.sellMatchsticks(1n);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'achievement_unlocked',
          data: expect.objectContaining({
            achievementId: 'first_sale'
          })
        })
      );
    });

    it('should emit events for revenue milestones', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      // Set high price to reach revenue milestone
      gameActions.updateMarket({ currentPrice: 10 });
      marketService.sellMatchsticks(15n); // Should generate 150+ revenue
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'achievement_unlocked',
          data: expect.objectContaining({
            achievementId: 'merchant_apprentice'
          })
        })
      );
    });

    it('should emit events for bulk trading', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      marketService.sellMatchsticks(1000n); // Bulk trade threshold
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'achievement_unlocked',
          data: expect.objectContaining({
            achievementId: 'bulk_trader'
          })
        })
      );
    });
  });

  describe('Event Emission', () => {
    it('should emit trade execution events', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      const result = marketService.sellMatchsticks(25n);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'trade_executed',
          source: 'market_service',
          data: expect.objectContaining({
            amount: 25n,
            revenue: result.revenue,
            pricePerUnit: result.pricePerUnit,
            marketShare: result.marketShare
          })
        })
      );
    });

    it('should emit condition change events', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      marketService.triggerMarketCondition('winter_season');
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'condition_change',
          source: 'market_service',
          data: expect.objectContaining({
            conditionId: 'winter_season',
            name: 'Winter Season'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // All operations should complete without throwing
      expect(() => marketService.getCurrentPrice()).not.toThrow();
      expect(() => marketService.getMarketAnalysis()).not.toThrow();
      expect(() => marketService.getRecentTrades()).not.toThrow();
      expect(() => marketService.getAvailableConditions()).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should provide fallback values when errors occur', () => {
      const analysis = marketService.getMarketAnalysis();
      
      expect(analysis.currentPrice).toBeGreaterThan(0);
      expect(analysis.trend).toBeDefined();
      expect(analysis.recommendation).toBeDefined();
    });
  });

  describe('Simulation Control', () => {
    it('should start and stop simulation properly', () => {
      // Stop should work without errors
      expect(() => marketService.stopSimulation()).not.toThrow();
      
      // Multiple stops should be safe
      marketService.stopSimulation();
      marketService.stopSimulation();
    });
  });

  describe('Integration with Game State', () => {
    it('should properly integrate with game state management', () => {
      const initialState = get(gameState);
      expect(initialState.resources.matchsticks).toBe(1000n);
      expect(initialState.resources.money).toBe(0);
      
      marketService.sellMatchsticks(100n);
      
      const updatedState = get(gameState);
      expect(updatedState.resources.matchsticks).toBe(900n);
      expect(updatedState.resources.money).toBeGreaterThan(0);
      expect(updatedState.market.totalSold).toBe(100n);
    });

    it('should respect current market price from game state', () => {
      gameActions.updateMarket({ currentPrice: 5.0 });
      
      const price = marketService.getCurrentPrice();
      expect(price).toBe(5.0);
      
      const result = marketService.sellMatchsticks(10n);
      expect(result.pricePerUnit).toBeCloseTo(5.0, 1);
    });

    it('should work with market conditions from game state', () => {
      // Set a market condition
      gameActions.updateMarket({
        condition: {
          priceMultiplier: 2.0,
          demandLevel: 'high',
          trend: 'rising',
          duration: 60000,
          description: 'Test Condition'
        }
      });
      
      const result = marketService.sellMatchsticks(10n);
      
      expect(result.success).toBe(true);
      expect(result.transaction?.marketCondition).toBe('Test Condition');
    });
  });
}); 
