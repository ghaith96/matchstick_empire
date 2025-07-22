import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { achievementService } from './achievements.js';
import { gameState, gameActions } from '../stores/gameState.js';

describe('Achievement Service', () => {
  beforeEach(() => {
    // Reset game state before each test
    gameActions.reset();
    
    // Stop achievement tracking to prevent interference
    achievementService.stopTracking();
  });

  afterEach(() => {
    // Clean up tracking
    achievementService.stopTracking();
  });

  describe('Basic Achievement Unlocking', () => {
    it('should unlock first match achievement', () => {
      // Add some matchsticks to trigger the achievement
      gameActions.addResources({ matchsticks: 1n });
      
      const newAchievements = achievementService.checkAchievements();
      
      expect(newAchievements).toHaveLength(1);
      expect(newAchievements[0].id).toBe('first_match');
      expect(newAchievements[0].name).toBe('First Light');
      
      const state = get(gameState);
      expect(state.achievements.unlocked).toHaveLength(1);
      expect(state.achievements.unlocked[0]).toBe('first_match');
    });

    it('should unlock multiple achievements at once', () => {
      // Add enough matchsticks to trigger multiple achievements
      gameActions.addResources({ matchsticks: 100n });
      
      const newAchievements = achievementService.checkAchievements();
      
      expect(newAchievements.length).toBeGreaterThan(1);
      
      const achievementIds = newAchievements.map(a => a.id);
      expect(achievementIds).toContain('first_match');
      expect(achievementIds).toContain('hundred_matches');
    });

    it('should not unlock the same achievement twice', () => {
      gameActions.addResources({ matchsticks: 1n });
      
      const firstCheck = achievementService.checkAchievements();
      const secondCheck = achievementService.checkAchievements();
      
      expect(firstCheck).toHaveLength(1);
      expect(secondCheck).toHaveLength(0);
      
      const state = get(gameState);
      expect(state.achievements.unlocked).toHaveLength(1);
    });

    it('should manually unlock achievements by ID', () => {
      const achievement = achievementService.unlockAchievementById('first_match');
      
      expect(achievement).toBeDefined();
      expect(achievement!.id).toBe('first_match');
      
      const state = get(gameState);
      expect(state.achievements.unlocked).toHaveLength(1);
    });

    it('should not manually unlock non-existent achievements', () => {
      const achievement = achievementService.unlockAchievementById('non_existent');
      
      expect(achievement).toBeNull();
      
      const state = get(gameState);
      expect(state.achievements.unlocked).toHaveLength(0);
    });

    it('should not manually unlock already unlocked achievements', () => {
      // Unlock first time
      const first = achievementService.unlockAchievementById('first_match');
      expect(first).toBeDefined();
      
      // Try to unlock again
      const second = achievementService.unlockAchievementById('first_match');
      expect(second).toBeNull();
      
      const state = get(gameState);
      expect(state.achievements.unlocked).toHaveLength(1);
    });
  });

  describe('Achievement Progress Tracking', () => {
    it('should calculate progress for resource achievements', () => {
      gameActions.addResources({ matchsticks: 50n });
      
      const progress = achievementService.getAchievementProgress('hundred_matches');
      
      expect(progress).toBeDefined();
      expect(progress!.progress).toBe(0.5); // 50/100
      expect(progress!.isComplete).toBe(false);
      expect(progress!.currentValue).toBe(50);
      expect(progress!.targetValue).toBe(100);
    });

    it('should show 100% progress for completed achievements', () => {
      // Unlock the achievement first
      gameActions.addResources({ matchsticks: 100n });
      achievementService.checkAchievements();
      
      const progress = achievementService.getAchievementProgress('hundred_matches');
      
      expect(progress).toBeDefined();
      expect(progress!.progress).toBe(1);
      expect(progress!.isComplete).toBe(true);
    });

    it('should return null for non-existent achievements', () => {
      const progress = achievementService.getAchievementProgress('non_existent');
      
      expect(progress).toBeNull();
    });

    it('should calculate progress for stat-based achievements', () => {
      // Update market state to simulate sales
      gameActions.updateMarket({ totalRevenue: 50 });
      
      const progress = achievementService.getAchievementProgress('merchant_apprentice');
      
      expect(progress).toBeDefined();
      expect(progress!.progress).toBe(0.5); // 50/100
      expect(progress!.currentValue).toBe(50);
      expect(progress!.targetValue).toBe(100);
    });
  });

  describe('Achievement Statistics', () => {
    it('should provide correct statistics for empty state', () => {
      const stats = achievementService.getStats();
      
      expect(stats.totalAchievements).toBeGreaterThan(0);
      expect(stats.unlockedAchievements).toBe(0);
      expect(stats.completionPercentage).toBe(0);
      expect(stats.achievementPoints).toBe(0);
    });

    it('should update statistics after unlocking achievements', () => {
      gameActions.addResources({ matchsticks: 100n });
      achievementService.checkAchievements();
      
      const stats = achievementService.getStats();
      
      expect(stats.unlockedAchievements).toBe(2); // first_match + first_hundred
      expect(stats.completionPercentage).toBeGreaterThan(0);
      expect(stats.achievementPoints).toBeGreaterThan(0);
    });
  });

  describe('Available Achievements', () => {
    it('should return visible achievements', () => {
      const achievements = achievementService.getAvailableAchievements();
      
      expect(achievements.length).toBeGreaterThan(0);
    });

    it('should show achievement details correctly', () => {
      const achievements = achievementService.getAllAchievements();
      const firstMatch = achievements.find(a => a.id === 'first_match');
      
      expect(firstMatch).toBeDefined();
      expect(firstMatch!.name).toBe('First Light');
      expect(firstMatch!.category).toBe('production');
      expect(firstMatch!.difficulty).toBe('easy');
    });
  });

  describe('Custom Achievements', () => {
    it('should add custom achievements successfully', () => {
      const customAchievement = {
        id: 'custom_test',
        name: 'Custom Test',
        description: 'A test achievement',
        category: 'special' as const,
        difficulty: 'medium' as const,
        icon: '🧪',
        requirement: { type: 'resource_total' as const, resource: 'matchsticks', amount: 500n },
        reward: { type: 'money' as const, amount: 100 },
        isHidden: false
      };
      
      const result = achievementService.addCustomAchievement(customAchievement);
      
      expect(result).toBe(true);
      
      const achievements = achievementService.getAvailableAchievements();
      const customFound = achievements.find(a => a.id === 'custom_test');
      
      expect(customFound).toBeDefined();
      expect(customFound!.name).toBe('Custom Test');
    });

    it('should not add duplicate achievements', () => {
      const customAchievement = {
        id: 'first_match', // Duplicate ID
        name: 'Duplicate',
        description: 'This should fail',
        category: 'special' as const,
        difficulty: 'medium' as const,
        icon: '❌',
        requirement: { type: 'resource_total' as const, resource: 'matchsticks', amount: 1n },
        reward: { type: 'money' as const, amount: 1 },
        isHidden: false
      };
      
      const result = achievementService.addCustomAchievement(customAchievement);
      
      expect(result).toBe(false);
    });

    it('should validate custom achievement config', () => {
      const invalidAchievement = {
        id: '', // Invalid empty ID
        name: 'Invalid',
        description: 'Invalid achievement',
        category: 'special' as const,
        difficulty: 'medium' as const,
        icon: '❌',
        requirement: { type: 'resource_total' as const, resource: 'matchsticks', amount: 1n },
        reward: { type: 'money' as const, amount: 1 },
        isHidden: false
      };
      
      const result = achievementService.addCustomAchievement(invalidAchievement);
      
      expect(result).toBe(false);
    });
  });

  describe('Event Integration', () => {
    it('should emit achievement events when unlocked', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      gameActions.addResources({ matchsticks: 1n });
      achievementService.checkAchievements();
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'achievement_unlocked',
          source: 'achievement_service',
          data: expect.objectContaining({
            achievement: expect.objectContaining({
              id: 'first_match'
            })
          })
        })
      );
    });

    it('should include reward information in events', () => {
      const eventSpy = vi.spyOn(gameActions, 'emitEvent');
      
      gameActions.addResources({ matchsticks: 1n });
      achievementService.checkAchievements();
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reward: expect.objectContaining({
              type: 'money',
              amount: 10
            }),
            points: 10 // Easy achievement points
          })
        })
      );
    });
  });

  describe('Requirement Types', () => {
    it('should handle resource_total requirements correctly', () => {
      gameActions.addResources({ matchsticks: 1000n });
      
      const achievements = achievementService.checkAchievements();
      const masterCraftsman = achievements.find(a => a.id === 'thousand_matches');
      
      expect(masterCraftsman).toBeDefined();
    });

    it('should handle stat_threshold requirements correctly', () => {
      gameActions.updateMarket({ totalRevenue: 100 });
      
      const achievements = achievementService.checkAchievements();
      const merchantApprentice = achievements.find(a => a.id === 'merchant_apprentice');
      
      expect(merchantApprentice).toBeDefined();
    });

    it('should handle phase_reached requirements', () => {
      gameActions.load({ 
        progression: { 
          currentPhase: 'automation',
          unlockedPhases: ['manual', 'automation'],
          milestones: [],
          totalTime: 0
        } 
      });
      
      const achievements = achievementService.checkAchievements();
      const industrialRevolution = achievements.find(a => a.id === 'automation_phase');
      
      expect(industrialRevolution).toBeDefined();
    });
  });

  describe('Reward Application', () => {
    it('should apply money rewards correctly', () => {
      const initialMoney = get(gameState).resources.money;
      
      gameActions.addResources({ matchsticks: 1n });
      achievementService.checkAchievements();
      
      const finalMoney = get(gameState).resources.money;
      expect(finalMoney).toBe(initialMoney + 10); // First match reward
    });

    it('should track achievement points correctly', () => {
      gameActions.addResources({ matchsticks: 1n });
      achievementService.checkAchievements();
      
      const state = get(gameState);
      expect(state.achievements.totalPoints).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // All operations should complete without throwing
      expect(() => achievementService.checkAchievements()).not.toThrow();
      expect(() => achievementService.getAchievementStats()).not.toThrow();
      expect(() => achievementService.getAvailableAchievements()).not.toThrow();
      expect(() => achievementService.getAchievementProgress('first_match')).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should provide fallback values when errors occur', () => {
      const stats = achievementService.getAchievementStats();
      
      expect(stats.totalAchievements).toBeGreaterThanOrEqual(0);
      expect(stats.unlockedAchievements).toBeGreaterThanOrEqual(0);
      expect(stats.completionPercentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Achievement Categories and Difficulties', () => {
    it('should categorize achievements correctly', () => {
      const achievements = achievementService.getAvailableAchievements();
      
      const productionAchievements = achievements.filter(a => a.category === 'production');
      const tradingAchievements = achievements.filter(a => a.category === 'trading');
      const automationAchievements = achievements.filter(a => a.category === 'automation');
      
      expect(productionAchievements.length).toBeGreaterThan(0);
      expect(tradingAchievements.length).toBeGreaterThan(0);
      expect(automationAchievements.length).toBeGreaterThan(0);
    });

    it('should assign difficulty levels correctly', () => {
      const achievements = achievementService.getAvailableAchievements();
      
      const easyAchievements = achievements.filter(a => a.difficulty === 'easy');
      const mediumAchievements = achievements.filter(a => a.difficulty === 'medium');
      const hardAchievements = achievements.filter(a => a.difficulty === 'hard');
      
      expect(easyAchievements.length).toBeGreaterThan(0);
      expect(mediumAchievements.length).toBeGreaterThan(0);
      expect(hardAchievements.length).toBeGreaterThan(0);
    });

    it('should award different points based on difficulty', () => {
      const stats = achievementService.getAchievementStats();
      
      // Unlock achievements of different difficulties
      gameActions.addResources({ matchsticks: 1n }); // Easy
      achievementService.checkAchievements();
      
      const statsAfterEasy = achievementService.getAchievementStats();
      const easyPoints = statsAfterEasy.achievementPoints;
      
      gameActions.addResources({ matchsticks: 999n }); // Medium (thousand_matches)
      achievementService.checkAchievements();
      
      const statsAfterMedium = achievementService.getAchievementStats();
      const totalPoints = statsAfterMedium.achievementPoints;
      
      expect(totalPoints).toBeGreaterThan(easyPoints);
    });
  });

  describe('Service Control', () => {
    it('should start and stop tracking properly', () => {
      expect(() => achievementService.stopTracking()).not.toThrow();
      
      // Multiple stops should be safe
      achievementService.stopTracking();
      achievementService.stopTracking();
    });
  });

  describe('Integration with Game State', () => {
    it('should properly integrate with game state management', () => {
      const initialState = get(gameState);
      expect(initialState.achievements.unlocked).toHaveLength(0);
      expect(initialState.achievements.totalPoints).toBe(0);
      
      gameActions.addResources({ matchsticks: 1n });
      achievementService.checkAchievements();
      
      const updatedState = get(gameState);
      expect(updatedState.achievements.unlocked).toHaveLength(1);
      expect(updatedState.achievements.totalPoints).toBeGreaterThan(0);
    });

    it('should work with various game state updates', () => {
      // Test production achievements
      gameActions.updateProduction({ totalProduced: 1000n });
      const productionAchievements = achievementService.checkAchievements();
      expect(productionAchievements.length).toBeGreaterThan(0);
      
      // Test market achievements
      gameActions.updateMarket({ totalRevenue: 1000 });
      const marketAchievements = achievementService.checkAchievements();
      expect(marketAchievements.some(a => a.category === 'trading')).toBe(true);
      
      // Test automation achievements
      gameActions.updateAutomation({ totalMoneySpent: 500 });
      const automationAchievements = achievementService.checkAchievements();
      expect(automationAchievements.some(a => a.category === 'automation')).toBe(true);
    });
  });

  describe('State Synchronization', () => {
    it('should sync achievement service state with loaded game state', () => {
      // Simulate a saved game state with unlocked achievements
      const savedGameState = {
        achievements: {
          unlocked: ['first_match', 'first_hundred'],
          progress: {},
          notifications: [],
          stats: {
            totalUnlocked: 2,
            totalHidden: 0,
            completionPercentage: 20,
            unlockedToday: 0
          }
        }
      };
      
      // Load the saved state
      gameActions.load(savedGameState);
      
      // Before sync, achievements should be marked as not unlocked in service
      const firstMatch = achievementService.getAchievement('first_match');
      const firstHundred = achievementService.getAchievement('first_hundred');
      expect(firstMatch?.unlocked).toBe(false);
      expect(firstHundred?.unlocked).toBe(false);
      
      // Sync with game state
      achievementService.syncWithGameState();
      
      // After sync, achievements should be marked as unlocked in service
      expect(firstMatch?.unlocked).toBe(true);
      expect(firstHundred?.unlocked).toBe(true);
    });

    it('should prevent re-triggering of already unlocked achievements', () => {
      // Set up a game state where first match should be unlocked
      gameActions.updateProduction({ totalProduced: 100n });
      gameActions.updateAchievements({ unlocked: ['first_match'] });
      
      // Sync achievement service with this state
      achievementService.syncWithGameState();
      
      // Check achievements - should not unlock first_match again
      const newlyUnlocked = achievementService.checkAchievements();
      
      // Should only unlock first_hundred, not first_match
      expect(newlyUnlocked.length).toBe(1);
      expect(newlyUnlocked[0].id).toBe('first_hundred');
      expect(newlyUnlocked.some(a => a.id === 'first_match')).toBe(false);
    });

    it('should handle empty unlocked achievements array', () => {
      // Load a game state with no unlocked achievements
      const emptyState = {
        achievements: {
          unlocked: [],
          progress: {},
          notifications: [],
          stats: {
            totalUnlocked: 0,
            totalHidden: 0,
            completionPercentage: 0,
            unlockedToday: 0
          }
        }
      };
      
      gameActions.load(emptyState);
      
      // Should not throw an error
      expect(() => achievementService.syncWithGameState()).not.toThrow();
      
      // All achievements should remain unlocked = false
      const allAchievements = achievementService.getAllAchievements();
      allAchievements.forEach(achievement => {
        expect(achievement.unlocked).toBe(false);
      });
    });
  });

  describe('State Synchronization - Core Fix', () => {
    it('should sync achievement service with game state to prevent re-triggering', () => {
      // Reset both achievement service and game state
      achievementService.resetAchievements();
      gameActions.reset();
      
      // Manually set up the achievement state to simulate an already unlocked achievement
      gameActions.updateAchievements({
        unlocked: ['first_match'],
        stats: {
          totalUnlocked: 1,
          totalHidden: 0,
          completionPercentage: 10,
          unlockedToday: 0
        }
      });
      
      // Also set up production state to meet achievement requirements
      gameActions.updateProduction({ totalProduced: 10n });
      
      // Debug: Check what the game state actually contains after updates
      const currentState = get(gameState);
      console.log('Current game state achievements:', currentState.achievements);
      
      // Before sync: achievement service should think first_match is not unlocked
      const firstMatchBefore = achievementService.getAchievement('first_match');
      expect(firstMatchBefore?.unlocked).toBe(false);
      
      // Sync the achievement service with the loaded game state
      achievementService.syncWithGameState();
      
      // After sync: achievement service should know first_match is unlocked
      const firstMatchAfter = achievementService.getAchievement('first_match');
      expect(firstMatchAfter?.unlocked).toBe(true);
      
      // Now when we check achievements, it should NOT re-trigger first_match
      const newlyUnlocked = achievementService.checkAchievements();
      
      // Should be empty because first_match was already unlocked
      expect(newlyUnlocked.length).toBe(0);
      expect(newlyUnlocked.some(a => a.id === 'first_match')).toBe(false);
    });
  });
}); 
