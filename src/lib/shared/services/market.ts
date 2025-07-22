import { get } from 'svelte/store';
import { gameState, gameActions } from '../stores/gameState.js';
import type { MarketCondition, PriceHistoryEntry } from '../types/index.js';
import { SafeBigInt } from '../utils/numbers.js';
import { createError, errorHandler } from '../utils/errors.js';
import { achievementService } from './achievements.js';

/**
 * Market event for price changes and conditions
 */
export interface MarketEvent {
  id: string;
  type: 'price_change' | 'condition_change' | 'trade_executed' | 'market_crash' | 'market_boom';
  timestamp: number;
  data: any;
  priceChange?: number;
  newPrice?: number;
  previousPrice?: number;
}

/**
 * Trade transaction record
 */
export interface TradeTransaction {
  id: string;
  timestamp: number;
  matchsticksSold: bigint;
  pricePerUnit: number;
  totalRevenue: number;
  marketCondition: string;
  playerCash: number;
  marketShare: number;
}

/**
 * Market analysis data
 */
export interface MarketAnalysis {
  currentPrice: number;
  priceHistory: PriceHistoryEntry[];
  trend: 'rising' | 'falling' | 'stable';
  volatility: number;
  resistance: number; // price ceiling
  support: number; // price floor
  marketCap: number;
  averageVolume: bigint;
  recommendation: 'buy' | 'sell' | 'hold';
}

/**
 * Market conditions that affect pricing
 */
export interface MarketConditionConfig {
  id: string;
  name: string;
  description: string;
  priceMultiplier: number;
  demandLevel: 'low' | 'normal' | 'high' | 'peak';
  duration: number; // in milliseconds
  probability: number; // 0-1 chance of occurring
  triggers: string[]; // events that can trigger this condition
}

/**
 * Market service for trading matchsticks
 */
export class MarketService {
  private static instance: MarketService;
  private priceUpdateInterval: number | null = null;
  private conditionCheckInterval: number | null = null;
  private recentTrades: TradeTransaction[] = [];
  private marketAnalysisCache: MarketAnalysis | null = null;
  private lastAnalysisTime: number = 0;

  // Market configuration
  private readonly baseVolatility = 0.02; // 2% base price volatility
  private readonly maxVolatility = 0.15; // 15% max price swing
  private readonly priceUpdateFrequency = 5000; // 5 seconds
  private readonly conditionCheckFrequency = 30000; // 30 seconds
  private readonly maxPriceHistory = 100; // Keep last 100 price points

  // Predefined market conditions
  private readonly marketConditions: MarketConditionConfig[] = [
    {
      id: 'recession',
      name: 'Economic Recession',
      description: 'Demand for luxury items like matchsticks decreases',
      priceMultiplier: 0.7,
      demandLevel: 'low',
      duration: 120000, // 2 minutes
      probability: 0.05,
      triggers: ['market_crash', 'oversupply']
    },
    {
      id: 'boom',
      name: 'Economic Boom',
      description: 'High demand for all goods including matchsticks',
      priceMultiplier: 1.4,
      demandLevel: 'high',
      duration: 90000, // 1.5 minutes
      probability: 0.08,
      triggers: ['market_boom', 'shortage']
    },
    {
      id: 'winter_season',
      name: 'Winter Season',
      description: 'Cold weather increases demand for fire-making tools',
      priceMultiplier: 1.2,
      demandLevel: 'high',
      duration: 180000, // 3 minutes
      probability: 0.12,
      triggers: ['seasonal', 'weather']
    },
    {
      id: 'fire_ban',
      name: 'Fire Safety Restrictions',
      description: 'Government restrictions reduce matchstick demand',
      priceMultiplier: 0.6,
      demandLevel: 'low',
      duration: 150000, // 2.5 minutes
      probability: 0.03,
      triggers: ['regulation', 'safety']
    },
    {
      id: 'festival',
      name: 'Festival Season',
      description: 'Celebrations and events drive up matchstick demand',
      priceMultiplier: 1.3,
      demandLevel: 'peak',
      duration: 60000, // 1 minute
      probability: 0.1,
      triggers: ['seasonal', 'celebration']
    }
  ];

