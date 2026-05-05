// js/data/minigame-config.ts
// Centralized configuration for all minigames
// Adjust these values to balance difficulty and rewards across all minigames

export const MINIGAME_CONFIG = {
  // ── Phial Brewing (Cauldron Boil) ──────────────────────────
  phialBrew: {
    duration: 30,              // Total time in seconds
    baseZoneSpeed: 0.8,        // Radians per second (how fast zone rotates)
    zoneRadius: 85,            // Distance from center
    minZoneSize: 25,           // Smallest zone radius at max difficulty
    maxZoneSize: 45,           // Largest zone radius at start
    progressRate: 0.45,        // How fast progress fills (delta * rate)
    decayRate: 0.15,           // How fast progress drains when out of zone
    basePhials: 1,             // Minimum phials from successful brew
    bonusPhialsPerPercent: 1.5, // Phials gained per point of precision
    baseXP: 5,                 // Base mastery XP for completion
    xpPerBonus: 3,             // XP per bonus phial earned
    xpPerCombo: 2,             // XP bonus per combo tier
    scorePerPrecision: 10,     // Points multiplied by precision %
    comboTimeout: 2000,        // Milliseconds before combo resets
    comboMinCloseness: 0.85,   // Closeness required to trigger combo
    comboMinInterval: 300,     // Min ms between combo increments
  },

  // ── Circle Tracing (Spark-Drag) ────────────────────────────
  circleTap: {
    duration: 20,              // Total time in seconds
    arcLength: 200,            // Total arc degrees to trace
    segmentSize: 10,           // Degrees per traced segment
    segmentTime: 200,          // Milliseconds per segment completion
    penaltyRadius: 40,         // Pixels away from arc to lose progress
    progressRate: 1,           // Units per correct segment
    decayRate: 0.5,            // Units lost per off-trace frame
    basePowder: 1,             // Base powder from success
    bonusPercentile: 0.3,      // Powder bonus multiplier for accuracy
    baseXP: 4,                 // Base mastery XP
    xpPerBonus: 2,             // XP per bonus powder
  },

  // ── Rune Etching (Precision Tap) ───────────────────────────
  runeEtch: {
    duration: 25,              // Total time in seconds
    tapRadius: 30,             // Radius of tap zones
    tapAccuracy: 20,           // Pixels tolerance for accurate tap
    tapWindow: 400,            // Milliseconds to tap within zone
    baseProgress: 5,           // Progress per accurate tap
    penaltyProgress: 2,        // Progress lost per miss
    basesPerRune: 2,           // Base runebases earned per rune
    bonusPerPercent: 1,        // Extra runebase per accuracy %
    baseXP: 6,                 // Base mastery XP
    xpPerBonus: 2.5,           // XP per bonus base
    perfectBonus: 0.5,         // XP multiplier for perfect execution
  },

  // ── Braided Trace (Rite of Binding) ────────────────────────
  braidedTrace: {
    duration: 35,              // Total time in seconds
    minSpeed: 1.5,             // Min pixels per second (easiest)
    maxSpeed: 4,               // Max pixels per second (hardest)
    speedScaling: 0.8,         // How much speed increases with progress
    lineWidth: 8,              // Width of trace line (tolerance)
    pathLength: 800,           // Total pixels to trace
    segmentSize: 40,           // Pixels per segment
    baseChallices: 1,          // Base chalices earned
    bonusPerPercent: 1.2,      // Chalices per accuracy %
    baseXP: 7,                 // Base mastery XP
    xpPerBonus: 3,             // XP per bonus chalice
    timeBonus: 5,              // Bonus XP per 5 seconds remaining
  },

  // ── Global Minigame Settings ───────────────────────────────
  global: {
    baseXPMultiplier: 1,       // Multiply all XP by this (balance across minigames)
    enableCombo: true,         // Whether combo systems are active
    showPredictiveUI: true,    // Show hints/next target indicators
    audioVolume: 0.7,          // Sound effect volume (0-1)
    enableTouchSupport: true,  // Enable touch controls for all minigames
    enableKeyboardShortcuts: true, // Enter to start, Esc to cancel
  },
};

// Helper to adjust difficulty dynamically (optional scaling)
export function getDifficultyMultiplier(masteryLevel: number): number {
  // Difficulty increases slightly with player mastery level
  // masteryLevel 0-10: 0.8 - 1.2x
  return 0.8 + (Math.min(masteryLevel, 10) / 10) * 0.4;
}

// Get adjusted config for a specific minigame with difficulty scaling
export function getAdjustedMinigameConfig(
  gameName: keyof typeof MINIGAME_CONFIG,
  masteryLevel: number = 0
) {
  if (gameName === 'global') return MINIGAME_CONFIG.global;
  
  const config = MINIGAME_CONFIG[gameName];
  const multiplier = getDifficultyMultiplier(masteryLevel);
  
  // Create adjusted copy (difficulty makes zones smaller, speeds faster, etc)
  const adjusted = { ...config };
  if ('baseZoneSpeed' in adjusted) adjusted.baseZoneSpeed *= multiplier;
  if ('minZoneSize' in adjusted) adjusted.minZoneSize *= (2 - multiplier); // Inverse for smaller zones at higher mastery
  if ('maxZoneSize' in adjusted) adjusted.maxZoneSize *= (2 - multiplier);
  if ('minSpeed' in adjusted) adjusted.minSpeed *= multiplier;
  if ('maxSpeed' in adjusted) adjusted.maxSpeed *= multiplier;
  
  return adjusted;
}
