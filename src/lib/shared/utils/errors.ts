import type { GameError, GameNotification, NotificationAction } from '../types/game.js';

/**
 * Custom error class for game-specific errors
 */
export class MatchstickError extends Error {
  public readonly id: string;
  public readonly category: GameError['category'];
  public readonly severity: GameError['severity'];
  public readonly timestamp: number;
  public readonly details?: any;

  constructor(
    message: string,
    category: GameError['category'] = 'unknown',
    severity: GameError['severity'] = 'medium',
    details?: any
  ) {
    super(message);
    this.name = 'MatchstickError';
    this.id = generateErrorId();
    this.category = category;
    this.severity = severity;
    this.timestamp = Date.now();
    this.details = details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MatchstickError);
    }
  }

  /**
   * Convert to GameError interface
   */
  toGameError(): GameError {
    return {
      id: this.id,
      category: this.category,
      severity: this.severity,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Create a user-friendly notification from this error
   */
  toNotification(): GameNotification {
    return createErrorNotification(this.toGameError());
  }
}

/**
 * Error handler interface for managing game errors
 */
export interface ErrorHandler {
  handleError(error: GameError | MatchstickError | Error): ErrorResponse;
  logError(error: GameError | MatchstickError | Error): void;
  notifyUser(message: string, severity: 'info' | 'warning' | 'error'): void;
  getErrorHistory(): GameError[];
  clearErrorHistory(): void;
}

/**
 * Error response indicating how the error was handled
 */
export interface ErrorResponse {
  handled: boolean;
  recovery?: RecoveryAction;
  notification?: GameNotification;
  shouldRetry: boolean;
  fallbackData?: any;
}

/**
 * Recovery actions that can be taken after errors
 */
export type RecoveryAction = 
  | 'reload_state'
  | 'reset_feature'
  | 'use_fallback'
  | 'retry_operation'
  | 'save_backup'
  | 'none';

/**
 * Game error handler implementation
 */
export class GameErrorHandler implements ErrorHandler {
  private errorHistory: GameError[] = [];
  private maxHistorySize = 100;
  private notificationCallbacks: Array<(notification: GameNotification) => void> = [];

  /**
   * Handle any type of error
   */
  handleError(error: GameError | MatchstickError | Error): ErrorResponse {
    const gameError = this.normalizeError(error);
    
    // Log the error
    this.logError(gameError);
    
    // Determine recovery strategy based on error category and severity
    const response = this.determineRecoveryStrategy(gameError);
    
    // Create user notification if needed
    if (this.shouldNotifyUser(gameError)) {
      response.notification = createErrorNotification(gameError);
      this.sendNotification(response.notification);
    }
    
    return response;
  }

  /**
   * Log error to history and console
   */
  logError(error: GameError | MatchstickError | Error): void {
    const gameError = this.normalizeError(error);
    
    // Add to history
    this.errorHistory.unshift(gameError);
    
    // Limit history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
    
    // Console logging based on severity
    switch (gameError.severity) {
      case 'critical':
        console.error('🔴 Critical Error:', gameError);
        break;
      case 'high':
        console.error('🟠 High Severity Error:', gameError);
        break;
      case 'medium':
        console.warn('🟡 Warning:', gameError);
        break;
      case 'low':
        console.info('🔵 Info:', gameError);
        break;
    }
  }

  /**
   * Send notification to user
   */
  notifyUser(message: string, severity: 'info' | 'warning' | 'error'): void {
    const notification: GameNotification = {
      id: generateNotificationId(),
      type: severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'info',
      title: severity === 'error' ? 'Error' : severity === 'warning' ? 'Warning' : 'Information',
      message,
      timestamp: Date.now(),
      isRead: false
    };
    
    this.sendNotification(notification);
  }

  /**
   * Get error history
   */
  getErrorHistory(): GameError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Subscribe to notifications
   */
  onNotification(callback: (notification: GameNotification) => void): void {
    this.notificationCallbacks.push(callback);
  }

  /**
   * Unsubscribe from notifications
   */
  offNotification(callback: (notification: GameNotification) => void): void {
    const index = this.notificationCallbacks.indexOf(callback);
    if (index > -1) {
      this.notificationCallbacks.splice(index, 1);
    }
  }

  /**
   * Normalize any error to GameError format
   */
  private normalizeError(error: GameError | MatchstickError | Error): GameError {
    if ('category' in error && 'severity' in error) {
      // Already a GameError or MatchstickError
      return error instanceof MatchstickError ? error.toGameError() : error;
    }
    
    // Convert regular Error to GameError
    return {
      id: generateErrorId(),
      category: 'unknown',
      severity: 'medium',
      message: error.message || 'Unknown error occurred',
      timestamp: Date.now(),
      stack: error.stack
    };
  }

  /**
   * Determine recovery strategy based on error type
   */
  private determineRecoveryStrategy(error: GameError): ErrorResponse {
    switch (error.category) {
      case 'storage':
        return this.handleStorageError(error);
      case 'game_logic':
        return this.handleGameLogicError(error);
      case 'network':
        return this.handleNetworkError(error);
      case 'ui':
        return this.handleUIError(error);
      default:
        return this.handleUnknownError(error);
    }
  }

  /**
   * Handle storage-related errors
   */
  private handleStorageError(error: GameError): ErrorResponse {
    if (error.severity === 'critical') {
      return {
        handled: true,
        recovery: 'save_backup',
        shouldRetry: false,
        fallbackData: null
      };
    }
    
    return {
      handled: true,
      recovery: 'retry_operation',
      shouldRetry: true
    };
  }

  /**
   * Handle game logic errors
   */
  private handleGameLogicError(error: GameError): ErrorResponse {
    return {
      handled: true,
      recovery: error.severity === 'critical' ? 'reload_state' : 'use_fallback',
      shouldRetry: error.severity !== 'critical',
      fallbackData: getDefaultGameValues(error.details?.feature)
    };
  }

  /**
   * Handle network errors
   */
  private handleNetworkError(error: GameError): ErrorResponse {
    return {
      handled: true,
      recovery: 'retry_operation',
      shouldRetry: true
    };
  }

  /**
   * Handle UI errors
   */
  private handleUIError(error: GameError): ErrorResponse {
    return {
      handled: true,
      recovery: 'none',
      shouldRetry: false
    };
  }

  /**
   * Handle unknown errors
   */
  private handleUnknownError(error: GameError): ErrorResponse {
    return {
      handled: false,
      recovery: 'none',
      shouldRetry: false
    };
  }

  /**
   * Check if user should be notified about this error
   */
  private shouldNotifyUser(error: GameError): boolean {
    // Don't notify for low severity errors
    if (error.severity === 'low') return false;
    
    // Always notify for critical errors
    if (error.severity === 'critical') return true;
    
    // Notify for repeated errors
    const recentSimilarErrors = this.errorHistory
      .filter(e => e.category === error.category && e.message === error.message)
      .filter(e => Date.now() - e.timestamp < 60000); // Within last minute
    
    return recentSimilarErrors.length <= 1; // Don't spam notifications
  }

  /**
   * Send notification to all subscribers
   */
  private sendNotification(notification: GameNotification): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }
}

