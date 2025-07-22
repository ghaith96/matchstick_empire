// Production state for tracking matchstick creation
export interface ProductionState {
  manualRate: number;
  automatedRate: number;
  multipliers: Record<string, number>;
  lastUpdate: number;
  totalProduced: bigint;
}

// Production facility types
export type ProductionFacilityType = 'manual' | 'automated' | 'advanced';

// Production facilities for automation
export interface ProductionFacility {
  id: string;
  name: string;
  description: string;
  type: ProductionFacilityType;
  baseProductionRate: number;
  cost: import('./resources.js').ResourceCost[];
  requirements: UnlockRequirement[];
  owned: number;
  maxOwned?: number;
}

// Unlock requirements for facilities and features
export interface UnlockRequirement {
  type: 'resource' | 'achievement' | 'phase' | 'time';
  condition: string;
  value: bigint | number | string;
  description: string;
}

// Production events for tracking
export interface ProductionEvent {
  id: string;
  timestamp: number;
  type: 'manual' | 'automated';
  amount: number;
  facility?: string;
} 
