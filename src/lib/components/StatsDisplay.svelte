<script lang="ts">
  import { gameState } from '$lib/shared/stores/gameState.js';
  import { formatNumber, formatCurrency, formatPercentage, formatDuration } from '$lib/shared/utils/formatting.js';

  // Reactive calculations
  $: resources = $gameState.resources;
  $: production = $gameState.production;
  $: market = $gameState.market;
  $: automation = $gameState.automation;
  $: achievements = $gameState.achievements;

  // Calculate net worth
  $: netWorth = resources.money + (Number(resources.matchsticks) * market.currentPrice);

  // Calculate total automation efficiency
  $: automationEfficiency = automation.autoClickers.length > 0 
    ? automation.autoClickers.reduce((sum, clicker) => sum + clicker.efficiency, 0) / automation.autoClickers.length
    : 0;

  // Calculate achievement completion rate
  $: achievementRate = achievements.totalPoints > 0 && achievements.unlockedAchievements 
    ? achievements.unlockedAchievements.length / Math.max(1, 20) // Approximate total achievements
    : 0;

  function getEfficiencyColor(efficiency: number): string {
    if (efficiency >= 0.9) return '#4caf50';
    if (efficiency >= 0.7) return '#ff9800';
    return '#f44336';
  }

  function getAchievementColor(rate: number): string {
    if (rate >= 0.8) return '#ffd700';
    if (rate >= 0.5) return '#64ffda';
    if (rate >= 0.2) return '#2196f3';
    return '#78909c';
  }
</script>

<div class="stats-display">
  <h3>📊 Game Stats</h3>

  <div class="stats-grid">
    <!-- Resources Section -->
    <div class="stat-section">
      <h4>💰 Resources</h4>
      <div class="stat-items">
        <div class="stat-item">
          <span class="stat-label">Net Worth:</span>
          <span class="stat-value important">{formatCurrency(netWorth)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Cash:</span>
          <span class="stat-value">{formatCurrency(resources.money)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Inventory:</span>
          <span class="stat-value">{formatNumber(resources.matchsticks)}</span>
        </div>
      </div>
    </div>

    <!-- Production Section -->
    <div class="stat-section">
      <h4>🔥 Production</h4>
      <div class="stat-items">
        <div class="stat-item">
          <span class="stat-label">Total Made:</span>
          <span class="stat-value">{formatNumber(production.totalProduced)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Manual Rate:</span>
          <span class="stat-value">{formatNumber(production.manualRate)}/click</span>
        </div>
      </div>
    </div>

    <!-- Market Section -->
    <div class="stat-section">
      <h4>📈 Market</h4>
      <div class="stat-items">
        <div class="stat-item">
          <span class="stat-label">Price:</span>
          <span class="stat-value">{formatCurrency(market.currentPrice)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Total Sold:</span>
          <span class="stat-value">{formatNumber(market.totalSold)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Revenue:</span>
          <span class="stat-value">{formatCurrency(market.totalRevenue)}</span>
        </div>
      </div>
    </div>

    <!-- Automation Section -->
    <div class="stat-section">
      <h4>⚙️ Automation</h4>
      <div class="stat-items">
        <div class="stat-item">
          <span class="stat-label">Auto-Clickers:</span>
          <span class="stat-value">{automation.autoClickers.length}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Total Spent:</span>
          <span class="stat-value">{formatCurrency(automation.totalMoneySpent)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Efficiency:</span>
          <span 
            class="stat-value" 
            style="color: {getEfficiencyColor(automationEfficiency)}"
          >
            {formatPercentage(automationEfficiency)}
          </span>
        </div>
      </div>
    </div>

    <!-- Achievements Section -->
    <div class="stat-section">
      <h4>🏆 Achievements</h4>
      <div class="stat-items">
        <div class="stat-item">
          <span class="stat-label">Unlocked:</span>
          <span class="stat-value">{achievements.unlockedAchievements?.length || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Points:</span>
          <span class="stat-value">{achievements.totalPoints}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Progress:</span>
          <span 
            class="stat-value"
            style="color: {getAchievementColor(achievementRate)}"
          >
            {formatPercentage(achievementRate)}
          </span>
        </div>
      </div>
    </div>

    <!-- Performance Section -->
    <div class="stat-section">
      <h4>⚡ Performance</h4>
      <div class="stat-items">
        <div class="stat-item">
          <span class="stat-label">Game Version:</span>
          <span class="stat-value">{$gameState.metadata.version || '1.0.0'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Session Time:</span>
          <span class="stat-value">{formatDuration(Date.now() - ($gameState.metadata.createdAt || Date.now()))}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Quick Performance Indicators -->
  <div class="performance-indicators">
    <div class="indicator-item">
      <div class="indicator-label">Production</div>
      <div class="indicator-bar">
        <div 
          class="indicator-fill production" 
          style="width: {Math.min(100, (Number(production.totalProduced) / 1000) * 100)}%"
        ></div>
      </div>
    </div>

    <div class="indicator-item">
      <div class="indicator-label">Automation</div>
      <div class="indicator-bar">
        <div 
          class="indicator-fill automation" 
          style="width: {Math.min(100, automation.autoClickers.length * 10)}%"
        ></div>
      </div>
    </div>

    <div class="indicator-item">
      <div class="indicator-label">Market</div>
      <div class="indicator-bar">
        <div 
          class="indicator-fill market" 
          style="width: {Math.min(100, (market.totalRevenue / 1000) * 100)}%"
        ></div>
      </div>
    </div>

    <div class="indicator-item">
      <div class="indicator-label">Achievements</div>
      <div class="indicator-bar">
        <div 
          class="indicator-fill achievements" 
          style="width: {achievementRate * 100}%"
        ></div>
      </div>
    </div>
  </div>
</div>

<style>
  .stats-display {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .stats-display h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.2rem;
    font-weight: 700;
    color: #64ffda;
    text-align: center;
  }

  .stats-grid {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .stat-section {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .stat-section h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #b0bec5;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .stat-items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
  }

  .stat-label {
    color: #78909c;
    font-weight: 500;
  }

  .stat-value {
    color: #eceff1;
    font-weight: 600;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .stat-value.important {
    color: #64ffda;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .performance-indicators {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .indicator-item {
    margin-bottom: 0.75rem;
  }

  .indicator-label {
    font-size: 0.8rem;
    color: #b0bec5;
    margin-bottom: 0.25rem;
    font-weight: 500;
  }

  .indicator-bar {
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .indicator-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  .indicator-fill.production {
    background: linear-gradient(90deg, #ff6b6b 0%, #ee5a24 100%);
  }

  .indicator-fill.automation {
    background: linear-gradient(90deg, #2196f3 0%, #64b5f6 100%);
  }

  .indicator-fill.market {
    background: linear-gradient(90deg, #4caf50 0%, #81c784 100%);
  }

  .indicator-fill.achievements {
    background: linear-gradient(90deg, #ffd700 0%, #ffed4e 100%);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .stats-display {
      padding: 1rem;
    }

    .stats-grid {
      gap: 1rem;
    }

    .stat-section {
      padding: 0.75rem;
    }

    .stat-item {
      font-size: 0.8rem;
    }
  }

  /* Custom scrollbar */
  .stats-grid::-webkit-scrollbar {
    width: 4px;
  }

  .stats-grid::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
  }

  .stats-grid::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .stats-grid::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style> 
