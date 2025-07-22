// Market state for tracking prices and sales
export interface MarketState {
  currentPrice: number;
  basePrice: number;
  priceHistory: PriceHistoryEntry[];
  condition: MarketCondition;
  autoSellEnabled: boolean;
  autoSellThreshold: number;
  totalSold: bigint;
  totalRevenue: number;
}

// Market conditions affecting prices
export interface MarketCondition {
  priceMultiplier: number;
  demandLevel: 'low' | 'normal' | 'high' | 'peak';
  trend: 'rising' | 'stable' | 'falling';
  duration: number;
  description: string;
}

// Price history for market analysis
export interface PriceHistoryEntry {
  timestamp: number;
  price: number;
  volume: number;
  condition: string;
}

// Sale transaction record
export interface SaleTransaction {
  id: string;
  timestamp: number;
  amount: number;
  pricePerUnit: number;
  totalRevenue: number;
  marketCondition: string;
  isAutoSale: boolean;
}

// Sale result for UI feedback
export interface SaleResult {
  success: boolean;
  amount: number;
  revenue: number;
  pricePerUnit: number;
  marketImpact?: number;
  message?: string;
} 
