import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MatchstickError,
  GameErrorHandler,
  createErrorNotification,
  handleError,
  createError,
  errorHandler
} from './errors.js';
import type { GameError } from '../types/game.js';

describe('MatchstickError', () => {
  it('should create error with correct properties', () => {
    const error = new MatchstickError('Test error', 'storage', 'high', { test: true });
    
    expect(error.message).toBe('Test error');
    expect(error.category).toBe('storage');
    expect(error.severity).toBe('high');
    expect(error.details).toEqual({ test: true });
    expect(error.name).toBe('MatchstickError');
    expect(error.id).toMatch(/^err_\d+_[a-z0-9]+$/);
    expect(error.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should use default values', () => {
    const error = new MatchstickError('Test error');
    
    expect(error.category).toBe('unknown');
    expect(error.severity).toBe('medium');
    expect(error.details).toBeUndefined();
  });

  it('should convert to GameError', () => {
    const error = new MatchstickError('Test error', 'game_logic', 'critical');
    const gameError = error.toGameError();
    
    expect(gameError.id).toBe(error.id);
    expect(gameError.category).toBe('game_logic');
    expect(gameError.severity).toBe('critical');
    expect(gameError.message).toBe('Test error');
    expect(gameError.timestamp).toBe(error.timestamp);
  });

  it('should create notification', () => {
    const error = new MatchstickError('Test error', 'storage', 'high');
    const notification = error.toNotification();
    
    expect(notification.type).toBe('warning');
    expect(notification.title).toBe('Save Issue');
    expect(notification.message).toBe('There was a problem saving your progress. Your game data is safe.');
  });
});

describe('GameErrorHandler', () => {
  let handler: GameErrorHandler;
  let mockNotificationCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    handler = new GameErrorHandler();
    mockNotificationCallback = vi.fn();
    handler.onNotification(mockNotificationCallback);
  });

  describe('handleError', () => {
    it('should handle MatchstickError', () => {
      const error = new MatchstickError('Storage error', 'storage', 'high');
      const response = handler.handleError(error);
      
      expect(response.handled).toBe(true);
      expect(response.recovery).toBe('retry_operation');
      expect(response.shouldRetry).toBe(true);
    });

    it('should handle regular Error', () => {
      const error = new Error('Regular error');
      const response = handler.handleError(error);
      
      expect(response.handled).toBe(false);
      expect(response.recovery).toBe('none');
      expect(response.shouldRetry).toBe(false);
    });

    it('should handle GameError interface', () => {
      const error: GameError = {
        id: 'test-id',
        category: 'game_logic',
        severity: 'medium',
        message: 'Game logic error',
        timestamp: Date.now()
      };
      
      const response = handler.handleError(error);
      
      expect(response.handled).toBe(true);
      expect(response.recovery).toBe('use_fallback');
      expect(response.shouldRetry).toBe(true);
    });
  });

  describe('error categorization', () => {
    it('should handle storage errors correctly', () => {
      const error = createError.storage('Storage failed');
      const response = handler.handleError(error);
      
      expect(response.recovery).toBe('retry_operation');
      expect(response.shouldRetry).toBe(true);
    });

    it('should handle critical storage errors differently', () => {
      const criticalError: GameError = {
        id: 'test',
        category: 'storage',
        severity: 'critical',
        message: 'Critical storage error',
        timestamp: Date.now()
      };
      
      const response = handler.handleError(criticalError);
      
      expect(response.recovery).toBe('save_backup');
      expect(response.shouldRetry).toBe(false);
    });

    it('should handle game logic errors', () => {
      const error = createError.gameLogic('Logic error');
      const response = handler.handleError(error);
      
      expect(response.recovery).toBe('use_fallback');
      expect(response.shouldRetry).toBe(true);
      expect(response.fallbackData).toBeDefined();
    });

    it('should handle network errors', () => {
      const error = createError.network('Network error');
      const response = handler.handleError(error);
      
      expect(response.recovery).toBe('retry_operation');
      expect(response.shouldRetry).toBe(true);
    });

    it('should handle UI errors', () => {
      const error = createError.ui('UI error');
      const response = handler.handleError(error);
      
      expect(response.recovery).toBe('none');
      expect(response.shouldRetry).toBe(false);
    });
  });

  describe('notification system', () => {
    it('should notify for high severity errors', () => {
      const error = createError.storage('Storage error');
      handler.handleError(error);
      
      expect(mockNotificationCallback).toHaveBeenCalledOnce();
      const notification = mockNotificationCallback.mock.calls[0][0];
      expect(notification.type).toBe('warning');
      expect(notification.title).toBe('Save Issue');
    });

    it('should not notify for low severity errors', () => {
      const error = createError.ui('UI error'); // Low severity
      handler.handleError(error);
      
      expect(mockNotificationCallback).not.toHaveBeenCalled();
    });

    it('should always notify for critical errors', () => {
      const error = createError.critical('Critical error');
      handler.handleError(error);
      
      expect(mockNotificationCallback).toHaveBeenCalledOnce();
      const notification = mockNotificationCallback.mock.calls[0][0];
      expect(notification.type).toBe('error');
      expect(notification.title).toBe('Critical Error');
    });

    it('should not spam notifications for repeated errors', () => {
      const error1 = createError.storage('Same error');
      const error2 = createError.storage('Same error');
      
      handler.handleError(error1);
      handler.handleError(error2);
      
      expect(mockNotificationCallback).toHaveBeenCalledTimes(1); // Only first occurrence notified (throttling works)
    });
  });

  describe('error history', () => {
    it('should track error history', () => {
      const error1 = createError.storage('Error 1');
      const error2 = createError.gameLogic('Error 2');
      
      handler.handleError(error1);
      handler.handleError(error2);
      
      const history = handler.getErrorHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Error 2'); // Most recent first
      expect(history[1].message).toBe('Error 1');
    });

    it('should limit history size', () => {
      // Create 105 errors (more than the 100 limit)
      for (let i = 0; i < 105; i++) {
        handler.handleError(new Error(`Error ${i}`));
      }
      
      const history = handler.getErrorHistory();
      expect(history).toHaveLength(100);
    });

    it('should clear error history', () => {
      handler.handleError(createError.storage('Error'));
      expect(handler.getErrorHistory()).toHaveLength(1);
      
      handler.clearErrorHistory();
      expect(handler.getErrorHistory()).toHaveLength(0);
    });
  });

  describe('notifyUser', () => {
    it('should send user notification', () => {
      handler.notifyUser('Test message', 'warning');
      
      expect(mockNotificationCallback).toHaveBeenCalledOnce();
      const notification = mockNotificationCallback.mock.calls[0][0];
      expect(notification.type).toBe('warning');
      expect(notification.message).toBe('Test message');
      expect(notification.title).toBe('Warning');
    });
  });

  describe('notification subscription', () => {
    it('should unsubscribe from notifications', () => {
      handler.offNotification(mockNotificationCallback);
      handler.notifyUser('Test', 'info');
      
      expect(mockNotificationCallback).not.toHaveBeenCalled();
    });
  });
});

