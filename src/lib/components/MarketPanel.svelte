<script lang="ts">
  import { gameState } from '$lib/shared/stores/gameState.js';
  import { marketService } from '$lib/shared/services/index.js';
  import { formatNumber, formatCurrency, formatPercentage } from '$lib/shared/utils/formatting.js';
  
  let sellAmount = 1n;
  let sellAmountInput = '1';

  // Reactive market data
  $: marketAnalysis = marketService.getMarketAnalysis();
  $: recentTrades = marketService.getRecentTrades().slice(0, 10);
  $: currentPrice = $gameState.market.currentPrice;
  $: availableMatchsticks = $gameState.resources.matchsticks;

  function handleSell() {
    if (sellAmount > 0n && sellAmount <= availableMatchsticks) {
      const result = marketService.sellMatchsticks(sellAmount);
      console.log('Sale result:', result);
      
      // Reset sell amount
      sellAmount = 1n;
      sellAmountInput = '1';
    }
  }

  function setSellAmount(amount: string) {
    try {
      const parsed = BigInt(amount || '0');
      if (parsed >= 0n) {
        sellAmount = parsed;
        sellAmountInput = amount;
      }
    } catch {
      // Invalid BigInt, keep previous value
    }
  }

  function sellAll() {
    sellAmount = availableMatchsticks;
    sellAmountInput = availableMatchsticks.toString();
  }

  function sellHalf() {
    const half = availableMatchsticks / 2n;
    sellAmount = half;
    sellAmountInput = half.toString();
  }

  function sellQuarter() {
    const quarter = availableMatchsticks / 4n;
    sellAmount = quarter;
    sellAmountInput = quarter.toString();
  }

  function getTrendIcon(trend: string): string {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  }

  function getTrendColor(trend: string): string {
    switch (trend) {
      case 'up': return '#4caf50';
      case 'down': return '#f44336';
      default: return '#78909c';
    }
  }
</script>

