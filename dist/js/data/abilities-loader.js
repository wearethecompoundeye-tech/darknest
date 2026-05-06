// js/data/abilities-loader.ts
// Loads ability definitions from JSON.
let abilities = [];
let loaded = false;
export async function loadAbilities() {
    if (loaded)
        return;
    const res = await fetch('/data/abilities.json');
    abilities = await res.json();
    loaded = true;
}
export function getAbilityById(id) {
    return abilities.find(a => a.id === id);
}
export function getAbilitiesByType(type) {
    return abilities.filter(a => a.type === type);
}
