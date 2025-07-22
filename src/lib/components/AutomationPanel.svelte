<script lang="ts">
  import { gameState } from '$lib/shared/stores/gameState.js';
  import { automationService } from '$lib/shared/services/index.js';
  import { formatCurrency, formatNumber } from '$lib/shared/utils/formatting.js';

  // Get available automation options - make reactive to game state changes
  $: autoClickers = $gameState.automation && automationService.getAvailableAutoClickers();
  $: facilities = $gameState.automation && automationService.getAvailableFacilities();
  $: automationStats = $gameState.automation && automationService.getAutomationStats();

  function purchaseAutoClicker(clickerId: string) {
    const result = automationService.purchaseAutoClicker(clickerId);
    console.log('Auto-clicker purchase result:', result);
  }

  function purchaseFacility(facilityId: string) {
    const result = automationService.purchaseFacility(facilityId);
    console.log('Facility purchase result:', result);
  }

  // Helper function to get unlock requirement text
  function getUnlockRequirementText(requirement: any): string {
    if (!requirement) return '';

    const parts: string[] = [];
    
    if (requirement.totalProduced) {
      parts.push(`${formatNumber(Number(requirement.totalProduced))} total production`);
    }
    
    if (requirement.totalRevenue) {
      parts.push(`${formatCurrency(requirement.totalRevenue)} total revenue`);
    }
    
    if (requirement.autoClickersOwned) {
      parts.push(`${requirement.autoClickersOwned} auto-clickers owned`);
    }
    
    if (requirement.gamePhase) {
      parts.push(`${requirement.gamePhase} phase`);
    }

    return parts.length > 0 ? `Requires: ${parts.join(' + ')}` : 'Requirements not met';
  }

  // Helper function to get button text and state
  function getButtonState(item: any, itemType: 'clicker' | 'facility') {
    if (!item.isUnlocked) {
      return {
        text: getUnlockRequirementText(item.unlockRequirement),
        disabled: true,
        variant: 'locked'
      };
    }
    
    if (item.isMaxed) {
      const maxText = itemType === 'clicker' 
        ? `Max Level (${item.currentLevel}/${item.maxLevel})`
        : `Max Owned (${item.owned}/${item.maxOwned})`;
      return {
        text: maxText,
        disabled: true,
        variant: 'maxed'
      };
    }
    
    if ($gameState.resources.money < item.cost) {
      return {
        text: `Buy for ${formatCurrency(item.cost)}`,
        disabled: true,
        variant: 'insufficient'
      };
    }
    
    return {
      text: `Buy for ${formatCurrency(item.cost)}`,
      disabled: false,
      variant: 'available'
    };
  }
</script>

