# Contributing to Kalgoth's Gaze

Thank you for your interest in contributing to Darknest! This document provides guidelines for development and contribution.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/darknest.git`
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Install dependencies: `npm install`
5. Start development: `npm run dev`

## Development Guidelines

### Code Style

- **Language:** TypeScript with strict mode enabled
- **Module Format:** ES Modules (ESM)
- **Formatting:** Use Prettier (configured in tsconfig.json)
- **Linting:** Follow existing code patterns

### TypeScript Best Practices

- Use explicit type annotations for function parameters and returns
- Avoid `any` types - use proper typing
- Add JSDoc comments for public functions
- Define types in `js/types/game.ts` for shared interfaces

### Creating a Feature

1. **Create a new system (if needed):**
   ```typescript
   // js/systems/my-feature.ts
   import { eventBus } from '../core/eventBus';
   
   export function initMyFeature() {
     eventBus.on('game-start', () => {
       // Initialize feature
     });
   }
   ```

2. **Register in game initialization:**
   ```typescript
   // js/core/game.ts
   import { initMyFeature } from '../systems/my-feature';
   
   function initializeSystems() {
     // ... existing systems
     initMyFeature();
   }
   ```

3. **Add UI components if needed:**
   ```typescript
   // js/ui/my-feature-ui.ts
   export function renderMyFeatureUI(state: GameState) {
     // Return JSX or DOM elements
   }
   ```

4. **Add tests:**
   ```typescript
   // js/core/__tests__/my-feature.test.ts
   import { describe, it, expect } from 'vitest';
   import { initMyFeature } from '../systems/my-feature';
   
   describe('My Feature', () => {
     it('should initialize properly', () => {
       initMyFeature();
       expect(true).toBe(true);
     });
   });
   ```

### Event-Driven Communication

Use the event bus for inter-system communication:

```typescript
// Emit an event
eventBus.emit('my-event', { data: value });

// Listen for an event
eventBus.on('my-event', (payload) => {
  console.log(payload);
});
```

### State Management with Signals

Use Preact Signals for reactive state:

```typescript
import { signal } from '@preact/signals-core';

export const myState = signal(initialValue);

// Update state (triggers UI updates automatically)
myState.value = newValue;

// Subscribe to changes
myState.subscribe((value) => {
  console.log('State changed:', value);
});
```

## Testing

- **Run tests:** `npm test`
- **Watch mode:** `npm run test:watch`
- **Coverage:** Tests should aim for >80% coverage of business logic

```typescript
// Example test
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature', () => {
  beforeEach(() => {
    // Setup
  });

  it('should behave as expected', () => {
    const result = myFunction();
    expect(result).toBe(expectedValue);
  });
});
```

## Git Workflow

1. **Commit messages:** Use clear, descriptive messages
   ```
   feat: Add new summoning animation
   fix: Resolve card progression bug
   refactor: Extract common utility function
   docs: Update architecture guide
   ```

2. **Branches:** Use feature branches for clarity
   - `feature/new-system`
   - `fix/bug-name`
   - `docs/update-readme`

3. **Pull Requests:**
   - Provide clear description of changes
   - Reference related issues
   - Ensure tests pass: `npm test`
   - Keep commits atomic and squashed when appropriate

## File Organization

```
js/
├── core/          # Game engine - DO NOT modify unless necessary
├── systems/       # Game features - Add new systems here
├── ui/            # UI components - Add UI here
├── audio/         # Audio system
├── ai/            # AI logic
├── minigames/     # Mini-game logic
└── data/          # Game data definitions
```

## Performance Considerations

- Avoid creating new objects in hot loops
- Use signal subscriptions sparingly
- Batch event emissions when possible
- Profile with browser DevTools before optimizing

## Reporting Issues

When reporting bugs, include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS details
- Screenshots/videos if applicable

## Questions?

- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Review existing code for patterns
- Open a discussion issue for design questions

## Code of Conduct

- Be respectful to all contributors
- Provide constructive feedback
- Focus on ideas, not individuals
- Help others succeed

Thank you for contributing! 🎮
