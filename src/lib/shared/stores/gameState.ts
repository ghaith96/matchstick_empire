import { writable, derived, get } from 'svelte/store';
import type { 
  GameState, 
  ResourceState, 
  ProductionState, 
  MarketState,
  AutomationState,
  AchievementState,
  GameEvent
} from '../types/index.js';
import { SafeBigInt } from '../utils/numbers.js';
import { createError, errorHandler } from '../utils/errors.js';

/**
 * Type for partial game state updates
 */
type GameStateUpdate = {
  resources?: Partial<ResourceState>;
  production?: Partial<ProductionState>;
  market?: Partial<MarketState>;
  automation?: Partial<AutomationState>;
  [key: string]: any;
};

/**
 * Create minimal initial game state that matches our types exactly
 */
function createInitialGameState(): GameState {
  const now = Date.now();
  
  return {
    resources: {
      matchsticks: 0n,
      money: 0,
      wood: 0,
      reputation: 0
    },
    production: {
      manualRate: 1,
      automatedRate: 0,
      multipliers: {},
      lastUpdate: now,
      totalProduced: 0n
    },
    market: {
      currentPrice: 1,
      basePrice: 1,
      priceHistory: [],
      condition: {
        priceMultiplier: 1,
        demandLevel: 'normal',
        trend: 'stable',
        duration: 0,
        description: 'Normal market conditions'
      },
      autoSellEnabled: false,
      autoSellThreshold: 100,
      totalSold: 0n,
      totalRevenue: 0
    },
    automation: {
      autoClickers: [],
      autoSellEnabled: false,
      autoSellSettings: {
        enabled: false,
        threshold: 100,
        maxPercentage: 50,
        priceThreshold: 0.5,
        smartSelling: false
      },
      multipliers: [],
      totalMoneySpent: 0,
      lastUpdate: now
    },
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
    },
    progression: {
      currentPhase: 'manual',
      unlockedFeatures: ['manual_production'],
      completedTutorials: [],
      milestones: [],
      worldConversionProgress: 0,
      prestigeLevel: 0
    },
    tutorial: {
      currentStep: 0,
      completedTutorials: [],
      skippedTutorials: [],
      isActive: true
    },
    settings: {
      theme: 'light',
      soundEnabled: true,
      musicEnabled: true,
      hapticEnabled: true,
      animations: {
        enabled: true,
        reducedMotion: false,
        particleEffects: true,
        transitionSpeed: 'normal'
      },
      notifications: {
        enabled: true,
        achievements: true,
        milestones: true,
        marketAlerts: true,
        production: true,
        sound: true
      },
      accessibility: {
        highContrast: false,
        screenReader: false,
        keyboardNavigation: true,
        largeText: false,
        colorBlindFriendly: false
      },
      language: 'en',
      autoSave: true,
      saveInterval: 30000
    },
    easterEggs: {
      discovered: [],
      sequences: [],
      totalFound: 0
    },
    metadata: {
      version: '1.0.0',
      createdAt: now,
      lastSaved: now,
      totalPlayTime: 0,
      sessionStartTime: now,
      playerId: '1',
      gameSpeed: 1,
      debugMode: false
    }
  };
}

/**
 * Main game state store
 */
export const gameState = writable<GameState>(createInitialGameState());

/**
 * Individual stores for each state section (for performance and modularity)
 */
export const resources = derived(gameState, ($state) => $state.resources);
export const production = derived(gameState, ($state) => $state.production);
export const market = derived(gameState, ($state) => $state.market);
export const automation = derived(gameState, ($state) => $state.automation);
export const achievements = derived(gameState, ($state) => $state.achievements);
export const progression = derived(gameState, ($state) => $state.progression);
export const tutorial = derived(gameState, ($state) => $state.tutorial);
export const settings = derived(gameState, ($state) => $state.settings);
export const easterEggs = derived(gameState, ($state) => $state.easterEggs);
export const metadata = derived(gameState, ($state) => $state.metadata);

/**
 * Event bus for game events
 */
export const gameEvents = writable<GameEvent[]>([]);

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Game state actions
 */
