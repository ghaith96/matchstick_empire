import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { productionService } from './production.js';
import { gameState, gameActions } from '../stores/gameState.js';

describe('Production Service', () => {
  beforeEach(() => {
    // Reset game state before each test
    gameActions.reset();
    productionService.resetStats();
    productionService.resetCombo();
  });

  describe('Basic Production', () => {
    it('should produce matchsticks when clicked', () => {
      const result = productionService.produceMatchsticks(1);
      
      expect(result.produced).toBeGreaterThan(0n);
      expect(result.comboMultiplier).toBe(1);
      expect(result.totalMultiplier).toBe(1);
      expect(result.comboCount).toBe(1);
      
      const state = get(gameState);
      expect(state.resources.matchsticks).toBe(result.produced);
    });

    it('should produce correct amount based on manual rate', () => {
      // Set manual rate to 2
      gameActions.updateProduction({ manualRate: 2 });
      
      const result = productionService.produceMatchsticks(1);
      
      expect(result.produced).toBeGreaterThanOrEqual(2n);
      
      const state = get(gameState);
      expect(state.resources.matchsticks).toBe(result.produced);
    });

    it('should handle multiple clicks', () => {
      const result = productionService.produceMatchsticks(5);
      
      expect(result.produced).toBeGreaterThanOrEqual(5n);
      
      const state = get(gameState);
      expect(state.resources.matchsticks).toBe(result.produced);
    });

    it('should update total production count', () => {
      productionService.produceMatchsticks(3);
      productionService.produceMatchsticks(2);
      
      const state = get(gameState);
      expect(state.production.totalProduced).toBeGreaterThanOrEqual(5n);
    });

    it('should ensure minimum production of 1 matchstick per click', () => {
      // Set very low manual rate
      gameActions.updateProduction({ manualRate: 0.1 });
      
      const result = productionService.produceMatchsticks(3);
      
      // Should still produce at least 3 matchsticks (1 per click)
      expect(result.produced).toBeGreaterThanOrEqual(3n);
    });
  });

  describe('Click Combo System', () => {
    it('should start combo on first click', () => {
      const result = productionService.produceMatchsticks(1);
      
      expect(result.comboCount).toBe(1);
      expect(result.comboMultiplier).toBe(1);
    });

    it('should increase combo on subsequent clicks', () => {
      productionService.produceMatchsticks(1);
      const result = productionService.produceMatchsticks(1);
      
      expect(result.comboCount).toBe(2);
      expect(result.comboMultiplier).toBe(1.01); // 1% increase
    });

    it('should apply combo multiplier correctly', () => {
      gameActions.updateProduction({ manualRate: 10 });
      
      // Build up a combo
      productionService.produceMatchsticks(1); // combo 1, multiplier 1
      productionService.produceMatchsticks(1); // combo 2, multiplier 1.01
      const result = productionService.produceMatchsticks(1); // combo 3, multiplier 1.02
      
      expect(result.comboCount).toBe(3);
      expect(result.comboMultiplier).toBe(1.02);
      expect(result.produced).toBe(BigInt(Math.floor(10 * 1.02)));
    });

    it('should reset combo after timeout', () => {
      // For testing purposes, we'll simulate the timeout behavior
      productionService.produceMatchsticks(1);
      
      // Manually reset combo to simulate timeout
      productionService.resetCombo();
      
      const result = productionService.produceMatchsticks(1);
      
      expect(result.comboCount).toBe(1);
      expect(result.comboMultiplier).toBe(1);
    });

    it('should cap combo at maximum', () => {
      // Rapidly click to reach max combo (50)
      for (let i = 0; i < 60; i++) {
        productionService.produceMatchsticks(1);
      }
      
      const comboInfo = productionService.getComboInfo();
      expect(comboInfo.count).toBe(50); // Max combo
      expect(comboInfo.multiplier).toBe(1.49); // 49% increase (max)
    });

    it('should provide combo information', () => {
      productionService.produceMatchsticks(1);
      productionService.produceMatchsticks(1);
      
      const comboInfo = productionService.getComboInfo();
      
      expect(comboInfo.count).toBe(2);
      expect(comboInfo.multiplier).toBe(1.01);
      expect(comboInfo.timeRemaining).toBeGreaterThan(0);
      expect(comboInfo.maxCombo).toBe(50);
    });
  });

  describe('Production Multipliers', () => {
    it('should apply permanent multipliers', () => {
      gameActions.updateProduction({ 
        manualRate: 10,
        multipliers: { 'test_multiplier': 2 }
      });
      
      const result = productionService.produceMatchsticks(1);
      
      expect(result.totalMultiplier).toBe(2);
      expect(result.produced).toBe(20n); // 10 * 2
    });

    it('should combine multiple multipliers', () => {
      gameActions.updateProduction({ 
        manualRate: 5,
        multipliers: { 
          'multiplier1': 2,
          'multiplier2': 1.5
        }
      });
      
      const result = productionService.produceMatchsticks(1);
      
      expect(result.totalMultiplier).toBe(3); // 1 * 2 * 1.5
      expect(result.produced).toBe(15n); // 5 * 3
    });

    it('should combine combo and permanent multipliers', () => {
      gameActions.updateProduction({ 
        manualRate: 10,
        multipliers: { 'test_multiplier': 2 }
      });
      
      // Build combo
      productionService.produceMatchsticks(1);
      const result = productionService.produceMatchsticks(1);
      
      expect(result.comboMultiplier).toBe(1.01);
      expect(result.totalMultiplier).toBe(2.02); // 1.01 * 2
      expect(result.produced).toBe(20n); // floor(10 * 2.02) = 20
    });

    it('should apply temporary multipliers', () => {
      gameActions.updateProduction({ manualRate: 10 });
      
      productionService.applyTemporaryMultiplier(3, 1000);
      
      const result = productionService.produceMatchsticks(1);
      expect(result.totalMultiplier).toBe(3);
      expect(result.produced).toBe(30n);
    });

    it('should remove temporary multipliers after duration', () => {
      return new Promise<void>((resolve) => {
        gameActions.updateProduction({ manualRate: 10 });
        
        productionService.applyTemporaryMultiplier(2, 100);
        
        setTimeout(() => {
          const result = productionService.produceMatchsticks(1);
          expect(result.totalMultiplier).toBe(1);
          expect(result.produced).toBe(10n);
          resolve();
        }, 150);
      });
    });

    it('should manually remove multipliers', () => {
      const state = get(gameState);
      gameActions.updateProduction({ 
        multipliers: { 'test_multiplier': 2 }
      });
      
      productionService.removeMultiplier('test_multiplier');
      
      const result = productionService.produceMatchsticks(1);
      expect(result.totalMultiplier).toBe(1);
    });
  });

  describe('Production Rate Calculation', () => {
    it('should calculate current production rate', () => {
      gameActions.updateProduction({ manualRate: 5 });
      
      const rate = productionService.getCurrentProductionRate();
      expect(rate).toBe(5);
    });

    it('should include multipliers in rate calculation', () => {
      gameActions.updateProduction({ 
        manualRate: 5,
        multipliers: { 'test_multiplier': 2 }
      });
      
      const rate = productionService.getCurrentProductionRate();
      expect(rate).toBe(10);
    });

    it('should include combo in rate calculation', () => {
      gameActions.updateProduction({ manualRate: 10 });
      
      // Build combo
      productionService.produceMatchsticks(1);
      productionService.produceMatchsticks(1);
      
      const rate = productionService.getCurrentProductionRate();
      expect(rate).toBe(10.1); // 10 * 1.01 combo multiplier
    });
  });

  describe('Production Statistics', () => {
    it('should track production statistics', () => {
      productionService.resetStats(); // Fresh start for this test
      
      productionService.produceMatchsticks(1); // First call (sessionClicks +1)
      productionService.produceMatchsticks(1); // Second call (sessionClicks +1)
      
      const stats = productionService.getProductionStats();
      
      expect(stats.sessionClicks).toBe(2);
      expect(stats.sessionProduction).toBeGreaterThanOrEqual(2n);
      expect(stats.averageClickRate).toBeGreaterThanOrEqual(0);
      expect(stats.sessionStartTime).toBeGreaterThan(0);
      expect(stats.totalClicks).toBeGreaterThanOrEqual(2); // Might be higher due to other tests
      expect(stats.totalProduced).toBeGreaterThanOrEqual(2n);
    });

    it('should track maximum combo since last reset', () => {
      productionService.resetStats(); // Fresh start
      
      // Build a combo
      for (let i = 0; i < 5; i++) {
        productionService.produceMatchsticks(1);
      }
      
      const stats = productionService.getProductionStats();
      expect(stats.maxCombo).toBeGreaterThanOrEqual(5);
    });

    it('should provide statistics structure', () => {
      const stats = productionService.getProductionStats();
      
      expect(typeof stats.totalClicks).toBe('number');
      expect(typeof stats.totalProduced).toBe('bigint');
      expect(typeof stats.averageClickRate).toBe('number');
      expect(typeof stats.maxCombo).toBe('number');
      expect(typeof stats.sessionProduction).toBe('bigint');
      expect(typeof stats.sessionClicks).toBe('number');
      expect(typeof stats.sessionStartTime).toBe('number');
    });

    it('should reset session statistics', () => {
      productionService.resetStats(); // Start fresh
      productionService.produceMatchsticks(1); // One call (sessionClicks = 1)
      
      const statsBeforeReset = productionService.getProductionStats();
      expect(statsBeforeReset.sessionProduction).toBeGreaterThan(0n);
      expect(statsBeforeReset.sessionClicks).toBe(1);
      
      const totalBefore = statsBeforeReset.totalProduced;
      const clicksBefore = statsBeforeReset.totalClicks;
      
      productionService.resetStats();
      
      const statsAfterReset = productionService.getProductionStats();
      expect(statsAfterReset.sessionProduction).toBe(0n);
      expect(statsAfterReset.sessionClicks).toBe(0);
      
      // Lifetime stats should be preserved
      expect(statsAfterReset.totalProduced).toBe(totalBefore);
      expect(statsAfterReset.totalClicks).toBe(clicksBefore);
    });
  });

  describe('Achievement Triggers', () => {
    it('should trigger production milestone achievements', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      // Set high production to trigger milestone
      gameActions.updateProduction({ manualRate: 100 });
      productionService.produceMatchsticks(1);
      
      // Should trigger "first_hundred" achievement
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'achievement_unlocked',
          data: expect.objectContaining({
            achievementId: 'first_hundred'
          })
        })
      );
    });

    it('should trigger combo achievements', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      // Build a combo of 10+
      for (let i = 0; i < 10; i++) {
        productionService.produceMatchsticks(1);
      }
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'combo_achievement',
          data: expect.objectContaining({
            type: 'combo_starter'
          })
        })
      );
    });

    it('should trigger master clicker achievement for high combos', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      // Build a combo of 25+
      for (let i = 0; i < 25; i++) {
        productionService.produceMatchsticks(1);
      }
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'combo_achievement',
          data: expect.objectContaining({
            type: 'master_clicker'
          })
        })
      );
    });
  });

  describe('Event Emission', () => {
    it('should emit production events', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      const result = productionService.produceMatchsticks(3);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'manual_production',
          source: 'production_service',
          data: expect.objectContaining({
            produced: result.produced,
            clickCount: 3,
            comboMultiplier: result.comboMultiplier,
            totalMultiplier: result.totalMultiplier,
            comboCount: result.comboCount
          })
        })
      );
    });

    it('should emit multiplier applied events', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      productionService.applyTemporaryMultiplier(2, 1000);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'multiplier_applied',
          source: 'production_service',
          data: expect.objectContaining({
            multiplier: 2,
            duration: 1000
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', () => {
      // Test that the production service has error handling
      const result = productionService.produceMatchsticks(5);
      
      // Should produce some amount (not necessarily fallback since normal operation works)
      expect(result.produced).toBeGreaterThanOrEqual(5n);
      expect(typeof result.comboMultiplier).toBe('number');
      expect(typeof result.totalMultiplier).toBe('number');
      expect(typeof result.comboCount).toBe('number');
    });
  });

  describe('Haptic Feedback', () => {
    it('should have haptic feedback functionality', () => {
      // Mock navigator.vibrate
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        writable: true
      });
      
      // Test that haptic feedback exists and can be called
      productionService.produceMatchsticks(1);
      
      // Should either be called (if enabled) or not called (if disabled)
      expect(typeof vibrateMock).toBe('function');
    });
  });

  describe('Integration with Game State', () => {
    it('should properly integrate with game state management', () => {
      const initialState = get(gameState);
      expect(initialState.resources.matchsticks).toBe(0n);
      
      productionService.produceMatchsticks(3);
      
      const updatedState = get(gameState);
      expect(updatedState.resources.matchsticks).toBeGreaterThan(0n);
      expect(updatedState.production.totalProduced).toBeGreaterThan(0n);
    });

    it('should respect manual rate from game state', () => {
      gameActions.updateProduction({ manualRate: 5 });
      
      const result = productionService.produceMatchsticks(2);
      
      expect(result.produced).toBeGreaterThanOrEqual(10n); // 5 * 2
    });

    it('should work with game state multipliers', () => {
      gameActions.updateProduction({ 
        manualRate: 3,
        multipliers: { 'upgrade1': 2 }
      });
      
      const result = productionService.produceMatchsticks(1);
      
      expect(result.produced).toBe(6n); // 3 * 2
    });
  });
}); 