<div class="automation-panel">
  <div class="panel-header">
    <h2>⚙️ Automation Center</h2>
    <p class="panel-description">Automate your production and scale your empire!</p>
  </div>

  <div class="automation-content">
    <!-- Auto-Clickers Section -->
    <div class="automation-section">
      <h3>🖱️ Auto-Clickers</h3>
      <p class="section-description">Automatically click to produce matchsticks even when you're away</p>
      
      <div class="automation-grid">
        {#each autoClickers as clicker}
          {@const buttonState = getButtonState(clicker, 'clicker')}
          <div class="automation-card" class:locked={!clicker.isUnlocked} class:maxed={clicker.isMaxed}>
            <div class="card-header">
              <div class="card-icon">{clicker.icon || '🖱️'}</div>
              <div class="card-info">
                <h4>{clicker.name}</h4>
                <p>{clicker.description}</p>
                {#if !clicker.isUnlocked}
                  <div class="unlock-requirement">
                    🔒 {getUnlockRequirementText(clicker.unlockRequirement)}
                  </div>
                {/if}
              </div>
            </div>
            
            <div class="card-stats">
              <div class="stat">
                <span class="label">Rate:</span>
                <span class="value">{formatNumber(clicker.baseClicksPerSecond)}/sec</span>
              </div>
              <div class="stat">
                <span class="label">Level:</span>
                <span class="value">{clicker.currentLevel}/{clicker.maxLevel}</span>
              </div>
            </div>
            
            <button 
              class="purchase-button"
              class:locked={buttonState.variant === 'locked'}
              class:maxed={buttonState.variant === 'maxed'}
              class:insufficient={buttonState.variant === 'insufficient'}
              class:available={buttonState.variant === 'available'}
              on:click={() => purchaseAutoClicker(clicker.id)}
              disabled={buttonState.disabled}
            >
              {buttonState.text}
            </button>
          </div>
        {/each}
      </div>
    </div>

    <!-- Production Facilities Section -->
    <div class="automation-section">
      <h3>🏭 Production Facilities</h3>
      <p class="section-description">Build facilities that automatically produce matchsticks</p>
      
      <div class="automation-grid">
        {#each facilities as facility}
          {@const buttonState = getButtonState(facility, 'facility')}
          <div class="automation-card" class:locked={!facility.isUnlocked} class:maxed={facility.isMaxed}>
            <div class="card-header">
              <div class="card-icon">{facility.icon || '🏭'}</div>
              <div class="card-info">
                <h4>{facility.name}</h4>
                <p>{facility.description}</p>
                {#if !facility.isUnlocked}
                  <div class="unlock-requirement">
                    🔒 {getUnlockRequirementText(facility.unlockRequirement)}
                  </div>
                {/if}
              </div>
            </div>
            
            <div class="card-stats">
              <div class="stat">
                <span class="label">Production:</span>
                <span class="value">{formatNumber(Number(facility.baseProduction))}/sec</span>
              </div>
              <div class="stat">
                <span class="label">Owned:</span>
                <span class="value">{facility.owned}/{facility.maxOwned}</span>
              </div>
            </div>
            
            <button 
              class="purchase-button"
              class:locked={buttonState.variant === 'locked'}
              class:maxed={buttonState.variant === 'maxed'}
              class:insufficient={buttonState.variant === 'insufficient'}
              class:available={buttonState.variant === 'available'}
              on:click={() => purchaseFacility(facility.id)}
              disabled={buttonState.disabled}
            >
              {buttonState.text}
            </button>
          </div>
        {/each}
      </div>
    </div>

    <!-- Automation Stats -->
    <div class="automation-section">
      <h3>📊 Automation Statistics</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-label">Total Investment</div>
            <div class="stat-value">{formatCurrency(automationStats.totalMoneySpent)}</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-content">
            <div class="stat-label">Auto Production</div>
            <div class="stat-value">{formatNumber(Number(automationStats.autoProductionRate))}/sec</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🏭</div>
          <div class="stat-content">
            <div class="stat-label">Facilities</div>
            <div class="stat-value">{automationStats.totalFacilities}</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🖱️</div>
          <div class="stat-content">
            <div class="stat-label">Auto-Clickers</div>
            <div class="stat-value">{automationStats.totalAutoClickers}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .automation-panel {
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

  .automation-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    overflow-y: auto;
  }

  .automation-section {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .automation-section h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.3rem;
    font-weight: 600;
    color: #64ffda;
  }

  .section-description {
    margin: 0 0 1.5rem 0;
    color: #b0bec5;
    font-size: 0.9rem;
  }

  .automation-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .automation-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
  }

  .automation-card:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }

  .automation-card.locked {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 193, 7, 0.3);
    opacity: 0.7;
  }

  .automation-card.maxed {
    background: rgba(76, 175, 80, 0.05);
    border: 1px solid rgba(76, 175, 80, 0.3);
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .card-icon {
    font-size: 2rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .card-info {
    flex: 1;
  }

  .card-info h4 {
    margin: 0 0 0.25rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #ffffff;
  }

  .card-info p {
    margin: 0;
    font-size: 0.9rem;
    color: #b0bec5;
    line-height: 1.4;
  }

  .unlock-requirement {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 193, 7, 0.1);
    border-radius: 4px;
    font-size: 0.8rem;
    color: #ffc107;
    border: 1px solid rgba(255, 193, 7, 0.2);
  }

  .card-stats {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat .label {
    font-size: 0.8rem;
    color: #78909c;
  }

  .stat .value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #64ffda;
  }

  .purchase-button {
    width: 100%;
    padding: 0.75rem;
    border: none;
    border-radius: 6px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .purchase-button.available {
    background: linear-gradient(135deg, #2196f3 0%, #64b5f6 100%);
  }

  .purchase-button.available:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
  }

  .purchase-button.insufficient {
    background: rgba(255, 152, 0, 0.3);
    border: 1px solid rgba(255, 152, 0, 0.5);
    color: #ffab40;
    cursor: not-allowed;
  }

  .purchase-button.locked {
    background: rgba(255, 193, 7, 0.2);
    border: 1px solid rgba(255, 193, 7, 0.4);
    color: #ffc107;
    cursor: not-allowed;
  }

  .purchase-button.maxed {
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid rgba(76, 175, 80, 0.4);
    color: #81c784;
    cursor: not-allowed;
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
    .automation-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style> 
