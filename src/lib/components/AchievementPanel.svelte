<script lang="ts">
  import { gameState } from '$lib/shared/stores/gameState.js';
  import { achievementService } from '$lib/shared/services/index.js';
  import { formatProgress, formatNumber, formatPercentage } from '$lib/shared/utils/formatting.js';
  
  let selectedCategory: string = 'all';
  let selectedDifficulty: string = 'all';

  // Reactive achievement data
  $: achievements = achievementService.getAvailableAchievements();
  $: achievementStats = achievementService.getStats();
  $: unlockedAchievements = $gameState.achievements.unlockedAchievements || [];

  // Filter achievements
  $: filteredAchievements = achievements.filter(achievement => {
    const categoryMatch = selectedCategory === 'all' || achievement.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || achievement.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  function isUnlocked(achievementId: string): boolean {
    return unlockedAchievements.some(a => a.id === achievementId);
  }

  function getAchievementProgress(achievementId: string) {
    return achievementService.getAchievementProgress(achievementId);
  }

  function getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'hard': return '#f44336';
      case 'extreme': return '#9c27b0';
      case 'legendary': return '#ffd700';
      default: return '#78909c';
    }
  }

  function getDifficultyPoints(difficulty: string): number {
    switch (difficulty) {
      case 'easy': return 10;
      case 'medium': return 25;
      case 'hard': return 50;
      case 'extreme': return 100;
      case 'legendary': return 250;
      default: return 10;
    }
  }

  function getCategoryIcon(category: string): string {
    switch (category) {
      case 'production': return '🔥';
      case 'trading': return '💰';
      case 'automation': return '⚙️';
      case 'progression': return '📈';
      case 'special': return '✨';
      case 'hidden': return '🔍';
      default: return '🏆';
    }
  }
</script>

