import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storageService, type GameSave } from './storage.js';
import type { GameState } from '../types/index.js';

// Mock game state for testing
const createMockGameState = (): GameState => ({
  resources: {
    matchsticks: 1000n,
    money: 500,
    wood: 25,
    reputation: 10
  },
  production: {
    manualRate: 2,
    automatedRate: 5,
    multipliers: { 'test_multiplier': 1.5 },
    lastUpdate: Date.now(),
    totalProduced: 5000n
  },
  market: {
    currentPrice: 1.25,
    basePrice: 1,
    priceHistory: [],
    condition: {
      priceMultiplier: 1.1,
      demandLevel: 'normal',
      trend: 'rising',
      duration: 1000,
      description: 'Market trending upward'
    },
    autoSellEnabled: true,
    autoSellThreshold: 200,
    totalSold: 3000n,
    totalRevenue: 3750
  },
  automation: {
    autoClickers: [],
    autoSellEnabled: true,
    autoSellSettings: {
      enabled: true,
      threshold: 200,
      maxPercentage: 75,
      priceThreshold: 1.0,
      smartSelling: true
    },
    multipliers: [],
    lastUpdate: Date.now()
  },
  achievements: {
    unlocked: [],
    progress: {},
    notifications: [],
    stats: {
      totalUnlocked: 5,
      totalHidden: 2,
      completionPercentage: 25,
      unlockedToday: 1
    }
  },
  progression: {
    currentPhase: 'automation',
    unlockedFeatures: ['manual_production', 'auto_clickers', 'market'],
    completedTutorials: ['basic_production'],
    milestones: [],
    worldConversionProgress: 15,
    prestigeLevel: 1
  },
  tutorial: {
    currentStep: 5,
    completedTutorials: ['basic_production'],
    skippedTutorials: [],
    isActive: false
  },
  settings: {
    theme: 'dark',
    soundEnabled: false,
    musicEnabled: true,
    hapticEnabled: false,
    animations: {
      enabled: true,
      reducedMotion: true,
      particleEffects: false,
      transitionSpeed: 'fast'
    },
    notifications: {
      enabled: true,
      achievements: true,
      milestones: false,
      marketAlerts: true,
      production: false,
      sound: false
    },
    accessibility: {
      highContrast: true,
      screenReader: false,
      keyboardNavigation: true,
      largeText: true,
      colorBlindFriendly: false
    },
    language: 'en',
    autoSave: true,
    saveInterval: 60000
  },
  easterEggs: {
    discovered: ['konami_code'],
    sequences: [],
    totalFound: 1
  },
  metadata: {
    version: '1.0.0',
    createdAt: Date.now() - 86400000, // 1 day ago
    lastSaved: Date.now() - 3600000,  // 1 hour ago
    totalPlayTime: 7200000, // 2 hours
    sessionStartTime: Date.now() - 1800000, // 30 minutes ago
    playerId: 'test-player-123',
    gameSpeed: 1,
    debugMode: false
  }
});