  private constructor() {
    this.startMarketSimulation();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MarketService {
    if (!MarketService.instance) {
      MarketService.instance = new MarketService();
    }
    return MarketService.instance;
  }

  /**
   * Sell matchsticks at current market price
   */
  sellMatchsticks(amount: bigint): {
    success: boolean;
    revenue: number;
    pricePerUnit: number;
    remainingMatchsticks: bigint;
    marketShare: number;
    transaction?: TradeTransaction;
  } {
    try {
      const currentState = get(gameState);
      const availableMatchsticks = currentState.resources.matchsticks;

      // Validate amount
      if (amount <= 0n) {
        throw new Error('Amount must be greater than 0');
      }

      if (amount > availableMatchsticks) {
        throw new Error('Insufficient matchsticks');
      }

      // Get current market price
      const pricePerUnit = this.getCurrentPrice();
      
      // Apply market impact (large sales can affect price)
      const marketImpactMultiplier = this.calculateMarketImpact(amount);
      const effectivePrice = pricePerUnit * marketImpactMultiplier;
      
      // Calculate revenue
      const revenue = Number(amount) * effectivePrice;
      
      // Execute trade
      const success = gameActions.sellMatchsticks(amount);
      
      if (!success) {
        return {
          success: false,
          revenue: 0,
          pricePerUnit,
          remainingMatchsticks: availableMatchsticks,
          marketShare: 0
        };
      }

      // Add revenue to player's money
      gameActions.addResources({ money: revenue });

      // Update market statistics
      const updatedState = get(gameState);
      const newTotalSold = SafeBigInt.add(updatedState.market.totalSold, amount);
      const newTotalRevenue = updatedState.market.totalRevenue + revenue;
      
      gameActions.updateMarket({
        totalSold: newTotalSold,
        totalRevenue: newTotalRevenue
      });

      // Create transaction record
      const transaction: TradeTransaction = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: Date.now(),
        matchsticksSold: amount,
        pricePerUnit: effectivePrice,
        totalRevenue: revenue,
        marketCondition: currentState.market.condition?.description || 'Normal',
        playerCash: updatedState.resources.money,
        marketShare: this.calculateMarketShare(newTotalSold)
      };

      // Track recent trades
      this.recentTrades.unshift(transaction);
      if (this.recentTrades.length > 50) {
        this.recentTrades = this.recentTrades.slice(0, 50);
      }

      // Update price based on trade volume
      this.updatePriceAfterTrade(amount, effectivePrice);

      // Emit market event
      gameActions.emitEvent({
        id: `trade_${Date.now()}`,
        type: 'trade_executed',
        timestamp: Date.now(),
        data: {
          amount,
          revenue,
          pricePerUnit: effectivePrice,
          marketShare: transaction.marketShare
        },
        source: 'market_service'
      });

      // Check for achievements using centralized service
      achievementService.checkAchievements();

      return {
        success: true,
        revenue,
        pricePerUnit: effectivePrice,
        remainingMatchsticks: updatedState.resources.matchsticks,
        marketShare: transaction.marketShare,
        transaction
      };

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to sell matchsticks', { 
        error, 
        amount: amount.toString() 
      }));
      
      const currentState = get(gameState);
      return {
        success: false,
        revenue: 0,
        pricePerUnit: this.getCurrentPrice(),
        remainingMatchsticks: currentState.resources.matchsticks,
        marketShare: 0
      };
    }
  }

  /**
   * Get current market price
   */
  getCurrentPrice(): number {
    try {
      const currentState = get(gameState);
      return currentState.market.currentPrice;
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to get current price', { error }));
      return 1; // Fallback price
    }
  }

  /**
   * Get market analysis
   */
  getMarketAnalysis(): MarketAnalysis {
    const now = Date.now();
    
    // Use cached analysis if recent (within 10 seconds)
    if (this.marketAnalysisCache && (now - this.lastAnalysisTime) < 10000) {
      return this.marketAnalysisCache;
    }

    try {
      const currentState = get(gameState);
      const currentPrice = currentState.market.currentPrice;
      const priceHistory = currentState.market.priceHistory;

      // Calculate trend
      const trend = this.calculateTrend(priceHistory);
      
      // Calculate volatility
      const volatility = this.calculateVolatility(priceHistory);
      
      // Calculate support and resistance
      const { support, resistance } = this.calculateSupportResistance(priceHistory);
      
      // Calculate average volume
      const averageVolume = this.calculateAverageVolume();
      
      // Generate recommendation
      const recommendation = this.generateRecommendation(currentPrice, trend, volatility, support, resistance);

      this.marketAnalysisCache = {
        currentPrice,
        priceHistory,
        trend,
        volatility,
        resistance,
        support,
        marketCap: currentPrice * Number(currentState.market.totalSold || 0n),
        averageVolume,
        recommendation
      };

      this.lastAnalysisTime = now;
      return this.marketAnalysisCache;

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to generate market analysis', { error }));
      
      // Fallback analysis
      return {
        currentPrice: this.getCurrentPrice(),
        priceHistory: [],
        trend: 'stable',
        volatility: 0,
        resistance: 0,
        support: 0,
        marketCap: 0,
        averageVolume: 0n,
        recommendation: 'hold'
      };
    }
  }

  /**
   * Get recent trade history
   */
  getRecentTrades(limit: number = 10): TradeTransaction[] {
    return this.recentTrades.slice(0, limit);
  }

  /**
   * Get market conditions
   */
  getAvailableConditions(): MarketConditionConfig[] {
    return [...this.marketConditions];
  }

  /**
   * Trigger a specific market condition (for testing/events)
   */
  triggerMarketCondition(conditionId: string): boolean {
    try {
      const condition = this.marketConditions.find(c => c.id === conditionId);
      if (!condition) {
        return false;
      }

      this.applyMarketCondition(condition);
      return true;
    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to trigger market condition', { 
        error, 
        conditionId 
      }));
      return false;
    }
  }

  /**
   * Stop market simulation
   */
  stopSimulation(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
    if (this.conditionCheckInterval) {
      clearInterval(this.conditionCheckInterval);
      this.conditionCheckInterval = null;
    }
  }

  /**
   * Private methods
   */
  private startMarketSimulation(): void {
    // Start price updates
    this.priceUpdateInterval = setInterval(() => {
      this.updateMarketPrice();
    }, this.priceUpdateFrequency) as any;

    // Start condition checks
    this.conditionCheckInterval = setInterval(() => {
      this.checkForMarketConditions();
    }, this.conditionCheckFrequency) as any;
  }

  private updateMarketPrice(): void {
    try {
      const currentState = get(gameState);
      const currentPrice = currentState.market.currentPrice;
      const basePrice = currentState.market.basePrice;
      
      // Get current condition multiplier
      const conditionMultiplier = currentState.market.condition?.priceMultiplier || 1;
      
      // Calculate volatility based on market conditions
      let volatility = this.baseVolatility;
      if (currentState.market.condition) {
        volatility *= (1 + Math.abs(conditionMultiplier - 1));
      }
      
      // Generate price change
      const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
      const priceChange = currentPrice * volatility * randomFactor;
      
      // Apply condition multiplier to base price
      const targetPrice = basePrice * conditionMultiplier;
      
      // Move toward target price with some randomness
      const pullToTarget = (targetPrice - currentPrice) * 0.1; // 10% pull toward target
      const newPrice = Math.max(0.1, currentPrice + priceChange + pullToTarget);
      
      // Update price history
      const updatedHistory = [...currentState.market.priceHistory];
      updatedHistory.push({
        timestamp: Date.now(),
        price: newPrice,
        volume: 0,
        condition: currentState.market.condition?.description || 'Normal'
      });
      
      // Keep only recent history
      if (updatedHistory.length > this.maxPriceHistory) {
        updatedHistory.shift();
      }
      
      // Update market state
      gameActions.updateMarket({
        currentPrice: newPrice,
        priceHistory: updatedHistory
      });

      // Emit price change event
      gameActions.emitEvent({
        id: `price_change_${Date.now()}`,
        type: 'price_change',
        timestamp: Date.now(),
        data: {
          previousPrice: currentPrice,
          newPrice,
          change: newPrice - currentPrice,
          changePercent: ((newPrice - currentPrice) / currentPrice) * 100
        },
        source: 'market_service'
      });

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to update market price', { error }));
    }
  }

  private checkForMarketConditions(): void {
    try {
      const currentState = get(gameState);
      
      // Check if current condition has expired
      if (currentState.market.condition) {
        // For now, let conditions expire after their duration
        // This is a simplified check - in a real implementation,
        // we'd track condition start times separately
        const shouldExpire = Math.random() < 0.1; // 10% chance to expire each check
        if (shouldExpire) {
          this.clearMarketCondition();
          return;
        }
      }

      // Don't apply new condition if one is already active
      if (currentState.market.condition) {
        return;
      }

      // Check for new conditions
      for (const condition of this.marketConditions) {
        if (Math.random() < condition.probability) {
          this.applyMarketCondition(condition);
          break; // Only apply one condition at a time
        }
      }

    } catch (error) {
      errorHandler.handleError(createError.gameLogic('Failed to check market conditions', { error }));
    }
  }

  private applyMarketCondition(config: MarketConditionConfig): void {
    const condition: MarketCondition = {
      priceMultiplier: config.priceMultiplier,
      demandLevel: config.demandLevel,
      trend: config.priceMultiplier > 1 ? 'rising' : 'falling',
      duration: config.duration,
      description: config.name
    };

    gameActions.updateMarket({ condition });

    // Emit condition change event
    gameActions.emitEvent({
      id: `condition_${config.id}_${Date.now()}`,
      type: 'condition_change',
      timestamp: Date.now(),
      data: {
        conditionId: config.id,
        name: config.name,
        description: config.description,
        priceMultiplier: config.priceMultiplier,
        duration: config.duration
      },
      source: 'market_service'
    });
  }

  private clearMarketCondition(): void {
    gameActions.updateMarket({ condition: undefined });
    
    gameActions.emitEvent({
      id: `condition_cleared_${Date.now()}`,
      type: 'condition_change',
      timestamp: Date.now(),
      data: { cleared: true },
      source: 'market_service'
    });
  }

  private calculateMarketImpact(amount: bigint): number {
    // Large sales create downward pressure on price
    const amountNumber = Number(amount);
    const impactThreshold = 1000; // Sales above this create price impact
    
    if (amountNumber <= impactThreshold) {
      return 1; // No impact
    }
    
    const excessAmount = amountNumber - impactThreshold;
    const impactFactor = Math.min(0.2, excessAmount / 10000); // Max 20% impact
    
    return 1 - impactFactor;
  }

  private updatePriceAfterTrade(amount: bigint, price: number): void {
    const amountNumber = Number(amount);
    
    // Small price adjustment based on trade size
    const priceImpact = Math.min(0.05, amountNumber / 5000); // Max 5% immediate impact
    const newPrice = price * (1 - priceImpact);
    
    gameActions.updateMarket({ currentPrice: Math.max(0.1, newPrice) });
  }

  private calculateMarketShare(totalSold: bigint): number {
    // Simplified market share calculation
    const totalMarketSize = 1000000; // Assume 1M total market
    return Math.min(100, (Number(totalSold) / totalMarketSize) * 100);
  }

  private calculateTrend(priceHistory: Array<{ timestamp: number; price: number }>): 'rising' | 'falling' | 'stable' {
    if (priceHistory.length < 5) return 'stable';
    
    const recent = priceHistory.slice(-5);
    const firstPrice = recent[0].price;
    const lastPrice = recent[recent.length - 1].price;
    const change = (lastPrice - firstPrice) / firstPrice;
    
    if (change > 0.02) return 'rising';
    if (change < -0.02) return 'falling';
    return 'stable';
  }

  private calculateVolatility(priceHistory: Array<{ timestamp: number; price: number }>): number {
    if (priceHistory.length < 10) return 0;
    
    const recent = priceHistory.slice(-20);
    const prices = recent.map(h => h.price);
    const mean = prices.reduce((a, b) => a + b) / prices.length;
    const variance = prices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / prices.length;
    
    return Math.sqrt(variance) / mean;
  }

  private calculateSupportResistance(priceHistory: Array<{ timestamp: number; price: number }>): {
    support: number;
    resistance: number;
  } {
    if (priceHistory.length < 20) return { support: 0, resistance: 0 };
    
    const recent = priceHistory.slice(-50);
    const prices = recent.map(h => h.price);
    
    const support = Math.min(...prices);
    const resistance = Math.max(...prices);
    
    return { support, resistance };
  }

  private calculateAverageVolume(): bigint {
    if (this.recentTrades.length === 0) return 0n;
    
    const totalVolume = this.recentTrades.reduce((acc, trade) => 
      SafeBigInt.add(acc, trade.matchsticksSold), 0n);
    
    return totalVolume / BigInt(this.recentTrades.length);
  }

  private generateRecommendation(
    currentPrice: number,
    trend: 'rising' | 'falling' | 'stable',
    volatility: number,
    support: number,
    resistance: number
  ): 'buy' | 'sell' | 'hold' {
    // Simple recommendation logic
    if (trend === 'rising' && currentPrice < resistance * 0.9) return 'buy';
    if (trend === 'falling' && currentPrice > support * 1.1) return 'sell';
    if (volatility > 0.1) return 'hold'; // Too volatile
    
    return 'hold';
  }


}

// Export singleton instance
export const marketService = MarketService.getInstance(); 
