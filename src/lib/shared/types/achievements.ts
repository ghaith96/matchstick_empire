// Achievement state for tracking unlocks
export interface AchievementState {
  unlocked: string[];
  progress: Record<string, AchievementProgress>;
  notifications: AchievementNotification[];
  stats: AchievementStats;
}

// Achievement definition
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'production' | 'sales' | 'automation' | 'progression' | 'hidden';
  requirements: AchievementRequirement[];
  reward?: AchievementReward;
  isSecret: boolean;
  unlockedAt?: number;
  icon?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Achievement requirements
export interface AchievementRequirement {
  type: 'resource' | 'production' | 'sales' | 'time' | 'sequence' | 'custom';
  condition: string;
  target: bigint | number | string;
  description: string;
}

// Achievement progress tracking
export interface AchievementProgress {
  achievementId: string;
  currentValue: bigint | number;
  targetValue: bigint | number;
  percentage: number;
  isComplete: boolean;
  lastUpdated: number;
}

// Achievement rewards
export interface AchievementReward {
  type: 'multiplier' | 'resource' | 'unlock' | 'cosmetic';
  target: string;
  value: number | string;
  description: string;
}

// Achievement notification
export interface AchievementNotification {
  id: string;
  achievementId: string;
  timestamp: number;
  isRead: boolean;
  achievement: Achievement;
}

// Achievement statistics
export interface AchievementStats {
  totalUnlocked: number;
  totalHidden: number;
  completionPercentage: number;
  lastUnlocked?: Achievement;
  unlockedToday: number;
} 