/**
 * Create user-friendly error notification
 */
export function createErrorNotification(error: GameError): GameNotification {
  const userFriendlyMessage = getUserFriendlyMessage(error);
  const actions = getErrorActions(error);

  return {
    id: generateNotificationId(),
    type: error.severity === 'critical' ? 'error' : 'warning',
    title: getErrorTitle(error),
    message: userFriendlyMessage,
    timestamp: Date.now(),
    duration: error.severity === 'critical' ? undefined : 5000,
    isRead: false,
    actions
  };
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(error: GameError): string {
  switch (error.category) {
    case 'storage':
      return 'There was a problem saving your progress. Your game data is safe.';
    case 'game_logic':
      return 'Something unexpected happened in the game. We\'ll try to fix it automatically.';
    case 'network':
      return 'Connection problem. Some features may not work until reconnected.';
    case 'ui':
      return 'Display issue detected. Try refreshing if problems persist.';
    default:
      return 'An unexpected error occurred. The game should continue working normally.';
  }
}

/**
 * Get error title based on category and severity
 */
function getErrorTitle(error: GameError): string {
  if (error.severity === 'critical') {
    return 'Critical Error';
  }
  
  switch (error.category) {
    case 'storage':
      return 'Save Issue';
    case 'game_logic':
      return 'Game Error';
    case 'network':
      return 'Connection Issue';
    case 'ui':
      return 'Display Issue';
    default:
      return 'Warning';
  }
}

/**
 * Get available actions for error recovery
 */
function getErrorActions(error: GameError): NotificationAction[] {
  const actions: NotificationAction[] = [];
  
  if (error.severity === 'critical') {
    actions.push({
      label: 'Reload Game',
      action: 'reload_game',
      style: 'primary'
    });
  }
  
  if (error.category === 'storage') {
    actions.push({
      label: 'Retry Save',
      action: 'retry_save',
      style: 'primary'
    });
  }
  
  if (error.category === 'network') {
    actions.push({
      label: 'Retry',
      action: 'retry_operation',
      style: 'primary'
    });
  }
  
  actions.push({
    label: 'Dismiss',
    action: 'dismiss',
    style: 'secondary'
  });
  
  return actions;
}

/**
 * Get default values for game features when errors occur
 */
function getDefaultGameValues(feature?: string): any {
  switch (feature) {
    case 'production':
      return { matchsticks: 0n, rate: 0 };
    case 'market':
      return { price: 1, demand: 'normal' };
    case 'automation':
      return { autoClickers: [], multipliers: [] };
    default:
      return null;
  }
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique notification ID
 */
function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create singleton error handler instance
 */
export const errorHandler = new GameErrorHandler();

/**
 * Convenience function to handle errors globally
 */
export function handleError(error: Error | MatchstickError | GameError): void {
  errorHandler.handleError(error);
}

/**
 * Convenience function to create specific error types
 */
export const createError = {
  storage: (message: string, details?: any) => 
    new MatchstickError(message, 'storage', 'high', details),
    
  gameLogic: (message: string, details?: any) => 
    new MatchstickError(message, 'game_logic', 'medium', details),
    
  network: (message: string, details?: any) => 
    new MatchstickError(message, 'network', 'medium', details),
    
  ui: (message: string, details?: any) => 
    new MatchstickError(message, 'ui', 'low', details),
    
  critical: (message: string, details?: any) => 
    new MatchstickError(message, 'unknown', 'critical', details)
}; 
