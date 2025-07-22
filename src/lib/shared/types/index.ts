// Resource types
export type { 
  ResourceType, 
  Resource, 
  ResourceState, 
  ResourceCost, 
  ResourceTransaction 
} from './resources.js';

// Production types
export type { 
  ProductionState, 
  ProductionFacilityType, 
  ProductionFacility, 
  UnlockRequirement, 
  ProductionEvent 
} from './production.js';

// Market types
export type { 
  MarketState, 
  MarketCondition, 
  PriceHistoryEntry, 
  SaleTransaction, 
  SaleResult 
} from './market.js';

// Automation types
export type { 
  AutomationState, 
  AutoClicker, 
  AutoSellSettings, 
  ProductionMultiplier, 
  Upgrade, 
  UpgradeEffect 
} from './automation.js';

// Achievement types
export type { 
  AchievementState, 
  Achievement, 
  AchievementRequirement, 
  AchievementProgress, 
  AchievementReward, 
  AchievementNotification, 
  AchievementStats 
} from './achievements.js';

// Progression types
export type { 
  ProgressionState, 
  GamePhase, 
  TutorialStep, 
  TutorialState, 
  GameMilestone, 
  MilestoneReward, 
  WorldConversion 
} from './progression.js';

// Settings types
export type { 
  ThemeType, 
  SettingsState, 
  AnimationSettings, 
  NotificationSettings, 
  AccessibilitySettings, 
  EasterEggState, 
  EasterEgg, 
  EasterEggTrigger, 
  EasterEggContent, 
  EasterEggSequence 
} from './settings.js';

// Game types
export type { 
  GameState, 
  GameMetadata, 
  GameEvent, 
  GameError, 
  GameNotification, 
  NotificationAction 
} from './game.js'; 