<div class="achievement-panel">
  <div class="panel-header">
    <h2>🏆 Achievements</h2>
    <p class="panel-description">Track your progress and unlock rewards!</p>
  </div>

  <div class="achievement-content">
    <!-- Achievement Stats Overview -->
    <div class="stats-overview">
      <div class="overview-card">
        <div class="overview-header">
          <span class="overview-icon">🏆</span>
          <span class="overview-title">Total Progress</span>
        </div>
        <div class="overview-value">
          {achievementStats.unlockedAchievements}/{achievementStats.totalAchievements}
        </div>
        <div class="overview-progress">
          <div class="progress-bar">
            <div 
              class="progress-fill"
              style="width: {achievementStats.completionPercentage}%"
            ></div>
          </div>
          <span class="progress-text">{formatPercentage(achievementStats.completionPercentage / 100)}</span>
        </div>
      </div>

      <div class="overview-card">
        <div class="overview-header">
          <span class="overview-icon">⭐</span>
          <span class="overview-title">Achievement Points</span>
        </div>
        <div class="overview-value">
          {formatNumber(achievementStats.achievementPoints)}
        </div>
        <div class="overview-subtitle">
          Total earned points
        </div>
      </div>

      <div class="overview-card">
        <div class="overview-header">
          <span class="overview-icon">🎯</span>
          <span class="overview-title">Recent Unlocks</span>
        </div>
        <div class="overview-value">
          {achievementStats.recentUnlocks?.length}
        </div>
        <div class="overview-subtitle">
          Last 10 achievements
        </div>
      </div>
    </div>

    <!-- Category Progress -->
    <div class="category-progress">
      <h3>📊 Progress by Category</h3>
      <div class="category-grid">
        {#each Object.entries(achievementStats.categoryProgress || {}) as [category, progress]}
          <div class="category-card">
            <div class="category-header">
              <span class="category-icon">{getCategoryIcon(category)}</span>
              <span class="category-name">{category}</span>
            </div>
            <div class="category-stats">
              <span class="category-count">{progress.unlocked}/{progress.total}</span>
              <div class="category-bar">
                <div 
                  class="category-fill"
                  style="width: {progress.total > 0 ? (progress.unlocked / progress.total) * 100 : 0}%"
                ></div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Filters -->
    <div class="achievement-filters">
      <div class="filter-group">
        <label>Category:</label>
        <select bind:value={selectedCategory}>
          <option value="all">All Categories</option>
          <option value="production">Production</option>
          <option value="trading">Trading</option>
          <option value="automation">Automation</option>
          <option value="progression">Progression</option>
          <option value="special">Special</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Difficulty:</label>
        <select bind:value={selectedDifficulty}>
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="extreme">Extreme</option>
          <option value="legendary">Legendary</option>
        </select>
      </div>
    </div>

    <!-- Achievement List -->
    <div class="achievement-list">
      {#each filteredAchievements as achievement}
        {@const unlocked = isUnlocked(achievement.id)}
        {@const progress = getAchievementProgress(achievement.id)}
        
        <div class="achievement-card" class:unlocked>
          <div class="achievement-main">
            <div class="achievement-icon">
              {#if unlocked}
                {achievement.icon}
              {:else}
                🔒
              {/if}
            </div>
            
            <div class="achievement-info">
              <div class="achievement-header">
                <h4 class="achievement-name">
                  {unlocked || !achievement.isHidden ? achievement.name : '???'}
                </h4>
                <div class="achievement-badges">
                  <span 
                    class="difficulty-badge"
                    style="background-color: {getDifficultyColor(achievement.difficulty)}; color: white;"
                  >
                    {achievement.difficulty}
                  </span>
                  <span class="points-badge">
                    {getDifficultyPoints(achievement.difficulty)} pts
                  </span>
                </div>
              </div>
              
              <p class="achievement-description">
                {unlocked || !achievement.isHidden ? achievement.description : 'Hidden achievement - unlock to reveal!'}
              </p>
              
              {#if achievement.hints && !unlocked && achievement.isHidden}
                <div class="achievement-hints">
                  <strong>Hints:</strong>
                  <ul>
                    {#each achievement.hints as hint}
                      <li>{hint}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          </div>

          {#if !unlocked && progress}
            <div class="achievement-progress">
              <div class="progress-header">
                <span class="progress-label">Progress:</span>
                <span class="progress-value">
                  {formatProgress(progress.currentValue, progress.targetValue)}
                </span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill"
                  style="width: {progress.progress * 100}%"
                ></div>
              </div>
            </div>
          {/if}

          {#if unlocked}
            <div class="achievement-unlocked">
              <span class="unlocked-icon">✅</span>
              <span class="unlocked-text">
                Unlocked {new Date(unlockedAchievements.find(a => a.id === achievement.id)?.unlockedAt || 0).toLocaleDateString()}
              </span>
            </div>
          {/if}

          {#if achievement.reward}
            <div class="achievement-reward">
              <span class="reward-label">Reward:</span>
              <span class="reward-value">
                {#if achievement.reward.type === 'money'}
                  💰 ${achievement.reward.amount}
                {:else if achievement.reward.type === 'production_multiplier'}
                  ⚡ {achievement.reward.amount}x Production
                {:else if achievement.reward.type === 'special_unlock'}
                  🎁 {achievement.reward.item}
                {:else}
                  🎁 Special Reward
                {/if}
              </span>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Next Milestones -->
    {#if achievementStats.nextMilestones?.length > 0}
      <div class="next-milestones">
        <h3>🎯 Upcoming Milestones</h3>
        <div class="milestone-list">
          {#each achievementStats.nextMilestones as milestone}
            {@const progress = getAchievementProgress(milestone.id)}
            <div class="milestone-card">
              <div class="milestone-icon">{milestone.icon}</div>
              <div class="milestone-info">
                <h4>{milestone.name}</h4>
                <p>{milestone.description}</p>
                {#if progress}
                  <div class="milestone-progress">
                    <span>{formatProgress(progress.currentValue, progress.targetValue)}</span>
                    <div class="progress-bar small">
                      <div 
                        class="progress-fill"
                        style="width: {progress.progress * 100}%"
                      ></div>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .achievement-panel {
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

  .achievement-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    overflow-y: auto;
  }

  .stats-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .overview-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .overview-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .overview-icon {
    font-size: 1.5rem;
  }

  .overview-title {
    font-size: 0.9rem;
    color: #b0bec5;
    font-weight: 500;
  }

  .overview-value {
    font-size: 2rem;
    font-weight: 700;
    color: #64ffda;
    margin-bottom: 0.5rem;
  }

  .overview-progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .overview-subtitle {
    font-size: 0.8rem;
    color: #78909c;
  }

  .progress-bar {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-bar.small {
    height: 4px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #64ffda 0%, #1de9b6 100%);
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.8rem;
    color: #64ffda;
    font-weight: 600;
  }

  .category-progress h3 {
    margin: 0 0 1rem 0;
    font-size: 1.3rem;
    font-weight: 600;
    color: #64ffda;
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .category-card {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .category-icon {
    font-size: 1.2rem;
  }

  .category-name {
    font-size: 0.9rem;
    color: #b0bec5;
    text-transform: capitalize;
    font-weight: 500;
  }

  .category-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .category-count {
    font-size: 1.1rem;
    font-weight: 700;
    color: #64ffda;
  }

  .category-bar {
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .category-fill {
    height: 100%;
    background: linear-gradient(90deg, #ffd700 0%, #ffed4e 100%);
    transition: width 0.3s ease;
  }

  .achievement-filters {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-group label {
    font-size: 0.9rem;
    color: #b0bec5;
    font-weight: 500;
  }

  .filter-group select {
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: #ffffff;
    font-size: 0.9rem;
  }

  .achievement-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .achievement-card {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.2s ease;
  }

  .achievement-card.unlocked {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 235, 59, 0.05) 100%);
    border-color: rgba(255, 215, 0, 0.3);
  }

  .achievement-card:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateY(-2px);
  }

  .achievement-main {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .achievement-icon {
    font-size: 3rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .achievement-info {
    flex: 1;
  }

  .achievement-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
    gap: 1rem;
  }

  .achievement-name {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: #ffffff;
  }

  .achievement-badges {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .difficulty-badge,
  .points-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .points-badge {
    background: rgba(100, 255, 218, 0.2);
    color: #64ffda;
  }

  .achievement-description {
    margin: 0 0 0.5rem 0;
    color: #b0bec5;
    line-height: 1.4;
  }

  .achievement-hints {
    font-size: 0.9rem;
    color: #78909c;
  }

  .achievement-hints ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1.5rem;
  }

  .achievement-hints li {
    margin-bottom: 0.25rem;
  }

  .achievement-progress {
    margin-bottom: 1rem;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .progress-label {
    font-size: 0.9rem;
    color: #b0bec5;
  }

  .progress-value {
    font-size: 0.9rem;
    color: #64ffda;
    font-weight: 600;
  }

  .achievement-unlocked {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    color: #4caf50;
  }

  .unlocked-icon {
    font-size: 1.2rem;
  }

  .achievement-reward {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
  }

  .reward-label {
    font-size: 0.9rem;
    color: #b0bec5;
  }

  .reward-value {
    font-size: 0.9rem;
    color: #ffd700;
    font-weight: 600;
  }

  .next-milestones h3 {
    margin: 0 0 1rem 0;
    font-size: 1.3rem;
    font-weight: 600;
    color: #64ffda;
  }

  .milestone-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .milestone-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .milestone-icon {
    font-size: 2rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .milestone-info {
    flex: 1;
  }

  .milestone-info h4 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #ffffff;
  }

  .milestone-info p {
    margin: 0 0 0.5rem 0;
    color: #b0bec5;
    font-size: 0.9rem;
  }

  .milestone-progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #64ffda;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .achievement-filters {
      flex-direction: column;
    }

    .achievement-main {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .achievement-header {
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .stats-overview,
    .category-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style> 
