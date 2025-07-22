// Resource types used throughout the game
export type ResourceType = 'matchsticks' | 'money' | 'wood' | 'reputation';

// Base resource interface
export interface Resource {
  type: ResourceType;
  amount: bigint | number;
  formatDisplay(): string;
}

// Resource state containing all player resources
export interface ResourceState {
  matchsticks: bigint;
  money: number;
  wood: number;
  reputation: number;
}

// Resource cost for purchases and upgrades
export interface ResourceCost {
  type: ResourceType;
  amount: bigint | number;
}

// Resource transaction for logging and debugging
export interface ResourceTransaction {
  id: string;
  timestamp: number;
  type: 'gain' | 'spend';
  resourceType: ResourceType;
  amount: bigint | number;
  reason: string;
  balanceBefore: bigint | number;
  balanceAfter: bigint | number;
} 
