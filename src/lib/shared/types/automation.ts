import type { ResourceCost } from './resources.js';
import type { UnlockRequirement } from './production.js';

// Automation state for tracking auto-systems
export interface AutomationState {
  autoClickers: AutoClicker[];
  autoSellEnabled: boolean;
  autoSellSettings: AutoSellSettings;
  multipliers: ProductionMultiplier[];
  totalMoneySpent: number;
  lastUpdate: number;
}

// Auto-clicker for automated production
export interface AutoClicker {
  id: string;
  name: string;
  productionRate: number;
  cost: ResourceCost[];
  owned: number;
  level: number;
  totalClicks: number;
  isActive: boolean;
  efficiency: number;
}

// Auto-sell configuration
export interface AutoSellSettings {
  enabled: boolean;
  threshold: number;
  maxPercentage: number;
  priceThreshold: number;
  smartSelling: boolean;
}

// Production multipliers
export interface ProductionMultiplier {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  target: 'manual' | 'automated' | 'all';
  isActive: boolean;
  source: string;
}

// Upgrade system
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  category: 'production' | 'efficiency' | 'automation' | 'market';
  cost: ResourceCost[];
  effect: UpgradeEffect;
  unlockConditions: UnlockRequirement[];
  isPurchased: boolean;
  isRepeatable: boolean;
  purchaseCount: number;
}

// Upgrade effects
export interface UpgradeEffect {
  type: 'multiplier' | 'additive' | 'unlock' | 'special';
  target: string;
  value: number;
  description: string;
} 
