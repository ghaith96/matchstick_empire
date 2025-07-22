<script lang="ts">
  export let activeTab: string;
  export let onTabChange: (tab: string) => void;

  const tabs = [
    { id: 'production', label: 'Production', icon: '🔥', shortcut: '1' },
    { id: 'automation', label: 'Automation', icon: '⚙️', shortcut: '2' },
    { id: 'market', label: 'Market', icon: '📈', shortcut: '3' },
    { id: 'achievements', label: 'Achievements', icon: '🏆', shortcut: '4' }
  ];

  function handleTabClick(tabId: string) {
    onTabChange(tabId);
  }
</script>

<nav class="tab-navigation">
  <div class="tab-list">
    {#each tabs as tab}
      <button 
        class="tab-button" 
        class:active={activeTab === tab.id}
        on:click={() => handleTabClick(tab.id)}
        title="{tab.label} (Shortcut: {tab.shortcut})"
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
        <span class="tab-shortcut">{tab.shortcut}</span>
      </button>
    {/each}
  </div>
  
  <!-- Active tab indicator -->
  <div class="tab-indicator" style="transform: translateX({tabs.findIndex(t => t.id === activeTab) * 100}%)"></div>
</nav>

<style>
  .tab-navigation {
    position: relative;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  .tab-list {
    display: flex;
    width: 100%;
  }

  .tab-button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    z-index: 2;
  }

  .tab-button:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.05);
  }

  .tab-button.active {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
  }

  .tab-icon {
    font-size: 1.2rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .tab-label {
    font-weight: 600;
  }

  .tab-shortcut {
    font-size: 0.8rem;
    opacity: 0.6;
    background: rgba(255, 255, 255, 0.1);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    min-width: 1.5rem;
    text-align: center;
  }

  .tab-button.active .tab-shortcut {
    background: rgba(255, 255, 255, 0.2);
    opacity: 0.8;
  }

  .tab-indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    width: 25%; /* 100% / 4 tabs */
    background: linear-gradient(90deg, #64ffda 0%, #1de9b6 100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 3px 3px 0 0;
    box-shadow: 0 -2px 8px rgba(100, 255, 218, 0.5);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .tab-button {
      padding: 0.75rem 0.5rem;
      gap: 0.5rem;
    }

    .tab-label {
      display: none;
    }

    .tab-button {
      flex-direction: column;
      gap: 0.25rem;
    }

    .tab-icon {
      font-size: 1.5rem;
    }

    .tab-shortcut {
      font-size: 0.7rem;
    }
  }

  @media (max-width: 480px) {
    .tab-shortcut {
      display: none;
    }
  }
</style> 
