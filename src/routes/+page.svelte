<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { 
    gameState, 
    gameActions, 
    gameEvents 
  } from '$lib/shared/stores/gameState.js';
  import { 
    productionService, 
    marketService, 
    automationService, 
    achievementService,
    gameManager 
  } from '$lib/shared/services/index.js';
  import ProductionPanel from '$lib/components/ProductionPanel.svelte';
  import MarketPanel from '$lib/components/MarketPanel.svelte';
  import AutomationPanel from '$lib/components/AutomationPanel.svelte';
  import AchievementPanel from '$lib/components/AchievementPanel.svelte';
  import StatsDisplay from '$lib/components/StatsDisplay.svelte';
  import NotificationToast from '$lib/components/NotificationToast.svelte';
  import GameHeader from '$lib/components/GameHeader.svelte';
  import NavigationTabs from '$lib/components/NavigationTabs.svelte';
  import LoadingScreen from '$lib/components/LoadingScreen.svelte';

  let activeTab = 'production';
  let notifications = new Set<any>();
  let showAchievementCelebration = false;
  let celebrationAchievement: any = null;
  let isLoading = true;
  let loadingProgress = 0;
  let loadingMessage = 'Initializing Matchstick Empire...';

  // Track processed events to prevent duplicates
  let processedEventIds = new Set<string>();

  // Game event subscription
  let unsubscribeEvents: () => void;

  onMount(async () => {
    // Simulate loading progress
    const progressSteps = [
      { progress: 20, message: 'Loading storage system...' },
      { progress: 40, message: 'Starting market simulation...' },
      { progress: 60, message: 'Initializing automation...' },
      { progress: 80, message: 'Loading achievements...' },
      { progress: 95, message: 'Finishing setup...' },
      { progress: 100, message: 'Ready to play!' }
    ];

    for (const step of progressSteps) {
      loadingProgress = step.progress;
      loadingMessage = step.message;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Initialize the game manager
    await gameManager.initialize();

    // Hide loading screen
    await new Promise(resolve => setTimeout(resolve, 500));
    isLoading = false;

    // Subscribe to game events for notifications
    unsubscribeEvents = gameEvents.subscribe((events) => {
      // Only process new events that haven't been seen before
      const newEvents = events.filter(event => !processedEventIds.has(event.id));
      
      newEvents.forEach((event) => {
        // Mark event as processed
        processedEventIds.add(event.id);
        
        if (event.type === 'achievement_unlocked') {
          showAchievementCelebration = true;
          celebrationAchievement = event.data;
          
          // Add notification
          const newNotification = {
            id: `notif_${event.id}`,
            type: 'achievement',
            title: '🎉 Achievement Unlocked!',
            message: `${event.data.name}`,
            timestamp: event.timestamp,
            duration: 5000
          };
          notifications.add(newNotification);
          notifications = notifications;
        } else if (event.type === 'trade_executed') {
          const newNotification = {
            id: `notif_${event.id}`,
            type: 'success',
            title: '💰 Sale Complete',
            message: `Sold ${event.data.amount} matchsticks for $${event.data.revenue.toFixed(2)}`,
            timestamp: event.timestamp,
            duration: 3000
          };
          notifications.add(newNotification);
          notifications = notifications;
        }
      });
      
      // Clean up old processed event IDs to prevent memory leaks (keep last 200)
      if (processedEventIds.size > 200) {
        const eventIdArray = Array.from(processedEventIds);
        const toKeep = eventIdArray.slice(-100);
        processedEventIds = new Set(toKeep);
      }
    });
  });

  onDestroy(() => {
    if (unsubscribeEvents) {
      unsubscribeEvents();
    }
  });

  function removeNotification(id: string) {
    const notificationToRemove = Array.from(notifications).find(n => n.id === id);
    if (notificationToRemove) {
      notifications.delete(notificationToRemove);
      notifications = notifications;
    }
  }

  function closeCelebration() {
    showAchievementCelebration = false;
    celebrationAchievement = null;
  }

  // Tab switching with smooth transitions
  function switchTab(tab: string) {
    activeTab = tab;
  }

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (event.altKey) return;
    
    switch (event.key) {
      case '1':
        switchTab('production');
        break;
      case '2':
        switchTab('automation');
        break;
      case '3':
        switchTab('market');
        break;
      case '4':
        switchTab('achievements');
        break;
      // Note: Spacebar is handled by ProductionPanel to prevent double-firing
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Loading Screen -->
<LoadingScreen 
  show={isLoading} 
  message={loadingMessage} 
  progress={loadingProgress} 
/>

<main class="game-container">
  <!-- Game Header -->
  <GameHeader />

  <!-- Main Game Area -->
  <div class="game-content">
    <!-- Left Sidebar - Stats & Quick Actions -->
    <aside class="sidebar left-sidebar">
      <StatsDisplay />
      
      <!-- Quick Production Button -->
      <div class="quick-actions">
        <button 
          class="production-button"
          on:click={() => productionService.produceMatchsticks(1)}
        >
          <div class="button-content">
            <span class="icon">🔥</span>
            <span class="text">Make Matchstick</span>
            <span class="shortcut">[Space]</span>
          </div>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Navigation Tabs -->
      <NavigationTabs {activeTab} onTabChange={switchTab} />

      <!-- Content Panels -->
      <div class="content-panel">
        {#if activeTab === 'production'}
          <div in:fly={{ x: -300, duration: 300, easing: quintOut }}>
            <ProductionPanel />
          </div>
        {:else if activeTab === 'automation'}
          <div in:fly={{ x: -300, duration: 300, easing: quintOut }}>
            <AutomationPanel />
          </div>
        {:else if activeTab === 'market'}
          <div in:fly={{ x: -300, duration: 300, easing: quintOut }}>
            <MarketPanel />
          </div>
        {:else if activeTab === 'achievements'}
          <div in:fly={{ x: -300, duration: 300, easing: quintOut }}>
            <AchievementPanel />
          </div>
        {/if}
      </div>
    </div>

    <!-- Right Sidebar - Market Summary & News -->
    <aside class="sidebar right-sidebar">
      <div class="market-summary">
        <h3>Market Summary</h3>
        <div class="price-display">
          <span class="label">Current Price:</span>
          <span class="value">${$gameState.market.currentPrice.toFixed(3)}</span>
        </div>
        <div class="trend-indicator" class:positive={$gameState.market.trend === 'up'} class:negative={$gameState.market.trend === 'down'}>
          {$gameState.market.trend === 'up' ? '📈' : $gameState.market.trend === 'down' ? '📉' : '➡️'}
          {$gameState.market.trend || 'stable'}
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="recent-activity">
        <h3>Recent Activity</h3>
        <div class="activity-feed">
          {#each $gameEvents.slice(0, 5) as event (event.id)}
            <div class="activity-item" transition:fade>
              <span class="activity-time">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span class="activity-text">
                {#if event.type === 'matchsticks_produced'}
                  🔥 Produced {event.data.amount} matchsticks
                {:else if event.type === 'matchsticks_sold'}
                  💰 Sold {event.data.amount} for ${event.data.revenue.toFixed(2)}
                {:else if event.type === 'achievement_unlocked'}
                  🏆 Unlocked: {event.data.name}
                {:else if event.type === 'upgrade_purchased'}
                  ⚙️ Purchased: {event.data.itemId}
                {:else}
                  📊 {event.type}
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </div>
    </aside>
  </div>

  <!-- Notifications -->
  <div class="notifications">
    {#each Array.from(notifications) as notification (notification.id)}
      <div transition:fly={{ y: -50, duration: 300 }}>
        <NotificationToast 
          {notification} 
          onClose={() => removeNotification(notification.id)} 
        />
      </div>
    {/each}
  </div>

  <!-- Achievement Celebration Modal -->
  {#if showAchievementCelebration && celebrationAchievement}
    <div class="celebration-overlay" transition:fade>
      <div class="celebration-modal" transition:scale={{ duration: 500, easing: quintOut }}>
        <div class="celebration-content">
          <div class="celebration-icon">🏆</div>
          <h2>Achievement Unlocked!</h2>
          <h3>{celebrationAchievement.name}</h3>
          <p>{celebrationAchievement.description}</p>
          <div class="celebration-reward">
            {#if celebrationAchievement.reward?.type === 'money'}
              💰 Earned ${celebrationAchievement.reward.amount}
            {:else if celebrationAchievement.reward?.type === 'production_multiplier'}
              ⚡ Production boost: {celebrationAchievement.reward.amount}x
            {:else}
              🎁 Special reward unlocked!
            {/if}
          </div>
          <button class="celebration-close" on:click={closeCelebration}>
            Continue
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  .game-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    color: #ffffff;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow-x: hidden;
  }

  .game-content {
    display: grid;
    grid-template-columns: 280px 1fr 300px;
    gap: 1rem;
    padding: 1rem;
    min-height: calc(100vh - 80px);
  }

  .sidebar {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1.5rem;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .left-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .quick-actions {
    margin-top: auto;
  }

  .production-button {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  }

  .production-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
  }

  .production-button:active {
    transform: translateY(0);
  }

  .button-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .button-content .icon {
    font-size: 1.2em;
  }

  .button-content .text {
    flex: 1;
    text-align: left;
  }

  .button-content .shortcut {
    font-size: 0.8em;
    opacity: 0.8;
  }

  .main-content {
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .content-panel {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }

  .right-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .market-summary h3,
  .recent-activity h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #64ffda;
  }

  .price-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .price-display .label {
    color: #b0bec5;
    font-size: 0.9rem;
  }

  .price-display .value {
    font-weight: 600;
    font-size: 1.1rem;
    color: #64ffda;
  }

  .trend-indicator {
    padding: 0.5rem;
    border-radius: 6px;
    text-align: center;
    font-size: 0.9rem;
    font-weight: 500;
    background: rgba(255, 255, 255, 0.05);
  }

  .trend-indicator.positive {
    background: rgba(76, 175, 80, 0.2);
    color: #81c784;
  }

  .trend-indicator.negative {
    background: rgba(244, 67, 54, 0.2);
    color: #e57373;
  }

  .activity-feed {
    max-height: 300px;
    overflow-y: auto;
  }

  .activity-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    border-left: 3px solid #64ffda;
  }

  .activity-time {
    font-size: 0.8rem;
    color: #78909c;
  }

  .activity-text {
    font-size: 0.9rem;
    color: #eceff1;
  }

  .notifications {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .celebration-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(5px);
  }

  .celebration-modal {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 3rem;
    text-align: center;
    max-width: 500px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.2);
  }

  .celebration-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .celebration-icon {
    font-size: 4rem;
    animation: bounce 1s infinite;
  }

  .celebration-modal h2 {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .celebration-modal h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #ffffff;
  }

  .celebration-modal p {
    margin: 0;
    font-size: 1.1rem;
    color: #e8eaf6;
    opacity: 0.9;
  }

  .celebration-reward {
    padding: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-weight: 600;
    color: #ffd700;
  }

  .celebration-close {
    padding: 0.75rem 2rem;
    background: #ffffff;
    color: #667eea;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .celebration-close:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(255, 255, 255, 0.3);
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-10px);
    }
    60% {
      transform: translateY(-5px);
    }
  }

  /* Responsive Design */
  @media (max-width: 1200px) {
    .game-content {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    .sidebar {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .game-content {
      padding: 0.5rem;
    }
    
    .content-panel {
      padding: 1rem;
    }
    
    .celebration-modal {
      margin: 1rem;
      padding: 2rem;
    }
  }
</style>