describe('createErrorNotification', () => {
  it('should create notification with correct properties', () => {
    const error: GameError = {
      id: 'test-id',
      category: 'storage',
      severity: 'high',
      message: 'Storage error',
      timestamp: Date.now()
    };
    
    const notification = createErrorNotification(error);
    
    expect(notification.type).toBe('warning');
    expect(notification.title).toBe('Save Issue');
    expect(notification.message).toBe('There was a problem saving your progress. Your game data is safe.');
    expect(notification.actions).toContainEqual({
      label: 'Retry Save',
      action: 'retry_save',
      style: 'primary'
    });
    expect(notification.actions).toContainEqual({
      label: 'Dismiss',
      action: 'dismiss',
      style: 'secondary'
    });
  });

  it('should create critical error notification', () => {
    const error: GameError = {
      id: 'test-id',
      category: 'unknown',
      severity: 'critical',
      message: 'Critical error',
      timestamp: Date.now()
    };
    
    const notification = createErrorNotification(error);
    
    expect(notification.type).toBe('error');
    expect(notification.title).toBe('Critical Error');
    expect(notification.duration).toBeUndefined(); // No auto-dismiss
    expect(notification.actions).toContainEqual({
      label: 'Reload Game',
      action: 'reload_game',
      style: 'primary'
    });
  });

  it('should create network error notification with retry action', () => {
    const error: GameError = {
      id: 'test-id',
      category: 'network',
      severity: 'medium',
      message: 'Network error',
      timestamp: Date.now()
    };
    
    const notification = createErrorNotification(error);
    
    expect(notification.title).toBe('Connection Issue');
    expect(notification.message).toBe('Connection problem. Some features may not work until reconnected.');
    expect(notification.actions).toContainEqual({
      label: 'Retry',
      action: 'retry_operation',
      style: 'primary'
    });
  });
});

describe('convenience functions', () => {
  it('should use global error handler', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const error = new Error('Test error');
    handleError(error);
    
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  describe('createError', () => {
    it('should create storage error', () => {
      const error = createError.storage('Storage failed', { feature: 'save' });
      
      expect(error.category).toBe('storage');
      expect(error.severity).toBe('high');
      expect(error.message).toBe('Storage failed');
      expect(error.details).toEqual({ feature: 'save' });
    });

    it('should create game logic error', () => {
      const error = createError.gameLogic('Logic failed');
      
      expect(error.category).toBe('game_logic');
      expect(error.severity).toBe('medium');
    });

    it('should create network error', () => {
      const error = createError.network('Network failed');
      
      expect(error.category).toBe('network');
      expect(error.severity).toBe('medium');
    });

    it('should create UI error', () => {
      const error = createError.ui('UI failed');
      
      expect(error.category).toBe('ui');
      expect(error.severity).toBe('low');
    });

    it('should create critical error', () => {
      const error = createError.critical('Critical failure');
      
      expect(error.category).toBe('unknown');
      expect(error.severity).toBe('critical');
    });
  });
});

describe('singleton error handler', () => {
  it('should provide access to global error handler', () => {
    expect(errorHandler).toBeInstanceOf(GameErrorHandler);
  });
}); 
