// Theme types
export type ThemeType = 'light' | 'dark' | 'black';

// Settings state
export interface SettingsState {
  theme: ThemeType;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticEnabled: boolean;
  animations: AnimationSettings;
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
  language: string;
  autoSave: boolean;
  saveInterval: number;
}

// Animation preferences
export interface AnimationSettings {
  enabled: boolean;
  reducedMotion: boolean;
  particleEffects: boolean;
  transitionSpeed: 'slow' | 'normal' | 'fast';
}

// Notification preferences
export interface NotificationSettings {
  enabled: boolean;
  achievements: boolean;
  milestones: boolean;
  marketAlerts: boolean;
  production: boolean;
  sound: boolean;
}

// Accessibility settings
export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  colorBlindFriendly: boolean;
}

// Easter egg tracking
export interface EasterEggState {
  discovered: string[];
  sequences: EasterEggSequence[];
  totalFound: number;
  lastFound?: EasterEgg;
}

// Easter egg definition
export interface EasterEgg {
  id: string;
  name: string;
  description: string;
  trigger: EasterEggTrigger;
  content: EasterEggContent;
  discoveredAt?: number;
  isRepeatable: boolean;
}

// Easter egg triggers
export interface EasterEggTrigger {
  type: 'sequence' | 'milestone' | 'interaction' | 'time' | 'random';
  condition: string;
  value?: number | string;
  probability?: number;
}

// Easter egg content
export interface EasterEggContent {
  type: 'message' | 'animation' | 'sound' | 'special';
  data: string;
  duration?: number;
}

// Konami-style sequences
export interface EasterEggSequence {
  id: string;
  sequence: string[];
  timeout: number;
  currentStep: number;
  lastInput: number;
} 