export const gameActions = {
  /**
   * Reset game to initial state
   */
  reset(): void {
    try {
      gameState.set(createInitialGameState());
      gameEvents.set([]);
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to reset game state', { error }));
    }
  },

  /**
   * Load game state from data
   */
  load(data: GameStateUpdate | GameState): void {
    try {
      gameState.update(current => {
        // If it's a full GameState (has all required properties), use it directly
        if ('metadata' in data && 'resources' in data && 'production' in data && 'market' in data) {
          const fullState = data as GameState;
          return validateAndSanitizeState(fullState);
        }
        
        // Otherwise treat as partial update
        const partialData = data as GameStateUpdate;
        const newState = { 
          ...current,
          ...(partialData.resources && { resources: { ...current.resources, ...partialData.resources } }),
          ...(partialData.production && { production: { ...current.production, ...partialData.production } }),
          ...(partialData.market && { market: { ...current.market, ...partialData.market } }),
          ...(partialData.automation && { automation: { ...current.automation, ...partialData.automation } })
        };
        return validateAndSanitizeState(newState);
      });
      
      // Emit load event
      gameActions.emitEvent({
        id: generateEventId(),
        type: 'state_loaded',
        timestamp: Date.now(),
        data: { success: true },
        source: 'game_system'
      });
    } catch (error) {
      errorHandler.handleError(createError.storage('Failed to load game state', { error, data }));
    }
  },

  /**
   * Update resources safely
   */
  updateResources(updates: Partial<ResourceState>): void {
    try {
      gameState.update(current => ({
        ...current,
        resources: {
          ...current.resources,
          ...updates,
          // Ensure BigInt values are safe
          matchsticks: updates.matchsticks ? 
            SafeBigInt.isSafe(updates.matchsticks) ? updates.matchsticks : current.resources.matchsticks 
            : current.resources.matchsticks
        }
      }));
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to update resources', { error, updates }));
    }
  },

  /**
   * Add resources safely
   */
  addResources(additions: Partial<ResourceState>): void {
    try {
      gameState.update(current => ({
        ...current,
        resources: {
          matchsticks: additions.matchsticks ? 
            SafeBigInt.add(current.resources.matchsticks, additions.matchsticks) 
            : current.resources.matchsticks,
          money: current.resources.money + (additions.money || 0),
          wood: current.resources.wood + (additions.wood || 0),
          reputation: current.resources.reputation + (additions.reputation || 0)
        }
      }));
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to add resources', { error, additions }));
    }
  },

  /**
   * Subtract resources safely (with validation)
   */
  subtractResources(subtractions: Partial<ResourceState>): boolean {
    try {
      const current = get(gameState);
      
      // Check if we have enough resources
      if (subtractions.matchsticks && SafeBigInt.compare(current.resources.matchsticks, subtractions.matchsticks) < 0) {
        return false;
      }
      if (subtractions.money && current.resources.money < subtractions.money) {
        return false;
      }
      if (subtractions.wood && current.resources.wood < subtractions.wood) {
        return false;
      }
      if (subtractions.reputation && current.resources.reputation < subtractions.reputation) {
        return false;
      }

      // Perform subtraction
      gameState.update(state => ({
        ...state,
        resources: {
          matchsticks: subtractions.matchsticks ? 
            SafeBigInt.subtract(state.resources.matchsticks, subtractions.matchsticks) 
            : state.resources.matchsticks,
          money: state.resources.money - (subtractions.money || 0),
          wood: state.resources.wood - (subtractions.wood || 0),
          reputation: state.resources.reputation - (subtractions.reputation || 0)
        }
      }));
      
      return true;
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to subtract resources', { error, subtractions }));
      return false;
    }
  },

  /**
   * Update production state
   */
  updateProduction(updates: Partial<ProductionState>): void {
    try {
      gameState.update(current => ({
        ...current,
        production: {
          ...current.production,
          ...updates,
          lastUpdate: Date.now()
        }
      }));
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to update production', { error, updates }));
    }
  },

  /**
   * Update market state
   */
  updateMarket(updates: Partial<MarketState>): void {
    try {
      gameState.update(current => ({
        ...current,
        market: {
          ...current.market,
          ...updates
        }
      }));
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to update market', { error, updates }));
    }
  },

  /**
   * Emit a game event
   */
  emitEvent(event: GameEvent): void {
    try {
      gameEvents.update(events => {
        const newEvents = [event, ...events];
        // Keep only the last 100 events for performance
        return newEvents.slice(0, 100);
      });
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to emit event', { error, event }));
    }
  },

  /**
   * Clear all events
   */
  clearEvents(): void {
    gameEvents.set([]);
  },

  /**
   * Produce matchsticks manually
   */
  produceMatchsticks(amount: number = 1): void {
    try {
      const current = get(gameState);
      const actualAmount = BigInt(Math.floor(amount * current.production.manualRate));
      
      gameActions.addResources({ matchsticks: actualAmount });
      gameActions.updateProduction({ 
        totalProduced: SafeBigInt.add(current.production.totalProduced, actualAmount) 
      });
      
      // Emit production event
      gameActions.emitEvent({
        id: generateEventId(),
        type: 'matchsticks_produced',
        timestamp: Date.now(),
        data: { amount: actualAmount, method: 'manual' },
        source: 'production_system'
      });
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to produce matchsticks', { error, amount }));
    }
  },

  /**
   * Sell matchsticks
   */
  sellMatchsticks(amount: bigint): boolean {
    try {
      const current = get(gameState);
      
      // Check if we have enough matchsticks
      if (SafeBigInt.compare(current.resources.matchsticks, amount) < 0) {
        return false;
      }
      
      const revenue = Number(amount) * current.market.currentPrice;
      
      // Perform transaction
      if (gameActions.subtractResources({ matchsticks: amount })) {
        gameActions.addResources({ money: revenue });
        gameActions.updateMarket({ 
          totalSold: SafeBigInt.add(current.market.totalSold, amount),
          totalRevenue: current.market.totalRevenue + revenue
        });
        
        // Emit sale event
        gameActions.emitEvent({
          id: generateEventId(),
          type: 'matchsticks_sold',
          timestamp: Date.now(),
          data: { amount, revenue, price: current.market.currentPrice },
          source: 'market_system'
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to sell matchsticks', { error, amount }));
      return false;
    }
  },

  /**
   * Update automation state
   */
  updateAutomation(updates: Partial<AutomationState>): void {
    try {
      gameState.update(current => ({
        ...current,
        automation: {
          ...current.automation,
          ...updates
        }
      }));
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to update automation', { error, updates }));
    }
  },

  /**
   * Update achievements state
   */
  updateAchievements(updates: Partial<AchievementState>): void {
    try {
      gameState.update(current => ({
        ...current,
        achievements: {
          ...current.achievements,
          ...updates
        }
      }));
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to update achievements', { error, updates }));
    }
  }
};

/**
 * Computed derived stores for common calculations
 */
export const computedStores = {
  /**
   * Total production rate per second
   */
  totalProductionRate: derived(
    [production, automation],
    ([$production, $automation]) => {
      try {
        const manualRate = $production.manualRate;
        const automatedRate = $production.automatedRate;
        const multipliers = Object.values($production.multipliers).reduce((sum, mult) => sum + mult, 1);
        
        return (manualRate + automatedRate) * multipliers;
      } catch (error) {
        errorHandler.handleError(createError.gameLogic('Failed to calculate production rate', { error }));
        return 0;
      }
    }
  ),

  /**
   * Net worth calculation
   */
  netWorth: derived(
    [resources, market],
    ([$resources, $market]) => {
      try {
        const matchstickValue = Number($resources.matchsticks) * $market.currentPrice;
        return $resources.money + matchstickValue + ($resources.wood * 10) + ($resources.reputation * 5);
      } catch (error) {
        errorHandler.handleError(createError.gameLogic('Failed to calculate net worth', { error }));
        return 0;
      }
    }
  ),

  /**
   * Check if tutorial should be active
   */
  shouldShowTutorial: derived(
    [tutorial, progression],
    ([$tutorial, $progression]) => {
      return $tutorial.isActive && $progression.currentPhase === 'manual';
    }
  )
};

/**
 * Validate and sanitize loaded game state
 */
function validateAndSanitizeState(state: GameState): GameState {
  try {
    // Ensure all required properties exist
    const sanitized: GameState = {
      ...createInitialGameState(),
      ...state
    };

    // Validate BigInt values
    if (typeof sanitized.resources.matchsticks === 'string') {
      sanitized.resources.matchsticks = BigInt(sanitized.resources.matchsticks);
    }
    if (!SafeBigInt.isSafe(sanitized.resources.matchsticks)) {
      sanitized.resources.matchsticks = 0n;
    }

    // Validate numeric values
    sanitized.resources.money = Math.max(0, sanitized.resources.money || 0);
    sanitized.resources.wood = Math.max(0, sanitized.resources.wood || 0);
    sanitized.resources.reputation = Math.max(0, sanitized.resources.reputation || 0);

    // Validate timestamps
    sanitized.metadata.lastSaved = sanitized.metadata.lastSaved || Date.now();
    sanitized.metadata.createdAt = sanitized.metadata.createdAt || Date.now();
    sanitized.metadata.sessionStartTime = Date.now(); // Always update session start

    return sanitized;
  } catch (error) {
    errorHandler.handleError(createError.gameLogic('Failed to validate game state', { error }));
    return createInitialGameState();
  }
}

/**
 * Performance monitoring
 */
export const performanceMonitor = {
  stateUpdateCount: 0,
  lastUpdateTime: Date.now(),
  
  trackUpdate() {
    this.stateUpdateCount++;
    this.lastUpdateTime = Date.now();
  },
  
  getStats() {
    return {
      updateCount: this.stateUpdateCount,
      lastUpdate: this.lastUpdateTime,
      updatesPerMinute: this.stateUpdateCount / ((Date.now() - this.lastUpdateTime) / 60000)
    };
  }
};

// Track state updates for performance monitoring
gameState.subscribe(() => {
  performanceMonitor.trackUpdate();
}); 