<div class="market-panel">
  <div class="panel-header">
    <h2>📈 Market Trading</h2>
    <p class="panel-description">Sell your matchsticks and track market trends!</p>
  </div>

  <div class="market-content">
    <!-- Trading Section -->
    <div class="market-section trading-section">
      <h3>💰 Sell Matchsticks</h3>
      
      <div class="trading-container">
        <!-- Current Price Display -->
        <div class="price-display">
          <div class="price-info">
            <span class="price-label">Current Price:</span>
            <span class="price-value">{formatCurrency(currentPrice)}</span>
          </div>
          <div class="trend-info" style="color: {getTrendColor($gameState.market.trend)}">
            {getTrendIcon($gameState.market.trend)}
            {$gameState.market.trend || 'stable'}
          </div>
        </div>

        <!-- Sell Controls -->
        <div class="sell-controls">
          <div class="amount-input">
            <label for="sell-amount">Amount to Sell:</label>
            <input 
              id="sell-amount"
              type="text" 
              bind:value={sellAmountInput}
              on:input={(e) => setSellAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          
          <div class="quick-amounts">
            <button class="quick-btn" on:click={sellQuarter}>25%</button>
            <button class="quick-btn" on:click={sellHalf}>50%</button>
            <button class="quick-btn" on:click={sellAll}>All</button>
          </div>
        </div>

        <!-- Sale Preview -->
        <div class="sale-preview">
          <div class="preview-item">
            <span class="label">Selling:</span>
            <span class="value">{formatNumber(sellAmount)} matchsticks</span>
          </div>
          <div class="preview-item">
            <span class="label">Revenue:</span>
            <span class="value">{formatCurrency(Number(sellAmount) * currentPrice)}</span>
          </div>
          <div class="preview-item">
            <span class="label">Remaining:</span>
            <span class="value">{formatNumber(availableMatchsticks - sellAmount)}</span>
          </div>
        </div>

        <!-- Sell Button -->
        <button 
          class="sell-button"
          on:click={handleSell}
          disabled={sellAmount <= 0n || sellAmount > availableMatchsticks || availableMatchsticks === 0n}
        >
          Sell Matchsticks
        </button>
      </div>
    </div>

    <!-- Market Analysis -->
    <div class="market-section">
      <h3>📊 Market Analysis</h3>
      <div class="analysis-grid">
        <div class="analysis-card">
          <div class="analysis-header">
            <span class="analysis-icon">📈</span>
            <span class="analysis-title">Price Trend</span>
          </div>
          <div class="analysis-value">
            {marketAnalysis?.trend || 'Stable'}
          </div>
        </div>

        <div class="analysis-card">
          <div class="analysis-header">
            <span class="analysis-icon">📉</span>
            <span class="analysis-title">Volatility</span>
          </div>
          <div class="analysis-value">
            {formatPercentage(marketAnalysis?.volatility || 0)}
          </div>
        </div>

        <div class="analysis-card">
          <div class="analysis-header">
            <span class="analysis-icon">💹</span>
            <span class="analysis-title">Volume</span>
          </div>
          <div class="analysis-value">
            {formatNumber(marketAnalysis?.averageVolume || 0)}
          </div>
        </div>

        <div class="analysis-card">
          <div class="analysis-header">
            <span class="analysis-icon">🎯</span>
            <span class="analysis-title">Recommendation</span>
          </div>
          <div class="analysis-value">
            {marketAnalysis?.recommendation || 'Hold'}
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Trades -->
    <div class="market-section">
      <h3>📋 Recent Trades</h3>
      <div class="trades-container">
        {#if recentTrades.length > 0}
          <div class="trades-list">
            {#each recentTrades as trade}
              <div class="trade-item">
                <div class="trade-info">
                  <span class="trade-amount">{formatNumber(trade.matchsticksSold)}</span>
                  <span class="trade-separator">@</span>
                  <span class="trade-price">{formatCurrency(trade.pricePerUnit)}</span>
                </div>
                <div class="trade-revenue">{formatCurrency(trade.totalRevenue)}</div>
                <div class="trade-time">
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-trades">
            <span class="empty-icon">📊</span>
            <span class="empty-text">No trades yet. Start selling to see your trading history!</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Market Statistics -->
    <div class="market-section">
      <h3>📈 Market Statistics</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-label">Total Revenue</div>
            <div class="stat-value">{formatCurrency($gameState.market.totalRevenue)}</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-content">
            <div class="stat-label">Total Sold</div>
            <div class="stat-value">{formatNumber($gameState.market.totalSold)}</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-label">Avg Price</div>
            <div class="stat-value">
              {formatCurrency($gameState.market.totalRevenue / Number($gameState.market.totalSold || 1n))}
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <div class="stat-label">Market Share</div>
            <div class="stat-value">{formatPercentage(0.05)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .market-panel {
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

  .market-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    overflow-y: auto;
  }

  .market-section {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .market-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.3rem;
    font-weight: 600;
    color: #64ffda;
  }

  .trading-section {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(129, 199, 132, 0.05) 100%);
    border-color: rgba(76, 175, 80, 0.2);
  }

  .trading-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .price-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .price-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .price-label {
    font-size: 0.9rem;
    color: #b0bec5;
  }

  .price-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #4caf50;
  }

  .trend-info {
    font-size: 1.1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .sell-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .amount-input {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .amount-input label {
    font-size: 0.9rem;
    color: #b0bec5;
    font-weight: 500;
  }

  .amount-input input {
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #ffffff;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .amount-input input:focus {
    outline: none;
    border-color: #64ffda;
    box-shadow: 0 0 0 2px rgba(100, 255, 218, 0.2);
  }

  .quick-amounts {
    display: flex;
    gap: 0.5rem;
  }

  .quick-btn {
    flex: 1;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .quick-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .sale-preview {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .preview-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }

  .preview-item .label {
    color: #b0bec5;
  }

  .preview-item .value {
    color: #ffffff;
    font-weight: 600;
  }

  .sell-button {
    padding: 1rem;
    background: linear-gradient(135deg, #4caf50 0%, #81c784 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sell-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
  }

  .sell-button:disabled {
    background: rgba(255, 255, 255, 0.1);
    color: #78909c;
    cursor: not-allowed;
  }

  .analysis-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .analysis-card {
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .analysis-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .analysis-icon {
    font-size: 1.2rem;
  }

  .analysis-title {
    font-size: 0.9rem;
    color: #b0bec5;
    font-weight: 500;
  }

  .analysis-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #64ffda;
  }

  .trades-container {
    max-height: 300px;
    overflow-y: auto;
  }

  .trades-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .trade-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    font-size: 0.9rem;
  }

  .trade-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .trade-amount {
    color: #64ffda;
    font-weight: 600;
  }

  .trade-separator {
    color: #78909c;
  }

  .trade-price {
    color: #ffffff;
    font-weight: 500;
  }

  .trade-revenue {
    color: #4caf50;
    font-weight: 700;
  }

  .trade-time {
    color: #78909c;
    font-size: 0.8rem;
  }

  .empty-trades {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
    color: #78909c;
    text-align: center;
  }

  .empty-icon {
    font-size: 2rem;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 0.9rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .stat-icon {
    font-size: 1.5rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .stat-content {
    flex: 1;
  }

  .stat-label {
    font-size: 0.85rem;
    color: #b0bec5;
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 1rem;
    font-weight: 700;
    color: #64ffda;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .analysis-grid,
    .stats-grid {
      grid-template-columns: 1fr 1fr;
    }

    .trade-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }
</style> 
