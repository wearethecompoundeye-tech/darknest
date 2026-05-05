// js/plugins/plugin-interface.ts
// Lightweight plugin system for loading new cards, abilities, and locales.

export interface GamePlugin {
  id: string;
  version: string;
  name: string;
  description?: string;
  /** Called when the plugin is loaded. */
  init(): void | Promise<void>;
  /** Called when the plugin is removed or the game ends. */
  destroy(): void;
  /** Optional array of card IDs introduced by this plugin. */
  cards?: string[];
  /** Optional locale overrides (e.g., { de: { ... } }). */
  locales?: Record<string, Record<string, string>>;
}

const plugins: GamePlugin[] = [];

export function registerPlugin(plugin: GamePlugin): void {
  plugins.push(plugin);
  console.log(`[Plugin] Registered: ${plugin.name} (${plugin.id})`);
}

export async function initPlugins(): Promise<void> {
  for (const plugin of plugins) {
    await plugin.init();
    console.log(`[Plugin] Initialised: ${plugin.name}`);
  }
}

export function destroyPlugins(): void {
  plugins.slice().reverse().forEach(plugin => plugin.destroy());
}

export function getPlugins(): ReadonlyArray<GamePlugin> {
  return plugins;
}
