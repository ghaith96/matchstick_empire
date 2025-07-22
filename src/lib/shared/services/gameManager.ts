/**
 * Game Manager Service
 * Handles game initialization, auto-save, and basic lifecycle management
 */

import { get } from 'svelte/store';
import { gameState, gameActions } from '../stores/gameState.js';
import { GameStorageService } from './index.js';

const gameStorageService = GameStorageService.getInstance();

export interface GameManagerConfig {
  autoSaveInterval: number; // milliseconds
  enableAutoSave: boolean;
  debugMode: boolean;
}

class GameManager {
  private static instance: GameManager;
  private autoSaveInterval: number | null = null;
  private config: GameManagerConfig;
  private initialized = false;

  private constructor() {
    this.config = {
      autoSaveInterval: 30000, // 30 seconds
      enableAutoSave: true,
      debugMode: false
    };
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  /**
   * Initialize the game system
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🎮 Initializing Matchstick Empire...');

      // Initialize storage service
      await gameStorageService.initialize();

      // Initialize new game if no existing state
      const currentState = get(gameState);
      if (!currentState.metadata.version) {
        this.initializeNewGame();
        console.log('🆕 New game initialized');
      }

      // Setup auto-save
      if (this.config.enableAutoSave) {
        this.startAutoSave();
      }

      this.initialized = true;
      console.log('🚀 Game initialization complete');
      
    } catch (error) {
      console.error('❌ Failed to initialize game:', error);
      
      // Fallback to new game
      this.initializeNewGame();
      this.initialized = true;
    }
  }

  /**
   * Initialize a new game with default values
   */
  private initializeNewGame(): void {
    gameActions.reset();
    
    // Emit new game event
    gameActions.emitEvent({
      id: `new_game_${Date.now()}`,
      type: 'new_game_started',
      timestamp: Date.now(),
      data: {},
      source: 'game_manager'
    });
  }

  /**
   * Start auto-save system
   */
  private startAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(async () => {
      await this.saveGame('auto-save');
    }, this.config.autoSaveInterval) as any;

    if (this.config.debugMode) {
      console.log(`💾 Auto-save enabled (${this.config.autoSaveInterval / 1000}s interval)`);
    }
  }

  /**
   * Stop auto-save system
   */
  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Save the current game state
   */
  public async saveGame(name?: string): Promise<boolean> {
    try {
      if (!this.initialized) {
        console.warn('Cannot save: Game not initialized');
        return false;
      }

      const currentState = get(gameState);
      const saveName = name || `Save ${new Date().toLocaleString()}`;
      
      const result = await gameStorageService.saveGame(currentState, saveName);
      
      if (typeof result === 'string') {
        // Success - got save ID
        if (this.config.debugMode) {
          console.log('💾 Game saved:', saveName);
        }
        
        // Emit save event
        gameActions.emitEvent({
          id: `game_saved_${Date.now()}`,
          type: 'game_saved',
          timestamp: Date.now(),
          data: { saveName, saveId: result },
          source: 'game_manager'
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to save game:', error);
      return false;
    }
  }

  /**
   * Load a specific game save
   */
  public async loadGame(saveId: string): Promise<boolean> {
    try {
      const result = await gameStorageService.loadGame(saveId);
      
      if (result) {
        gameActions.load(result);
        console.log('✅ Game loaded from save:', saveId);
        
        // Emit load event
        gameActions.emitEvent({
          id: `game_loaded_${Date.now()}`,
          type: 'game_loaded',
          timestamp: Date.now(),
          data: { saveId },
          source: 'game_manager'
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to load game:', error);
      return false;
    }
  }

  /**
   * Reset the game to initial state
   */
  public async resetGame(): Promise<void> {
    try {
      this.initializeNewGame();
      console.log('🔄 Game reset to initial state');
      
      // Emit reset event
      gameActions.emitEvent({
        id: `game_reset_${Date.now()}`,
        type: 'game_reset',
        timestamp: Date.now(),
        data: {},
        source: 'game_manager'
      });
      
    } catch (error) {
      console.error('❌ Failed to reset game:', error);
    }
  }

  /**
   * Shutdown the game manager
   */
  public shutdown(): void {
    if (this.config.debugMode) {
      console.log('🛑 Shutting down Game Manager...');
    }
    
    // Save current game
    this.saveGame('shutdown-save');
    
    // Stop auto-save
    this.stopAutoSave();
    
    this.initialized = false;
    
    if (this.config.debugMode) {
      console.log('👋 Game Manager shutdown complete');
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<GameManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart auto-save if interval changed
    if (newConfig.autoSaveInterval !== undefined || newConfig.enableAutoSave !== undefined) {
      this.stopAutoSave();
      if (this.config.enableAutoSave) {
        this.startAutoSave();
      }
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): GameManagerConfig {
    return { ...this.config };
  }

  /**
   * Check if game is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get list of available saves
   */
  public async getSaves() {
    try {
      return await gameStorageService.listSaves();
    } catch (error) {
      console.error('❌ Failed to get saves:', error);
      return [];
    }
  }

  /**
   * Delete a save
   */
  public async deleteSave(saveId: string): Promise<boolean> {
    try {
      await gameStorageService.deleteSave(saveId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete save:', error);
      return false;
    }
  }
}

// Create and export singleton instance
export const gameManager = GameManager.getInstance();

// Setup browser event handlers
if (typeof window !== 'undefined') {
  // Save on page unload
  window.addEventListener('beforeunload', () => {
    gameManager.shutdown();
  });

  // Save on visibility change (tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      gameManager.saveGame('tab-hidden-save');
    }
  });
} 
