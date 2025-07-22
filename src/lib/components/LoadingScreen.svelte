<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  export let show = true;
  export let message = 'Initializing Matchstick Empire...';
  export let progress = 0; // 0-100

  let dots = '';
  let animationFrame: number;

  onMount(() => {
    // Animate loading dots
    let dotCount = 0;
    const interval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      dots = '.'.repeat(dotCount);
    }, 500);

    // Simulate progress animation
    let currentProgress = 0;
    const progressAnimation = () => {
      if (currentProgress < progress) {
        currentProgress += Math.random() * 2;
        if (currentProgress > progress) currentProgress = progress;
      }
      animationFrame = requestAnimationFrame(progressAnimation);
    };
    progressAnimation();

    return () => {
      clearInterval(interval);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  });
</script>

{#if show}
  <div class="loading-overlay" transition:fade={{ duration: 500 }}>
    <div class="loading-container" transition:scale={{ duration: 800, easing: quintOut }}>
      <!-- Logo/Icon -->
      <div class="loading-icon">
        <div class="matchstick-container">
          <div class="matchstick">
            <div class="matchstick-head"></div>
            <div class="matchstick-body"></div>
          </div>
          <div class="flame" class:burning={progress > 20}>🔥</div>
        </div>
      </div>

      <!-- Game Title -->
      <h1 class="loading-title">
        <span class="title-word">Matchstick</span>
        <span class="title-word empire">Empire</span>
      </h1>

      <!-- Loading Message -->
      <div class="loading-message">
        {message}{dots}
      </div>

      <!-- Progress Bar -->
      <div class="progress-container">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            style="width: {progress}%"
          ></div>
        </div>
        <div class="progress-text">{Math.round(progress)}%</div>
      </div>

      <!-- Loading Tips -->
      <div class="loading-tips">
        {#if progress < 25}
          <p>💡 Tip: Click rapidly to build combo multipliers!</p>
        {:else if progress < 50}
          <p>💡 Tip: Watch the market trends for optimal selling times!</p>
        {:else if progress < 75}
          <p>💡 Tip: Automate your production to earn while away!</p>
        {:else}
          <p>💡 Tip: Complete achievements to unlock special rewards!</p>
        {/if}
      </div>

      <!-- Version Info -->
      <div class="version-info">
        v1.0.0 • Built with 💖 and Svelte
      </div>
    </div>

    <!-- Background Animation -->
    <div class="background-animation">
      {#each Array(20) as _, i}
        <div 
          class="floating-matchstick" 
          style="
            left: {Math.random() * 100}%;
            animation-delay: {Math.random() * 5}s;
            animation-duration: {5 + Math.random() * 5}s;
          "
        >
          🔥
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    overflow: hidden;
  }

  .loading-container {
    text-align: center;
    z-index: 2;
    max-width: 600px;
    padding: 2rem;
  }

  .loading-icon {
    margin-bottom: 2rem;
  }

  .matchstick-container {
    position: relative;
    display: inline-block;
    animation: float 3s ease-in-out infinite;
  }

  .matchstick {
    width: 8px;
    height: 100px;
    position: relative;
    margin: 0 auto;
  }

  .matchstick-head {
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
    border-radius: 50%;
    position: absolute;
    top: -8px;
    left: -4px;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
  }

  .matchstick-body {
    width: 8px;
    height: 100px;
    background: linear-gradient(180deg, #8b4513 0%, #a0522d 100%);
    border-radius: 0 0 4px 4px;
  }

  .flame {
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 2rem;
    opacity: 0;
    transition: opacity 0.5s ease;
    animation: flicker 1s ease-in-out infinite;
  }

  .flame.burning {
    opacity: 1;
  }

  .loading-title {
    margin: 0 0 1rem 0;
    font-size: 3rem;
    font-weight: 700;
    display: flex;
    justify-content: center;
    gap: 1rem;
  }

  .title-word {
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 2s ease-in-out infinite;
  }

  .title-word.empire {
    animation-delay: 0.5s;
  }

  .loading-message {
    font-size: 1.2rem;
    color: #64ffda;
    margin-bottom: 2rem;
    min-height: 1.5rem;
    font-weight: 500;
  }

  .progress-container {
    margin-bottom: 2rem;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #64ffda 0%, #1de9b6 100%);
    border-radius: 4px;
    transition: width 0.3s ease;
    position: relative;
  }

  .progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: shine 1.5s ease-in-out infinite;
  }

  .progress-text {
    color: #64ffda;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .loading-tips {
    margin-bottom: 2rem;
    min-height: 2rem;
  }

  .loading-tips p {
    margin: 0;
    color: #b0bec5;
    font-style: italic;
    animation: fadeInOut 4s ease-in-out infinite;
  }

  .version-info {
    color: #78909c;
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .background-animation {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .floating-matchstick {
    position: absolute;
    font-size: 1.5rem;
    opacity: 0.3;
    animation: floatUp linear infinite;
  }

  /* Animations */
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes flicker {
    0%, 100% {
      transform: translateX(-50%) scale(1);
    }
    50% {
      transform: translateX(-50%) scale(1.1);
    }
  }

  @keyframes shimmer {
    0%, 100% {
      background-position: -200% center;
    }
    50% {
      background-position: 200% center;
    }
  }

  @keyframes shine {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  @keyframes fadeInOut {
    0%, 20%, 80%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  @keyframes floatUp {
    0% {
      transform: translateY(100vh) rotate(0deg);
      opacity: 0;
    }
    10% {
      opacity: 0.3;
    }
    90% {
      opacity: 0.3;
    }
    100% {
      transform: translateY(-100px) rotate(360deg);
      opacity: 0;
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .loading-container {
      padding: 1rem;
    }

    .loading-title {
      font-size: 2rem;
      flex-direction: column;
      gap: 0.5rem;
    }

    .loading-message {
      font-size: 1rem;
    }

    .matchstick {
      width: 6px;
      height: 80px;
    }

    .matchstick-head {
      width: 12px;
      height: 12px;
      top: -6px;
      left: -3px;
    }

    .matchstick-body {
      width: 6px;
      height: 80px;
    }

    .flame {
      font-size: 1.5rem;
      top: -25px;
    }
  }
</style> 
