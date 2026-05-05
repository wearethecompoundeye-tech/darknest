# Kalgoth's Gaze: Darknest

A dark fantasy ritual-summoning game where you build decks of spells and summon demons to battle through procedural mazes, craft artifacts, and face the gaze of an ancient entity.

## Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Installation
```bash
# Clone the repository
git clone https://github.com/wearethecompoundeye-tech/darknest.git
cd darknest

# Install dependencies
npm install
```

### Running the Game

**Development (with live reload):**
```bash
npm run dev
```
Then open http://localhost:5173 in your browser.

**Production build:**
```bash
npm run build
npm run preview
```

**Run tests:**
```bash
npm test              # Run tests once
npm run test:watch   # Watch mode for development
```

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design patterns
- **[package.json](package.json)** - Dependencies and scripts

## Project Structure

```
js/
├── core/         Game engine, state management, events
├── systems/      Game mechanics (summoning, cards, crafting, etc.)
├── ui/           User interface components
├── ai/           AI opponent logic
├── audio/        Sound and music management
├── minigames/    Mini-game implementations
├── data/         Game data loaders
└── types/        TypeScript definitions

assets/           Game assets (images, music, sounds)
public/           Static files served to browser
css/              Game stylesheets
```

## Key Features

- **Deck Building** - Collect and craft spells into powerful decks
- **Strategic Combat** - Battle enemies with action-clash mechanics
- **Procedural Exploration** - Navigate randomly-generated mazes
- **Crafting System** - Create relics, runes, and potions
- **AI Opponents** - Face memorable NPC rivals with personalities
- **Auto-Save** - Progress automatically saved to browser storage
- **Localization** - Multi-language support

## Development

### Code Style

- TypeScript throughout
- ESM modules
- Signals-based reactive state (Preact Signals)
- Event-driven architecture

### Common Tasks

**Add a new card:**
1. Edit `js/data/cards.ts`
2. Add type definition in `js/types/game.ts`
3. Update validation in `scripts/validate-cards.js`
4. Run `npm run validate-cards`

**Add a new system:**
1. Create `js/systems/my-feature.ts`
2. Register in `js/core/game.ts`
3. Add tests in `js/core/__tests__/`

**Add UI component:**
1. Create `js/ui/my-component.ts`
2. Register in `js/ui/ui-renderer.ts`
3. Subscribe to signals for state updates

## Troubleshooting

**Port 5173 already in use:**
```bash
npm run dev -- --port 5174
```

**Module not found errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Build fails:**
```bash
npm run build -- --debug
```

## License

[Include your license information]

## Credits

Developed by [wearethecompoundeye-tech](https://github.com/wearethecompoundeye-tech)