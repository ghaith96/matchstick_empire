import type { ResourceState } from './resources.js';
import type { ProductionState } from './production.js';
import type { MarketState } from './market.js';
import type { AutomationState } from './automation.js';
import type { AchievementState } from './achievements.js';
import type { ProgressionState, TutorialState } from './progression.js';
import type { SettingsState, EasterEggState } from './settings.js';

// Main game state containing all subsystems
export interface GameState {
  resources: ResourceState;
  production: ProductionState;
  market: MarketState;
  automation: AutomationState;
  achievements: AchievementState;
  progression: ProgressionState;
  tutorial: TutorialState;
  settings: SettingsState;
  easterEggs: EasterEggState;
  metadata: GameMetadata;
}

// Game metadata for saves and debugging
export interface GameMetadata {
  version: string;
  playerId: string;
  createdAt: number;
  lastSaved: number;
  totalPlayTime: number;
  sessionStartTime: number;
  gameSpeed: number;
  debugMode: boolean;
}

// Game events for the event system
export interface GameEvent {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  source: string;
}

// Error types for error handling
export interface GameError {
  id: string;
  category: 'storage' | 'game_logic' | 'network' | 'ui' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  timestamp: number;
  stack?: string;
}

// Notification for user feedback
export interface GameNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
  isRead: boolean;
  actions?: NotificationAction[];
}

// Notification actions
export interface NotificationAction {
  label: string;
  action: string;
  style?: 'primary' | 'secondary' | 'danger';
} 
