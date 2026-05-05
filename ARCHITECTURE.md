# Darknest Architecture

## Overview

**Kalgoth's Gaze** is a dark fantasy ritual-summoning game built with:
- **Frontend:** TypeScript + Vite
- **State Management:** Preact Signals (reactive signals-based)
- **Audio:** Howler.js
- **Testing:** Vitest
- **Rendering:** DOM-based with custom animation system

---

## Core Architecture Layers

### 1. **Game Engine (js/core/)**

The heart of the game - handles state, events, and persistence.

#### State Management
- **`state-signals.ts`** - Preact Signals reactive state declarations
- **`gameReducer.ts`** - Pure state mutation logic
- **`game.ts`** - Main game orchestrator combining signals, events, and systems

#### Event System
- **`eventBus.ts`** - Central event dispatcher
- **`events.ts`** - Event type definitions and handlers

#### Persistence
- **`persistence.ts`** - Game save/load logic
- **`storage.ts`** - LocalStorage abstraction layer

#### Utilities
- **`dom-helper.ts`** - DOM manipulation and querying
- **`dev-mode.ts`** - Development tools and debugging
- **`localisation.ts`** - Internationalization system
- **`defaults.ts`** - Game constants and defaults

---

### 2. **Game Systems (js/systems/)**

Feature modules implementing specific game mechanics. Each system is independent but communicates via the event bus.

| System | Purpose |
|--------|---------|
| `summoning.ts` | Core summoning/casting mechanic |
| `ability-engine.ts` | Ability resolution and execution |
| `card-progression.ts` | Card leveling and advancement |
| `card-acquisition.ts` | Card collection and drafting |
| `familiar-manager.ts` | Pet/familiar system |
| `crafting.ts` | Item and rune crafting |
| `maze-system.ts` | Procedural maze/exploration |
| `gaze-event.ts` | Special scripted events |
| `day-cycle.ts` | Time progression and daily cycles |
| `will-duel.ts` | Player vs player combat |
| `tutorial-listeners.ts` | Tutorial progression tracking |

---

### 3. **User Interface (js/ui/)**

18 UI component modules handling all player-facing interfaces.

| Component | Purpose |
|-----------|---------|
| `ui-renderer.ts` | Main UI orchestrator |
| `grimoire.ts` | Spell/card library display |
| `card-battle.ts` | Battle interface |
| `will-duel.ts` | Duel/PvP interface |
| `battle-clash.ts` | Combat clash sequence |
| `battle-animations.ts` | Battle animation system |
| `satchel.ts` | Inventory management |
| `tome.ts` | Story/lore display |
| `ledger.ts` | Progress and achievements |
| `settings-panel.ts` | Game settings |
| `demon-modal.ts` | Character/demon display |
| `whisp-chat.ts` | NPC dialogue UI |
| `whisp-commentary.ts` | NPC commentary system |
| `modal-manager.ts` | Modal lifecycle management |
| `log-manager.ts` | Game log/message display |
| `save-slots.ts` | Save game selection |
| `gaze-ui.ts` | Special UI for Kalgoth's Gaze |
| `tutorial.ts` | Tutorial UI |

---

### 4. **AI System (js/ai/)**

Opponent AI and NPC behavior.

- **`ai-engine.ts`** - Main AI decision-making engine
- **`zelionMemory.ts`** - NPC/Zelion memory and personality system

---

### 5. **Audio System (js/audio/)**

Sound management using Howler.js.

- **`ambience-manager.ts`** - Music and ambient sound control
- **`sfx.ts`** - Sound effect playback and management

---

### 6. **Minigames (js/minigames/)**

Interactive mini-game mechanics.

- **`circle-trace.ts`** - Circle drawing/tracing game
- **`phial-brew.ts`** - Brewing/mixing mechanics
- **`rune-etch.ts`** - Rune crafting mini-game

---

### 7. **Data Loading (js/data/)**

Game data definitions and loaders.

- **`cards.ts`** - Card definitions
- **`abilities-loader.ts`** - Ability definitions
- **`relics.ts`** - Relic/artifact definitions
- **`runes.ts`** - Rune system definitions

---

### 8. **Type System (js/types/)**

TypeScript interface definitions.

- **`game.ts`** - Core game type definitions

---

## Data Flow Architecture

```
User Interaction (UI)
        ↓
    Event Bus
        ↓
    Game Systems
        ↓
    Preact Signals (State)
        ↓
    UI Renderer (Re-render)
        ↓
    LocalStorage (Persist)
```

### Event-Driven Communication

Systems communicate asynchronously via `eventBus`:

```typescript
// System A: Emit effect
eventBus.emit('enemy-took-damage', { amount: 15 });

// System B: Listen for event
eventBus.on('enemy-took-damage', ({ amount }) => {
  updateEnemyHealth(-amount);
});
```

### Reactive State Updates

Preact Signals enable automatic UI updates:

```typescript
// Declare reactive signal
const playerHealth = signal(100);

// Update signal
playerHealth.value = 85; // Triggers UI re-render automatically
```

---

## Plugin System (js/plugins/)**

- **`plugin-interface.ts`** - Plugin API definition for extensibility

---

## Testing

- **`js/core/__tests__/`** - Unit tests for core systems
- **Run tests:** `npm test`
- **Watch mode:** `npm run test:watch`

---

## Build & Deployment

- **Dev server:** `npm run dev` (Vite HMR)
- **Build:** `npm run build` (outputs to dist/)
- **Preview:** `npm run preview`

---

## Key Design Patterns

1. **Event Bus Pattern** - Systems emit/listen for loosely-coupled communication
2. **Signals Pattern** - Reactive state with automatic UI updates
3. **Reducer Pattern** - Pure state mutations in gameReducer.ts
4. **Module Pattern** - Each system is self-contained with clear boundaries
5. **Observer Pattern** - UI components observe signal changes

---

## Development Guidelines

### Adding a New System

1. Create `js/systems/my-system.ts`
2. Export system initialization function
3. Register in `game.ts` system initialization
4. Emit/listen for events via `eventBus`
5. Add tests in `__tests__/`

### Adding a New UI Component

1. Create `js/ui/my-component.ts`
2. Implement render function accepting game state
3. Register in `ui-renderer.ts`
4. Subscribe to relevant signals for updates

### Adding Game Data

1. Define in `js/data/` (cards.ts, abilities-loader.ts, etc.)
2. Add TypeScript interfaces in `types/game.ts`
3. Export loader function
4. Load during game initialization

---

## Asset Organization

```
assets/
├── Images/
│   └── Game Art/
├── music/
└── sfx/

public/
├── data/         (Game balance data)
├── editor/       (Editor tools)
├── locales/      (i18n translations)
├── Images/       (Served static images)
├── music/        (Served audio files)
└── sfx/          (Served sound effects)
```

---

## Performance Considerations

1. **Signal Subscriptions** - Only UI components that need updates subscribe to signals
2. **Event Debouncing** - High-frequency events are debounced to prevent UI thrashing
3. **Lazy Loading** - Systems initialized on-demand rather than all at startup
4. **Animation Frames** - Battle animations use requestAnimationFrame for smooth performance

---

## Future Improvements

- [ ] Add comprehensive logging system
- [ ] Implement network multiplayer (WebSocket)
- [ ] Add analytics tracking
- [ ] Optimize bundle size with dynamic imports
- [ ] Add service worker for offline play
- [ ] Implement achievement system
- [ ] Add replay system for battles
