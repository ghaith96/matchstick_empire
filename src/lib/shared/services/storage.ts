import Dexie, { type Table } from 'dexie';
import type { GameState } from '../types/index.js';
import { createError, errorHandler } from '../utils/errors.js';

/**
 * Database schema for game saves
 */
export interface GameSave {
  id: string;
  name: string;
  gameState: GameState;
  timestamp: number;
  version: string;
  checksum?: string;
  isAutoSave: boolean;
}

/**
 * Database schema for game settings
 */
export interface StoredSettings {
  id: string;
  key: string;
  value: any;
  timestamp: number;
}

/**
 * Database schema for achievement progress
 */
export interface StoredAchievement {
  id: string;
  achievementId: string;
  unlockedAt: number;
  progress: Record<string, any>;
}

/**
 * Database schema for analytics/telemetry
 */
export interface GameAnalytics {
  id: string;
  event: string;
  data: any;
  timestamp: number;
  sessionId: string;
}

/**
 * Dexie database class for game persistence
 */
class MatchstickGameDB extends Dexie {
  // Tables
  saves!: Table<GameSave>;
  settings!: Table<StoredSettings>;
  achievements!: Table<StoredAchievement>;
  analytics!: Table<GameAnalytics>;

  constructor() {
    super('MatchstickEmpireDB');
    
    // Define schemas
    this.version(1).stores({
      saves: 'id, name, timestamp, version, isAutoSave',
      settings: 'id, key, timestamp',
      achievements: 'id, achievementId, unlockedAt',
      analytics: 'id, event, timestamp, sessionId'
    });

    // Migration hooks if needed
    this.version(1).upgrade(trans => {
      // Initial setup - no migration needed
    });
  }
}

// Global database instance
const db = new MatchstickGameDB();

/**
 * Storage service for game persistence
 */
export class GameStorageService {
  private static instance: GameStorageService;
  private isInitialized = false;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GameStorageService {
    if (!GameStorageService.instance) {
      GameStorageService.instance = new GameStorageService();
    }
    return GameStorageService.instance;
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    try {
      await db.open();
      this.isInitialized = true;
      
      // Clean up old analytics data (keep last 7 days)
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
      await db.analytics.where('timestamp').below(cutoff).delete();
      
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to initialize storage', { error }));
      throw error;
    }
  }

  /**
   * Save game state
   */
  async saveGame(
    gameState: GameState, 
    name?: string, 
    isAutoSave = false
  ): Promise<string> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const saveId = this.generateSaveId();
      const saveName = name || (isAutoSave ? `AutoSave_${new Date().toISOString()}` : `Save_${Date.now()}`);
      
      // Create checksum for data integrity
      const checksum = await this.createChecksum(gameState);
      
      const gameSave: GameSave = {
        id: saveId,
        name: saveName,
        gameState: this.sanitizeGameState(gameState),
        timestamp: Date.now(),
        version: gameState.metadata.version,
        checksum,
        isAutoSave
      };

      await db.saves.put(gameSave);
      
      // Clean up old auto-saves (keep last 5)
      if (isAutoSave) {
        await this.cleanupAutoSaves();
      }

      // Track save event
      await this.trackEvent('game_saved', { 
        saveId, 
        isAutoSave, 
        gamePhase: gameState.progression.currentPhase 
      });

