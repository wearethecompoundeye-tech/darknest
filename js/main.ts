// js/main.ts – Application entry point
// Splash screen dismissal, game initialisation, and error handling.
// The Game class is the single orchestrator; no service wiring needed here.

import { Game } from './core/game.js';

/**
 * Fades out the splash screen, then starts the Game.
 * If the splash element is missing, the callback runs immediately.
 */
function dismissSplash(then: () => void): void {
  const splash = document.getElementById('splashScreen');
  if (!splash) {
    then();
    return;
  }

  // Prevent double clicks during the fade
  splash.style.pointerEvents = 'none';
  splash.style.transition = 'opacity 0.8s ease-out';
  splash.style.opacity = '0';

  // Remove the element after the transition ends, then proceed
  setTimeout(() => {
    if (splash.parentNode) splash.remove();
    then();
  }, 800);
}

/**
 * Unhides the main game container and boots the Game class.
 * The inline styles that hide the container are cleared so the CSS
 * flex layout and the 'altar-active' opacity transition can work.
 */
function startGame(): void {
  const container = document.getElementById('gameContainer');
  if (container) {
    // Remove both inline display and opacity so the CSS can drive visibility
    container.style.display = '';
    container.style.opacity = '';
    // The Game.start() method will add the 'altar-active' class,
    // triggering the opacity transition to 1.
  }

  const game = new Game();
  game.start().catch((err: Error) => {
    console.error('Failed to start game:', err);
  });
}

// ── Bind the splash click ────────────────────────────────────────────
const splashEl = document.getElementById('splashScreen');
if (splashEl) {
  splashEl.addEventListener('click', () => dismissSplash(startGame));
}

// ── Fallback: auto‑dismiss after 5 seconds if the user does nothing ──
setTimeout(() => {
  const splash = document.getElementById('splashScreen');
  if (splash && splash.style.display !== 'none') {
    dismissSplash(startGame);
  }
}, 5000);