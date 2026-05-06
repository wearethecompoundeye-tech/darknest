// js/plugins/plugin-interface.ts
// Lightweight plugin system for loading new cards, abilities, and locales.
const plugins = [];
export function registerPlugin(plugin) {
    plugins.push(plugin);
    console.log(`[Plugin] Registered: ${plugin.name} (${plugin.id})`);
}
export async function initPlugins() {
    for (const plugin of plugins) {
        await plugin.init();
        console.log(`[Plugin] Initialised: ${plugin.name}`);
    }
}
export function destroyPlugins() {
    plugins.slice().reverse().forEach(plugin => plugin.destroy());
}
export function getPlugins() {
    return plugins;
}