      return saveId;
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to save game', { error, name, isAutoSave }));
      throw error;
    }
  }

  /**
   * Load game state
   */
  async loadGame(saveId: string): Promise<GameState | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const gameSave = await db.saves.get(saveId);
      if (!gameSave) {
        return null;
      }

      // Verify checksum if available
      if (gameSave.checksum) {
        const expectedChecksum = await this.createChecksum(gameSave.gameState);
        if (expectedChecksum !== gameSave.checksum) {
          errorHandler.handleError(createError.storage('Save file corrupted', { saveId }));
          return null;
        }
      }

      // Track load event
      await this.trackEvent('game_loaded', { 
        saveId, 
        version: gameSave.version,
        timeSinceSave: Date.now() - gameSave.timestamp
      });

      return gameSave.gameState;
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to load game', { error, saveId }));
      return null;
    }
  }

  /**
   * List all saved games
   */
  async listSaves(): Promise<Omit<GameSave, 'gameState'>[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const saves = await db.saves
        .orderBy('timestamp')
        .reverse()
        .toArray();

      return saves.map(save => ({
        id: save.id,
        name: save.name,
        timestamp: save.timestamp,
        version: save.version,
        checksum: save.checksum,
        isAutoSave: save.isAutoSave
      }));
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to list saves', { error }));
      return [];
    }
  }

  /**
   * Delete a saved game
   */
  async deleteSave(saveId: string): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const count = await db.saves.where('id').equals(saveId).count();
      if (count === 0) {
        return false;
      }
      
      await db.saves.delete(saveId);
      
      await this.trackEvent('game_deleted', { saveId });
      
      return true;
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to delete save', { error, saveId }));
      return false;
    }
  }

  /**
   * Save settings
   */
  async saveSetting(key: string, value: any): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const setting: StoredSettings = {
        id: key,
        key,
        value,
        timestamp: Date.now()
      };

      await db.settings.put(setting);
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to save setting', { error, key }));
    }
  }

  /**
   * Load setting
   */
  async loadSetting(key: string): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const setting = await db.settings.get(key);
      return setting?.value ?? null;
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to load setting', { error, key }));
      return null;
    }
  }

  /**
   * Save achievement progress
   */
  async saveAchievement(achievementId: string, progress: Record<string, any>): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const achievement: StoredAchievement = {
        id: achievementId,
        achievementId,
        unlockedAt: Date.now(),
        progress
      };

      await db.achievements.put(achievement);
      
      await this.trackEvent('achievement_unlocked', { achievementId });
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to save achievement', { error, achievementId }));
    }
  }

  /**
   * Load achievement progress
   */
  async loadAchievements(): Promise<StoredAchievement[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      return await db.achievements.toArray();
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to load achievements', { error }));
      return [];
    }
  }

  /**
   * Export game data for backup
   */
  async exportData(): Promise<string> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const saves = await db.saves.toArray();
      const settings = await db.settings.toArray();
      const achievements = await db.achievements.toArray();

      const exportData = {
        version: '1.0.0',
        exportedAt: Date.now(),
        saves,
        settings,
        achievements
      };

      return JSON.stringify(exportData, this.bigIntReplacer);
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to export data', { error }));
      throw error;
    }
  }

  /**
   * Import game data from backup
   */
  async importData(dataJson: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const data = JSON.parse(dataJson, this.bigIntReviver);
      
      // Validate import data structure
      if (!data.version || !data.saves) {
        throw new Error('Invalid import data format');
      }

      // Clear existing data (optional - could merge instead)
      await db.transaction('rw', [db.saves, db.settings, db.achievements], async () => {
        if (data.saves) {
          await db.saves.clear();
          await db.saves.bulkAdd(data.saves);
        }
        
        if (data.settings) {
          await db.settings.clear();
          await db.settings.bulkAdd(data.settings);
        }
        
        if (data.achievements) {
          await db.achievements.clear();
          await db.achievements.bulkAdd(data.achievements);
        }
      });

      await this.trackEvent('data_imported', { 
        saveCount: data.saves?.length || 0,
        settingCount: data.settings?.length || 0,
        achievementCount: data.achievements?.length || 0
      });
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to import data', { error }));
      throw error;
    }
  }

  /**
   * Clear all game data
   */
  async clearAllData(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await db.transaction('rw', [db.saves, db.settings, db.achievements, db.analytics], async () => {
        await db.saves.clear();
        await db.settings.clear(); 
        await db.achievements.clear();
        await db.analytics.clear();
      });

      await this.trackEvent('data_cleared', {});
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to clear data', { error }));
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    saves: number;
    settings: number;
    achievements: number;
    analytics: number;
    totalSize: number;
  }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const [saves, settings, achievements, analytics] = await Promise.all([
        db.saves.count(),
        db.settings.count(),
        db.achievements.count(),
        db.analytics.count()
      ]);

      // Estimate total size (rough calculation)
      const totalSize = await this.estimateStorageSize();

      return {
        saves,
        settings,
        achievements,
        analytics,
        totalSize
      };
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to get storage stats', { error }));
      return {
        saves: 0,
        settings: 0,
        achievements: 0,
        analytics: 0,
        totalSize: 0
      };
    }
  }

  /**
   * Private methods
   */
  private generateSaveId(): string {
    return `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createChecksum(gameState: GameState): Promise<string> {
    const data = JSON.stringify(gameState, this.bigIntReplacer);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private sanitizeGameState(gameState: GameState): GameState {
    // Ensure BigInt values are properly handled
    return JSON.parse(JSON.stringify(gameState, this.bigIntReplacer), this.bigIntReviver);
  }

  private bigIntReplacer(key: string, value: any): any {
    return typeof value === 'bigint' ? { __type: 'bigint', value: value.toString() } : value;
  }

  private bigIntReviver(key: string, value: any): any {
    return value && value.__type === 'bigint' ? BigInt(value.value) : value;
  }

  private async cleanupAutoSaves(): Promise<void> {
    const autoSaves = await db.saves
      .orderBy('timestamp')
      .reverse()
      .filter(save => save.isAutoSave)
      .toArray();

    if (autoSaves.length > 5) {
      const toDelete = autoSaves.slice(5);
      await db.saves.bulkDelete(toDelete.map((save: GameSave) => save.id));
    }
  }

  private async trackEvent(event: string, data: any): Promise<void> {
    try {
      const analytics: GameAnalytics = {
        id: `${event}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        event,
        data,
        timestamp: Date.now(),
        sessionId: this.sessionId
      };

      await db.analytics.add(analytics);
    } catch (error) {
      // Silent fail for analytics - don't interrupt game flow
      console.warn('Failed to track event:', event, error);
    }
  }

  private async estimateStorageSize(): Promise<number> {
    try {
      // Rough estimation by serializing a sample of data
      const sampleSave = await db.saves.limit(1).first();
      const sampleSettings = await db.settings.limit(10).toArray();
      const sampleAchievements = await db.achievements.limit(10).toArray();
      
      let estimatedSize = 0;
      
      if (sampleSave) {
        const saveSize = JSON.stringify(sampleSave).length;
        const saveCount = await db.saves.count();
        estimatedSize += saveSize * saveCount;
      }
      
      if (sampleSettings.length > 0) {
        const settingsSize = JSON.stringify(sampleSettings).length;
        estimatedSize += settingsSize;
      }

      if (sampleAchievements.length > 0) {
        const achievementsSize = JSON.stringify(sampleAchievements).length;
        estimatedSize += achievementsSize;
      }

      // Ensure we return at least some positive value when we have data
      const [totalSaves, totalSettings, totalAchievements] = await Promise.all([
        db.saves.count(),
        db.settings.count(),
        db.achievements.count()
      ]);

      if (totalSaves > 0 || totalSettings > 0 || totalAchievements > 0) {
        estimatedSize = Math.max(estimatedSize, 100); // Minimum size estimate
      }

      return estimatedSize;
    } catch (error) {
      return 0;
    }
  }
}

// Export singleton instance
export const storageService = GameStorageService.getInstance(); 
