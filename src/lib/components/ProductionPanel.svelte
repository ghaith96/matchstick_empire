<script lang="ts">
  import { onMount } from 'svelte';
  import { gameState } from '$lib/shared/stores/gameState.js';
  import { productionService } from '$lib/shared/services/index.js';
  import { formatNumber, formatRate, formatMultiplier } from '$lib/shared/utils/formatting.js';
  import { scale, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  let clickAnimations: Array<{ id: string; x: number; y: number }> = [];
  let productionButton: HTMLElement;
  let combo = { count: 0, multiplier: 1 };
  let lastClickTime = 0;

  // Reactive stats
  $: productionStats = productionService.getProductionStats();
  $: currentRate = productionService.getCurrentProductionRate();

  onMount(() => {
    // Update combo info periodically
    const comboInterval = setInterval(() => {
      combo = productionService.getComboInfo();
    }, 100);

    return () => {
      clearInterval(comboInterval);
    };
  });

  function handleProductionClick(event: MouseEvent) {
    const now = Date.now();
    
    // Produce matchsticks
    const result = productionService.produceMatchsticks(1);
    
    // Create click animation
    if (productionButton) {
      const rect = productionButton.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const animationId = `anim_${now}_${Math.random().toString(36).substr(2, 9)}`;
      clickAnimations = [...clickAnimations, { id: animationId, x, y }];
      
      // Remove animation after delay
      setTimeout(() => {
        clickAnimations = clickAnimations.filter(a => a.id !== animationId);
      }, 1000);
    }
    
    lastClickTime = now;
  }

  function handleKeyboardProduction(event: KeyboardEvent) {
    if (event.code === 'Space') {
      event.preventDefault();
      // Simulate click at center of button
      if (productionButton) {
        const rect = productionButton.getBoundingClientRect();
        const fakeEvent = {
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        } as MouseEvent;
        handleProductionClick(fakeEvent);
      }
    }
  }

  function formatComboTime(ms: number): string {
    return `${(ms / 1000).toFixed(1)}s`;
  }
</script>

<svelte:window on:keydown={handleKeyboardProduction} />

<div class="production-panel">
  <div class="panel-header">
    <h2>🔥 Production Center</h2>
    <p class="panel-description">Click to create matchsticks and build your empire!</p>
  </div>

  <div class="production-content">
    <!-- Main Production Area -->
    <div class="production-main">
      <!-- Big Production Button -->
      <div class="production-button-container">
        <button 
          bind:this={productionButton}
          class="production-button"
          class:combo-active={combo.count > 0}
          on:click={handleProductionClick}
          style="transform: scale({1 + Math.min(combo.count * 0.01, 0.2)})"
        >
          <div class="button-background"></div>
          <div class="button-content">
            <div class="button-icon">🔥</div>
            <div class="button-text">
              <span class="action-text">Create Matchstick</span>
              <span class="rate-text">+{formatNumber(currentRate)} per click</span>
            </div>
          </div>

          <!-- Click Animations -->
          {#each clickAnimations as animation (animation.id)}
            <div 
              class="click-animation"
              style="left: {animation.x}px; top: {animation.y}px;"
              transition:fly={{ y: -50, duration: 1000, easing: quintOut }}
            >
              +{formatNumber(currentRate)}
            </div>
          {/each}

          <!-- Combo Display -->
          {#if combo.count > 0}
            <div class="combo-display" transition:scale={{ duration: 200 }}>
              <span class="combo-count">{combo.count}x</span>
              <span class="combo-multiplier">{formatMultiplier(combo.multiplier)}</span>
            </div>
          {/if}
        </button>

        <!-- Keyboard Hint -->
        <div class="keyboard-hint">
          Press <kbd>Space</kbd> to click
        </div>
      </div>

      <!-- Production Stats -->
      <div class="production-stats">
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-label">Total Produced</div>
              <div class="stat-value">{formatNumber($gameState.production.totalProduced)}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">⚡</div>
            <div class="stat-content">
              <div class="stat-label">Production Rate</div>
              <div class="stat-value">{formatNumber(currentRate)}/click</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">🎯</div>
            <div class="stat-content">
              <div class="stat-label">Total Clicks</div>
              <div class="stat-value">{formatNumber(productionStats.totalClicks)}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">🔥</div>
            <div class="stat-content">
              <div class="stat-label">Max Combo</div>
              <div class="stat-value">{productionStats.maxCombo}x</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">⏱️</div>
            <div class="stat-content">
              <div class="stat-label">Avg Click Rate</div>
              <div class="stat-value">{formatRate(productionStats.averageClickRate, 'min')}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-content">
              <div class="stat-label">Session Production</div>
              <div class="stat-value">{formatNumber(productionStats.sessionProduction)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Side Panel -->
    <div class="production-sidebar">
      <!-- Current Session -->
      <div class="session-info">
        <h3>Current Session</h3>
        <div class="session-stats">
          <div class="session-stat">
            <span class="label">Clicks:</span>
            <span class="value">{productionStats.sessionClicks}</span>
          </div>
          <div class="session-stat">
            <span class="label">Produced:</span>
            <span class="value">{formatNumber(productionStats.sessionProduction)}</span>
          </div>
          <div class="session-stat">
            <span class="label">Current Combo:</span>
            <span class="value combo-highlight">{combo.count}x</span>
          </div>
        </div>
      </div>

      <!-- Production Tips -->
      <div class="production-tips">
        <h3>💡 Tips</h3>
        <ul class="tips-list">
          <li>Click rapidly to build up combo multipliers</li>
          <li>Higher combos give exponential bonuses</li>
          <li>Use the spacebar for faster clicking</li>
          <li>Upgrade your automation to produce while away</li>
          <li>Watch the market for optimal selling times</li>
        </ul>
      </div>

      <!-- Multipliers Display -->
      <div class="multipliers-info">
        <h3>🚀 Active Multipliers</h3>
        <div class="multipliers-list">
          {#if combo.multiplier > 1}
            <div class="multiplier-item">
              <span class="multiplier-name">Combo Bonus</span>
              <span class="multiplier-value">{formatMultiplier(combo.multiplier)}</span>
            </div>
          {/if}
          
          <!-- Additional multipliers would be shown here -->
          <div class="multiplier-item">
            <span class="multiplier-name">Base Rate</span>
            <span class="multiplier-value">{formatMultiplier($gameState.production.manualRate)}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .production-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    margin-bottom: 2rem;
  }

  .panel-header h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.8rem;
    font-weight: 700;
    color: #64ffda;
  }

  .panel-description {
    margin: 0;
    color: #b0bec5;
    font-size: 1rem;
  }

  .production-content {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 2rem;
    flex: 1;
  }

  .production-main {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .production-button-container {
    text-align: center;
  }

  .production-button {
    position: relative;
    width: 300px;
    height: 300px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: visible;
    background: none;
    margin: 0 auto;
    display: block;
  }

  .production-button:hover {
    transform: scale(1.05) !important;
  }

  .production-button:active {
    transform: scale(0.95) !important;
  }

  .production-button.combo-active {
    animation: pulse 1s infinite;
  }

  .button-background {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 50%, #d63031 100%);
    box-shadow: 
      0 10px 30px rgba(255, 107, 107, 0.4),
      inset 0 2px 10px rgba(255, 255, 255, 0.2),
      inset 0 -2px 10px rgba(0, 0, 0, 0.2);
  }

  .button-content {
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: white;
  }

  .button-icon {
    font-size: 4rem;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  }

  .button-text {
    text-align: center;
  }

  .action-text {
    display: block;
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .rate-text {
    display: block;
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .click-animation {
    position: absolute;
    pointer-events: none;
    color: #64ffda;
    font-weight: 700;
    font-size: 1.5rem;
    z-index: 10;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }

  .combo-display {
    position: absolute;
    top: -20px;
    right: -20px;
    background: linear-gradient(135deg, #ffd700 0%, #ff8f00 100%);
    border-radius: 20px;
    padding: 0.5rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  .combo-count {
    font-size: 1.2rem;
    font-weight: 700;
    color: #ffffff;
  }

  .combo-multiplier {
    font-size: 0.8rem;
    color: #ffffff;
    opacity: 0.9;
  }

  .keyboard-hint {
    margin-top: 1rem;
    color: #78909c;
    font-size: 0.9rem;
  }

  .keyboard-hint kbd {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: monospace;
    color: #64ffda;
  }

  .production-stats {
    flex: 1;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
  }

  .stat-card:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }

  .stat-icon {
    font-size: 2rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .stat-content {
    flex: 1;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #b0bec5;
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: #64ffda;
  }

  .production-sidebar {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .session-info,
  .production-tips,
  .multipliers-info {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .session-info h3,
  .production-tips h3,
  .multipliers-info h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #64ffda;
  }

  .session-stats {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .session-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .session-stat .label {
    color: #b0bec5;
  }

  .session-stat .value {
    font-weight: 600;
    color: #ffffff;
  }

  .session-stat .combo-highlight {
    color: #ffd700;
  }

  .tips-list {
    margin: 0;
    padding-left: 1.5rem;
    color: #eceff1;
  }

  .tips-list li {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .multipliers-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .multiplier-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
  }

  .multiplier-name {
    color: #b0bec5;
    font-size: 0.9rem;
  }

  .multiplier-value {
    font-weight: 600;
    color: #64ffda;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 10px 30px rgba(255, 107, 107, 0.4);
    }
    50% {
      box-shadow: 0 10px 30px rgba(255, 107, 107, 0.7);
    }
    100% {
      box-shadow: 0 10px 30px rgba(255, 107, 107, 0.4);
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .production-content {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .production-button {
      width: 250px;
      height: 250px;
    }

    .stat-grid {
      grid-template-columns: 1fr 1fr;
    }

    .stat-card {
      padding: 1rem;
    }
  }
</style> 
