// js/core/window-types.ts
// Type-safe window extensions for global API access

declare global {
  interface Window {
    // Game state and systems
    state?: any; // Legacy - will be removed
    modalManager?: any; // Legacy - will be removed
    gameBus?: any; // Legacy - will be removed
    currentPhase?: any; // Legacy - will be removed
    transition?: any; // Legacy - will be removed

    // Public API functions
    payTithe?: () => void;
    escapeGame?: () => void;
    openTome?: () => void;
    openSatchel?: () => void;
    openGrimoire?: () => void;
    saveGame?: () => void;
    loadGame?: () => Promise<void>;

    // Development tools
    devMode?: () => void;
    logger?: any;

    // UI functions
    openWhispStats?: () => void;

    // Gaze system
    __gazeActive?: boolean;
  }
}

export {};