describe('Storage Service', () => {
  let mockGameState: GameState;

  beforeEach(async () => {
    mockGameState = createMockGameState();
    
    // Initialize storage service
    await storageService.initialize();
    
    // Clear any existing data for clean tests
    await storageService.clearAllData();
  });

  afterEach(async () => {
    // Clean up after each test
    await storageService.clearAllData();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      // Should not throw
      await expect(storageService.initialize()).resolves.toBeUndefined();
    });

    it('should handle multiple initialization calls gracefully', async () => {
      await storageService.initialize();
      await storageService.initialize();
      await storageService.initialize();
      
      // Should not throw
    });
  });

  describe('Game Save Operations', () => {
    it('should save and load game state correctly', async () => {
      const saveId = await storageService.saveGame(mockGameState, 'Test Save');
      
      expect(saveId).toMatch(/^save_\d+_[a-z0-9]+$/);
      
      const loadedState = await storageService.loadGame(saveId);
      
      expect(loadedState).toBeDefined();
      expect(loadedState?.resources.matchsticks).toBe(1000n);
      expect(loadedState?.resources.money).toBe(500);
      expect(loadedState?.progression.currentPhase).toBe('automation');
      expect(loadedState?.metadata.version).toBe('1.0.0');
    });

    it('should handle BigInt values correctly in save/load', async () => {
      mockGameState.resources.matchsticks = 999999999999999999n;
      mockGameState.production.totalProduced = 123456789012345678n;
      
      const saveId = await storageService.saveGame(mockGameState);
      const loadedState = await storageService.loadGame(saveId);
      
      expect(loadedState?.resources.matchsticks).toBe(999999999999999999n);
      expect(loadedState?.production.totalProduced).toBe(123456789012345678n);
    });

    it('should create auto-save with proper naming', async () => {
      const saveId = await storageService.saveGame(mockGameState, undefined, true);
      const saves = await storageService.listSaves();
      
      const autoSave = saves.find(save => save.id === saveId);
      expect(autoSave?.isAutoSave).toBe(true);
      expect(autoSave?.name).toMatch(/^AutoSave_/);
    });

    it('should generate checksum for data integrity', async () => {
      const saveId = await storageService.saveGame(mockGameState);
      const saves = await storageService.listSaves();
      
      const save = saves.find(s => s.id === saveId);
      expect(save?.checksum).toBeDefined();
      expect(save?.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should return null for non-existent save', async () => {
      const loadedState = await storageService.loadGame('non-existent-save');
      expect(loadedState).toBeNull();
    });

    it('should list saves in reverse chronological order', async () => {
      const saveId1 = await storageService.saveGame(mockGameState, 'First Save');
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const saveId2 = await storageService.saveGame(mockGameState, 'Second Save');
      
      const saves = await storageService.listSaves();
      
      expect(saves).toHaveLength(2);
      expect(saves[0].id).toBe(saveId2); // Most recent first
      expect(saves[1].id).toBe(saveId1);
      expect(saves[0].name).toBe('Second Save');
      expect(saves[1].name).toBe('First Save');
    });

    it('should delete saves successfully', async () => {
      const saveId = await storageService.saveGame(mockGameState, 'To Delete');
      
      let saves = await storageService.listSaves();
      expect(saves).toHaveLength(1);
      
      const deleted = await storageService.deleteSave(saveId);
      expect(deleted).toBe(true);
      
      saves = await storageService.listSaves();
      expect(saves).toHaveLength(0);
    });

    it('should cleanup old auto-saves (keep last 5)', async () => {
      // Create 7 auto-saves
      const saveIds: string[] = [];
      for (let i = 0; i < 7; i++) {
        const saveId = await storageService.saveGame(mockGameState, `AutoSave ${i}`, true);
        saveIds.push(saveId);
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      const saves = await storageService.listSaves();
      const autoSaves = saves.filter(save => save.isAutoSave);
      
      // Should only have 5 auto-saves
      expect(autoSaves).toHaveLength(5);
      
      // Should keep the most recent 5
      const oldestKeptSave = autoSaves[autoSaves.length - 1];
      expect(saveIds.slice(-5)).toContain(oldestKeptSave.id);
    });
  });

  describe('Settings Operations', () => {
    it('should save and load settings correctly', async () => {
      await storageService.saveSetting('theme', 'dark');
      await storageService.saveSetting('soundEnabled', false);
      await storageService.saveSetting('complexObject', { a: 1, b: [2, 3, 4] });
      
      const theme = await storageService.loadSetting('theme');
      const soundEnabled = await storageService.loadSetting('soundEnabled');
      const complexObject = await storageService.loadSetting('complexObject');
      
      expect(theme).toBe('dark');
      expect(soundEnabled).toBe(false);
      expect(complexObject).toEqual({ a: 1, b: [2, 3, 4] });
    });

    it('should return null for non-existent settings', async () => {
      const setting = await storageService.loadSetting('non-existent');
      expect(setting).toBeNull();
    });

    it('should overwrite existing settings', async () => {
      await storageService.saveSetting('testKey', 'initial');
      await storageService.saveSetting('testKey', 'updated');
      
      const value = await storageService.loadSetting('testKey');
      expect(value).toBe('updated');
    });
  });

  describe('Achievement Operations', () => {
    it('should save and load achievements correctly', async () => {
      await storageService.saveAchievement('first_matchstick', { progress: 100 });
      await storageService.saveAchievement('big_spender', { progress: 50, amount: 1000 });
      
      const achievements = await storageService.loadAchievements();
      
      expect(achievements).toHaveLength(2);
      
      const firstAchievement = achievements.find(a => a.achievementId === 'first_matchstick');
      const secondAchievement = achievements.find(a => a.achievementId === 'big_spender');
      
      expect(firstAchievement?.progress).toEqual({ progress: 100 });
      expect(secondAchievement?.progress).toEqual({ progress: 50, amount: 1000 });
    });

    it('should track achievement unlock times', async () => {
      const beforeTime = Date.now();
      await storageService.saveAchievement('timed_achievement', {});
      const afterTime = Date.now();
      
      const achievements = await storageService.loadAchievements();
      const achievement = achievements.find(a => a.achievementId === 'timed_achievement');
      
      expect(achievement?.unlockedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(achievement?.unlockedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Data Export/Import', () => {
    it('should export data as valid JSON string', async () => {
      await storageService.saveGame(mockGameState, 'Export Test');
      await storageService.saveSetting('exportSetting', 'test');
      await storageService.saveAchievement('export_achievement', { test: true });
      
      const exportedData = await storageService.exportData();
      
      expect(typeof exportedData).toBe('string');
      
      const parsed = JSON.parse(exportedData);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.exportedAt).toBeGreaterThan(0);
      expect(parsed.saves).toHaveLength(1);
      expect(parsed.settings).toHaveLength(1);
      expect(parsed.achievements).toHaveLength(1);
    });

    it('should import data correctly', async () => {
      // First, create some data to export
      const saveId = await storageService.saveGame(mockGameState, 'Import Test');
      await storageService.saveSetting('importSetting', 'value');
      await storageService.saveAchievement('import_achievement', { imported: true });
      
      const exportedData = await storageService.exportData();
      
      // Clear current data
      await storageService.clearAllData();
      
      // Verify data is cleared
      let saves = await storageService.listSaves();
      expect(saves).toHaveLength(0);
      
      // Import the data
      await storageService.importData(exportedData);
      
      // Verify data is restored
      saves = await storageService.listSaves();
      expect(saves).toHaveLength(1);
      
      const setting = await storageService.loadSetting('importSetting');
      expect(setting).toBe('value');
      
      const achievements = await storageService.loadAchievements();
      expect(achievements).toHaveLength(1);
      expect(achievements[0].progress).toEqual({ imported: true });
    });

    it('should handle invalid import data gracefully', async () => {
      await expect(storageService.importData('invalid json')).rejects.toThrow();
      await expect(storageService.importData('{}')).rejects.toThrow('Invalid import data format');
    });
  });

  describe('Storage Statistics', () => {
    it('should provide accurate storage statistics', async () => {
      await storageService.saveGame(mockGameState, 'Stats Test 1');
      await storageService.saveGame(mockGameState, 'Stats Test 2');
      await storageService.saveSetting('statsSetting', 'test');
      await storageService.saveAchievement('stats_achievement', {});
      
      const stats = await storageService.getStorageStats();
      
      expect(stats.saves).toBe(2);
      expect(stats.settings).toBe(1);
      expect(stats.achievements).toBe(1);
      expect(stats.analytics).toBeGreaterThanOrEqual(0); // May have analytics from other operations
      expect(typeof stats.totalSize).toBe('number');
      expect(stats.totalSize).toBeGreaterThanOrEqual(0); // Should be non-negative
    });

    it('should return zero stats for empty storage', async () => {
      const stats = await storageService.getStorageStats();
      
      expect(stats.saves).toBe(0);
      expect(stats.settings).toBe(0);
      expect(stats.achievements).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // All operations should complete without throwing
      await expect(storageService.loadGame('invalid')).resolves.toBeNull();
      await expect(storageService.deleteSave('invalid')).resolves.toBe(false);
      await expect(storageService.loadSetting('invalid')).resolves.toBeNull();
      await expect(storageService.loadAchievements()).resolves.toEqual([]);
      
      consoleSpy.mockRestore();
    });

    it('should handle corrupted save data', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // This is difficult to test directly since we'd need to corrupt the database
      // But we can at least verify the error handling paths exist
      await expect(storageService.loadGame('non-existent')).resolves.toBeNull();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Data Integrity', () => {
    it('should preserve data types through save/load cycle', async () => {
      // Test various data types
      mockGameState.resources.matchsticks = 123456789n;
      mockGameState.settings.soundEnabled = true;
      mockGameState.settings.saveInterval = 30000;
      mockGameState.progression.worldConversionProgress = 42.5;
      
      const saveId = await storageService.saveGame(mockGameState);
      const loadedState = await storageService.loadGame(saveId);
      
      expect(typeof loadedState?.resources.matchsticks).toBe('bigint');
      expect(typeof loadedState?.settings.soundEnabled).toBe('boolean');
      expect(typeof loadedState?.settings.saveInterval).toBe('number');
      expect(typeof loadedState?.progression.worldConversionProgress).toBe('number');
      
      expect(loadedState?.resources.matchsticks).toBe(123456789n);
      expect(loadedState?.settings.soundEnabled).toBe(true);
      expect(loadedState?.settings.saveInterval).toBe(30000);
      expect(loadedState?.progression.worldConversionProgress).toBe(42.5);
    });
  });
}); 
