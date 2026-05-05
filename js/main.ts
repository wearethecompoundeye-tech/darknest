// js/main.ts
// Application entry point – delegates everything to the Game class.

import './core/window-types.js';
import { Game } from './core/game.js';

const game = new Game();
game.start();
