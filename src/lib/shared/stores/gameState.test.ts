import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  gameState,
  gameActions,
  gameEvents,
  resources,
  production,
  market,
  computedStores,
  performanceMonitor
} from './gameState.js';

describe('Game State Management', () => {
  beforeEach(() => {
    // Reset game state before each test
    gameActions.reset();
    gameActions.clearEvents();
  });

  describe('Initial State', () => {
    it('should have correct initial resource values', () => {
      const $resources = get(resources);
      
      expect($resources.matchsticks).toBe(0n);
      expect($resources.money).toBe(0);
      expect($resources.wood).toBe(0);
      expect($resources.reputation).toBe(0);
    });

    it('should have correct initial production values', () => {
      const $production = get(production);
      
      expect($production.manualRate).toBe(1);
      expect($production.automatedRate).toBe(0);
      expect($production.totalProduced).toBe(0n);
      expect($production.multipliers).toEqual({});
    });

    it('should have correct initial market values', () => {
      const $market = get(market);
      
      expect($market.currentPrice).toBe(1);
      expect($market.basePrice).toBe(1);
      expect($market.autoSellEnabled).toBe(false);
      expect($market.totalSold).toBe(0n);
      expect($market.totalRevenue).toBe(0);
    });
  });

  describe('Resource Management', () => {
    it('should add resources correctly', () => {
      gameActions.addResources({ 
        matchsticks: 100n, 
        money: 50,
        wood: 10,
        reputation: 5 
      });
      
      const $resources = get(resources);
      expect($resources.matchsticks).toBe(100n);
      expect($resources.money).toBe(50);
      expect($resources.wood).toBe(10);
      expect($resources.reputation).toBe(5);
    });

    it('should subtract resources when sufficient funds available', () => {
      gameActions.addResources({ matchsticks: 100n, money: 50 });
      
      const success = gameActions.subtractResources({ 
        matchsticks: 30n, 
        money: 20 
      });
      
      expect(success).toBe(true);
      const $resources = get(resources);
      expect($resources.matchsticks).toBe(70n);
      expect($resources.money).toBe(30);
    });

    it('should fail to subtract resources when insufficient funds', () => {
      gameActions.addResources({ matchsticks: 50n, money: 10 });
      
      const success = gameActions.subtractResources({ 
        matchsticks: 100n, 
        money: 20 
      });
      
      expect(success).toBe(false);
      const $resources = get(resources);
      expect($resources.matchsticks).toBe(50n);
      expect($resources.money).toBe(10);
    });

    it('should update resources safely', () => {
      gameActions.updateResources({ 
        matchsticks: 200n, 
        money: 75 
      });
      
      const $resources = get(resources);
      expect($resources.matchsticks).toBe(200n);
      expect($resources.money).toBe(75);
      expect($resources.wood).toBe(0); // Unchanged
      expect($resources.reputation).toBe(0); // Unchanged
    });
  });

  describe('Production System', () => {
    it('should produce matchsticks manually', () => {
      gameActions.produceMatchsticks(5);
      
      const $resources = get(resources);
      const $production = get(production);
      
      expect($resources.matchsticks).toBe(5n);
      expect($production.totalProduced).toBe(5n);
    });

    it('should apply manual rate multiplier', () => {
      gameActions.updateProduction({ manualRate: 2 });
      gameActions.produceMatchsticks(3);
      
      const $resources = get(resources);
      expect($resources.matchsticks).toBe(6n);
    });

    it('should emit production event', () => {
      gameActions.produceMatchsticks(1);
      
      const $events = get(gameEvents);
      expect($events).toHaveLength(1);
      expect($events[0].type).toBe('matchsticks_produced');
      expect($events[0].source).toBe('production_system');
      expect($events[0].data.amount).toBe(1n);
      expect($events[0].data.method).toBe('manual');
    });

    it('should update production state', () => {
      const updates = {
        manualRate: 3,
        automatedRate: 5,
        multipliers: { 'auto_clicker': 1.5 }
      };
      
      gameActions.updateProduction(updates);
      
      const $production = get(production);
      expect($production.manualRate).toBe(3);
      expect($production.automatedRate).toBe(5);
      expect($production.multipliers).toEqual({ 'auto_clicker': 1.5 });
      expect($production.lastUpdate).toBeGreaterThan(0);
    });
  });

  describe('Market System', () => {
    beforeEach(() => {
      // Set up some matchsticks for selling
      gameActions.addResources({ matchsticks: 100n });
    });

    it('should sell matchsticks successfully', () => {
      const success = gameActions.sellMatchsticks(50n);
      
      expect(success).toBe(true);
      
      const $resources = get(resources);
      const $market = get(market);
      
      expect($resources.matchsticks).toBe(50n);
      expect($resources.money).toBe(50); // 50 matchsticks * $1 each
      expect($market.totalSold).toBe(50n);
      expect($market.totalRevenue).toBe(50);
    });

    it('should fail to sell when insufficient matchsticks', () => {
      const success = gameActions.sellMatchsticks(150n);
      
      expect(success).toBe(false);
      
      const $resources = get(resources);
      expect($resources.matchsticks).toBe(100n); // Unchanged
      expect($resources.money).toBe(0); // Unchanged
    });

    it('should calculate revenue based on current price', () => {
      gameActions.updateMarket({ currentPrice: 2.5 });
      gameActions.sellMatchsticks(20n);
      
      const $resources = get(resources);
      expect($resources.money).toBe(50); // 20 * 2.5
    });

    it('should emit sale event', () => {
      gameActions.sellMatchsticks(25n);
      
      const $events = get(gameEvents);
      const saleEvent = $events.find(e => e.type === 'matchsticks_sold');
      
      expect(saleEvent).toBeDefined();
      expect(saleEvent?.source).toBe('market_system');
      expect(saleEvent?.data.amount).toBe(25n);
      expect(saleEvent?.data.revenue).toBe(25);
      expect(saleEvent?.data.price).toBe(1);
    });

    it('should update market state', () => {
      const updates = {
        currentPrice: 1.75,
        autoSellEnabled: true,
        autoSellThreshold: 200
      };
      
      gameActions.updateMarket(updates);
      
      const $market = get(market);
      expect($market.currentPrice).toBe(1.75);
      expect($market.autoSellEnabled).toBe(true);
      expect($market.autoSellThreshold).toBe(200);
    });
  });

  describe('Event System', () => {
    it('should emit and store events', () => {
      const testEvent = {
        id: 'test-event-1',
        type: 'test_event',
        timestamp: Date.now(),
        data: { test: true },
        source: 'test_system'
      };
      
      gameActions.emitEvent(testEvent);
      
      const $events = get(gameEvents);
      expect($events).toHaveLength(1);
      expect($events[0]).toEqual(testEvent);
    });

    it('should limit event history to 100 events', () => {
      // Emit more than 100 events
      for (let i = 0; i < 150; i++) {
        gameActions.emitEvent({
          id: `test-event-${i}`,
          type: 'test_event',
          timestamp: Date.now(),
          data: { index: i },
          source: 'test_system'
        });
      }
      
      const $events = get(gameEvents);
      expect($events).toHaveLength(100);
      
      // Should keep the most recent events
      expect($events[0].data.index).toBe(149);
      expect($events[99].data.index).toBe(50);
    });

    it('should clear all events', () => {
      gameActions.emitEvent({
        id: 'test-event',
        type: 'test_event',
        timestamp: Date.now(),
        data: {},
        source: 'test_system'
      });
      
      expect(get(gameEvents)).toHaveLength(1);
      
      gameActions.clearEvents();
      expect(get(gameEvents)).toHaveLength(0);
    });
  });

  describe('Computed Stores', () => {
    it('should calculate total production rate', () => {
      gameActions.updateProduction({
        manualRate: 2,
        automatedRate: 5,
        multipliers: { 'multiplier1': 0.5, 'multiplier2': 0.3 }
      });
      
      const rate = get(computedStores.totalProductionRate);
      // (2 + 5) * (1 + 0.5 + 0.3) = 7 * 1.8 = 12.6
      expect(rate).toBe(12.6);
    });

    it('should calculate net worth', () => {
      gameActions.addResources({
        matchsticks: 100n,
        money: 50,
        wood: 5,
        reputation: 3
      });
      gameActions.updateMarket({ currentPrice: 1.5 });
      
      const netWorth = get(computedStores.netWorth);
      // 100 * 1.5 + 50 + 5 * 10 + 3 * 5 = 150 + 50 + 50 + 15 = 265
      expect(netWorth).toBe(265);
    });

    it('should determine tutorial visibility', () => {
      const shouldShow = get(computedStores.shouldShowTutorial);
      expect(shouldShow).toBe(true); // Default: tutorial active, manual phase
    });
  });

  describe('State Persistence', () => {
    it('should load partial state data', () => {
      const partialData = {
        resources: { matchsticks: 500n, money: 100 },
        production: { manualRate: 3 }
      };
      
      gameActions.load(partialData);
      
      const $state = get(gameState);
      expect($state.resources.matchsticks).toBe(500n);
      expect($state.resources.money).toBe(100);
      expect($state.production.manualRate).toBe(3);
      
      // Other values should remain at defaults
      expect($state.resources.wood).toBe(0);
      expect($state.production.automatedRate).toBe(0);
    });

    it('should emit load event after loading state', () => {
      gameActions.load({ resources: { money: 200 } });
      
      const $events = get(gameEvents);
      const loadEvent = $events.find(e => e.type === 'state_loaded');
      
      expect(loadEvent).toBeDefined();
      expect(loadEvent?.source).toBe('game_system');
      expect(loadEvent?.data.success).toBe(true);
    });

    it('should reset to initial state', () => {
      // Modify state
      gameActions.addResources({ matchsticks: 1000n, money: 500 });
      gameActions.updateProduction({ manualRate: 5 });
      
      // Reset
      gameActions.reset();
      
      const $state = get(gameState);
      expect($state.resources.matchsticks).toBe(0n);
      expect($state.resources.money).toBe(0);
      expect($state.production.manualRate).toBe(1);
      expect(get(gameEvents)).toHaveLength(0);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track state updates', () => {
      const initialCount = performanceMonitor.stateUpdateCount;
      
      gameActions.addResources({ matchsticks: 10n });
      gameActions.updateProduction({ manualRate: 2 });
      
      expect(performanceMonitor.stateUpdateCount).toBeGreaterThan(initialCount);
    });

    it('should provide performance stats', () => {
      const stats = performanceMonitor.getStats();
      
      expect(stats).toHaveProperty('updateCount');
      expect(stats).toHaveProperty('lastUpdate');
      expect(stats).toHaveProperty('updatesPerMinute');
      expect(typeof stats.updateCount).toBe('number');
      expect(typeof stats.lastUpdate).toBe('number');
      expect(typeof stats.updatesPerMinute).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully in actions', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Force an error by passing invalid data
      gameActions.updateResources({ matchsticks: 'invalid' as any });
      
      // Should not throw, and state should remain valid
      const $resources = get(resources);
      expect(typeof $resources.matchsticks).toBe('bigint');
      
      consoleSpy.mockRestore();
    });

    it('should handle errors in computed stores', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Force an error condition
      gameActions.updateProduction({ multipliers: null as any });
      
      const rate = get(computedStores.totalProductionRate);
      expect(typeof rate).toBe('number');
      expect(rate).toBe(0); // Fallback value
      
      consoleSpy.mockRestore();
    });
  });

  describe('State Validation', () => {
    it('should sanitize loaded BigInt values', () => {
      // Simulate loading data with string BigInt
      const invalidData = {
        resources: { matchsticks: '1000' as any }
      };
      
      gameActions.load(invalidData);
      
      const $resources = get(resources);
      expect($resources.matchsticks).toBe(1000n);
      expect(typeof $resources.matchsticks).toBe('bigint');
    });

    it('should ensure non-negative resource values', () => {
      const invalidData = {
        resources: { 
          money: -100,
          wood: -50,
          reputation: -25
        }
      };
      
      gameActions.load(invalidData);
      
      const $resources = get(resources);
      expect($resources.money).toBe(0);
      expect($resources.wood).toBe(0);
      expect($resources.reputation).toBe(0);
    });
  });
}); 
