<script lang="ts">
  import { gameState } from '$lib/shared/stores/gameState.js';
  import { formatNumber, formatCurrency } from '$lib/shared/utils/formatting.js';

  function toggleSettings() {
    // Settings modal implementation would go here
    console.log('Settings clicked');
  }

  function toggleHelp() {
    // Help modal implementation would go here
    console.log('Help clicked');
  }

  $: resources = $gameState.resources;
  $: achievements = $gameState.achievements;
</script>

<header class="game-header">
  <div class="header-content">
    <!-- Game Title & Version -->
    <div class="title-section">
      <h1 class="game-title">
        <span class="title-icon">🔥</span>
        Matchstick Empire
      </h1>
      <div class="version-badge">v{$gameState.metadata.version || '1.0.0'}</div>
    </div>

    <!-- Resource Display -->
    <div class="resources-section">
      <div class="resource-group">
        <div class="resource-item primary">
          <span class="resource-icon">🔥</span>
          <div class="resource-details">
            <span class="resource-label">Matchsticks</span>
            <span class="resource-value">{formatNumber(resources.matchsticks)}</span>
          </div>
        </div>

        <div class="resource-item">
          <span class="resource-icon">💰</span>
          <div class="resource-details">
            <span class="resource-label">Money</span>
            <span class="resource-value">{formatCurrency(resources.money)}</span>
          </div>
        </div>

        <div class="resource-item">
          <span class="resource-icon">🏆</span>
          <div class="resource-details">
            <span class="resource-label">Achievement Points</span>
            <span class="resource-value">{achievements.totalPoints}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Game Controls -->
    <div class="controls-section">
      <button class="control-button" on:click={toggleHelp} title="Help & Tutorial">
        <span class="control-icon">❓</span>
      </button>
      
      <button class="control-button" on:click={toggleSettings} title="Settings">
        <span class="control-icon">⚙️</span>
      </button>

      <!-- Achievement Progress Indicator -->
      <div class="achievement-progress" title="Achievement Progress">
        <div class="progress-ring">
          <div 
            class="progress-fill" 
            style="transform: rotate({(achievements.unlockedAchievements?.length || 0) / Math.max(1, achievements.totalAchievements || 1) * 360}deg)"
          ></div>
        </div>
        <span class="progress-text">
          {achievements.unlockedAchievements?.length || 0}/{achievements.totalAchievements || 0}
        </span>
      </div>
    </div>
  </div>

  <!-- Quick Stats Bar -->
  <div class="stats-bar">
    <div class="stat-item">
      <span class="stat-label">Production Rate:</span>
      <span class="stat-value">{formatNumber($gameState.production.manualRate)}/click</span>
    </div>
    
    <div class="stat-item">
      <span class="stat-label">Market Price:</span>
      <span class="stat-value">{formatCurrency($gameState.market.currentPrice)}</span>
    </div>
    
    <div class="stat-item">
      <span class="stat-label">Auto-Clickers:</span>
      <span class="stat-value">{$gameState.automation.autoClickers.length}</span>
    </div>
    
    <div class="stat-item">
      <span class="stat-label">Total Produced:</span>
      <span class="stat-value">{formatNumber($gameState.production.totalProduced)}</span>
    </div>
  </div>
</header>

<style>
  .game-header {
    background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
    color: white;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    gap: 2rem;
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .game-title {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .title-icon {
    font-size: 2rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .version-badge {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 500;
    backdrop-filter: blur(10px);
  }

  .resources-section {
    flex: 1;
    display: flex;
    justify-content: center;
  }

  .resource-group {
    display: flex;
    gap: 2rem;
  }

  .resource-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.2s ease;
  }

  .resource-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
  }

  .resource-item.primary {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  }

  .resource-icon {
    font-size: 1.5rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .resource-details {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .resource-label {
    font-size: 0.8rem;
    opacity: 0.8;
    font-weight: 500;
  }

  .resource-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #ffffff;
  }

  .controls-section {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .control-button {
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }

  .control-button:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
  }

  .control-icon {
    font-size: 1.2rem;
    display: block;
  }

  .achievement-progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    backdrop-filter: blur(10px);
  }

  .progress-ring {
    position: relative;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: conic-gradient(#64ffda 0deg, rgba(255, 255, 255, 0.2) 0deg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .progress-fill {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: conic-gradient(#64ffda 0deg, transparent 0deg);
    transition: transform 0.3s ease;
  }

  .progress-text {
    font-size: 0.9rem;
    font-weight: 600;
    color: #64ffda;
  }

  .stats-bar {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0.75rem 2rem;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .stat-label {
    color: #b0bec5;
    font-weight: 500;
  }

  .stat-value {
    color: #64ffda;
    font-weight: 700;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .header-content {
      flex-direction: column;
      gap: 1rem;
    }

    .resource-group {
      gap: 1rem;
    }

    .stats-bar {
      flex-wrap: wrap;
      gap: 1rem;
    }
  }

  @media (max-width: 768px) {
    .header-content {
      padding: 1rem;
    }

    .game-title {
      font-size: 1.5rem;
    }

    .resource-group {
      flex-direction: column;
      gap: 0.5rem;
    }

    .resource-item {
      padding: 0.5rem;
    }

    .stats-bar {
      padding: 0.5rem 1rem;
    }

    .stat-item {
      font-size: 0.8rem;
    }
  }
</style> 
