import type { UnlockRequirement } from './production.js';

// Game progression state
export interface ProgressionState {
  currentPhase: string;
  unlockedFeatures: string[];
  completedTutorials: string[];
  milestones: GameMilestone[];
  worldConversionProgress: number;
  prestigeLevel: number;
}

// Game phases for structured progression
export interface GamePhase {
  id: string;
  name: string;
  description: string;
  unlockRequirements: UnlockRequirement[];
  features: string[];
  tutorialSteps?: TutorialStep[];
  milestones: string[];
  nextPhase?: string;
}

// Tutorial system
export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string;
  action: 'click' | 'view' | 'wait' | 'custom';
  highlightElement?: string;
  skipCondition?: string;
  order: number;
}

// Tutorial state
export interface TutorialState {
  activeTutorial?: string;
  currentStep: number;
  completedTutorials: string[];
  skippedTutorials: string[];
  isActive: boolean;
}

// Game milestones
export interface GameMilestone {
  id: string;
  name: string;
  description: string;
  requirement: UnlockRequirement;
  reward?: MilestoneReward;
  isCompleted: boolean;
  completedAt?: number;
  category: 'production' | 'automation' | 'sales' | 'progression';
}

// Milestone rewards
export interface MilestoneReward {
  type: 'feature' | 'multiplier' | 'resource' | 'cosmetic';
  target: string;
  value: number | string;
  description: string;
}

// World conversion for late game
export interface WorldConversion {
  totalFactories: number;
  conversionRate: number;
  woodProcessed: bigint;
  globalEfficiency: number;
  unlockRequirement: UnlockRequirement;
} 
