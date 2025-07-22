<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  export let notification: {
    id: string;
    type: 'achievement' | 'success' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: number;
    duration?: number;
  };
  export let onClose: () => void;

  let timeoutId: number;
  let progress = 100;

  onMount(() => {
    const duration = notification.duration || 5000;
    
    // Auto close after duration
    timeoutId = setTimeout(() => {
      onClose();
    }, duration) as any;

    // Progress bar animation
    const progressInterval = setInterval(() => {
      progress = Math.max(0, progress - (100 / (duration / 100)));
      if (progress <= 0) {
        clearInterval(progressInterval);
      }
    }, 100);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (progressInterval) clearInterval(progressInterval);
    };
  });

  function handleClick() {
    if (timeoutId) clearTimeout(timeoutId);
    onClose();
  }

  function getIcon(type: string): string {
    switch (type) {
      case 'achievement': return '🏆';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '📢';
    }
  }

  function getTypeClass(type: string): string {
    switch (type) {
      case 'achievement': return 'achievement';
      case 'success': return 'success';
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  }
</script>

<div 
  class="notification-toast {getTypeClass(notification.type)}"
  transition:fly={{ x: 300, duration: 300, easing: quintOut }}
  on:click={handleClick}
  role="button"
  tabindex="0"
>
  <div class="toast-content">
    <div class="toast-icon">{getIcon(notification.type)}</div>
    <div class="toast-text">
      <div class="toast-title">{notification.title}</div>
      <div class="toast-message">{notification.message}</div>
    </div>
    <button class="toast-close" on:click|stopPropagation={handleClick}>
      ✕
    </button>
  </div>
  
  <div class="toast-progress">
    <div class="progress-bar" style="width: {progress}%"></div>
  </div>
</div>

<style>
  .notification-toast {
    min-width: 300px;
    max-width: 400px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
    position: relative;
  }

  .notification-toast:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  }

  .toast-content {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
  }

  .toast-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .toast-text {
    flex: 1;
    min-width: 0;
  }

  .toast-title {
    font-weight: 700;
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
    color: #1a1a1a;
  }

  .toast-message {
    font-size: 0.85rem;
    color: #4a4a4a;
    line-height: 1.4;
  }

  .toast-close {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .toast-close:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #333;
  }

  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(0, 0, 0, 0.1);
  }

  .progress-bar {
    height: 100%;
    transition: width 0.1s linear;
    border-radius: 0 0 8px 8px;
  }

  /* Type-specific styles */
  .notification-toast.achievement {
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
    border-color: #ffc107;
  }

  .notification-toast.achievement .progress-bar {
    background: linear-gradient(90deg, #ff8f00 0%, #ffa000 100%);
  }

  .notification-toast.success {
    background: linear-gradient(135deg, #4caf50 0%, #81c784 100%);
    border-color: #4caf50;
  }

  .notification-toast.success .toast-title,
  .notification-toast.success .toast-message {
    color: #ffffff;
  }

  .notification-toast.success .toast-close {
    color: rgba(255, 255, 255, 0.8);
  }

  .notification-toast.success .toast-close:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }

  .notification-toast.success .progress-bar {
    background: linear-gradient(90deg, #2e7d32 0%, #388e3c 100%);
  }

  .notification-toast.info {
    background: linear-gradient(135deg, #2196f3 0%, #64b5f6 100%);
    border-color: #2196f3;
  }

  .notification-toast.info .toast-title,
  .notification-toast.info .toast-message {
    color: #ffffff;
  }

  .notification-toast.info .toast-close {
    color: rgba(255, 255, 255, 0.8);
  }

  .notification-toast.info .toast-close:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }

  .notification-toast.info .progress-bar {
    background: linear-gradient(90deg, #1565c0 0%, #1976d2 100%);
  }

  .notification-toast.warning {
    background: linear-gradient(135deg, #ff9800 0%, #ffb74d 100%);
    border-color: #ff9800;
  }

  .notification-toast.warning .progress-bar {
    background: linear-gradient(90deg, #ef6c00 0%, #f57c00 100%);
  }

  .notification-toast.error {
    background: linear-gradient(135deg, #f44336 0%, #e57373 100%);
    border-color: #f44336;
  }

  .notification-toast.error .toast-title,
  .notification-toast.error .toast-message {
    color: #ffffff;
  }

  .notification-toast.error .toast-close {
    color: rgba(255, 255, 255, 0.8);
  }

  .notification-toast.error .toast-close:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }

  .notification-toast.error .progress-bar {
    background: linear-gradient(90deg, #c62828 0%, #d32f2f 100%);
  }

  /* Responsive Design */
  @media (max-width: 480px) {
    .notification-toast {
      min-width: 280px;
      max-width: 320px;
    }

    .toast-content {
      padding: 0.75rem;
      gap: 0.75rem;
    }

    .toast-title {
      font-size: 0.9rem;
    }

    .toast-message {
      font-size: 0.8rem;
    }
  }
</style> 
