// js/data/abilities-loader.ts
// Loads ability definitions from JSON.

export interface AbilityDef {
  id: string;
  name: string;
  type: string;
  trigger?: string;
  effect: string;
  value?: number;
}

let abilities: AbilityDef[] = [];
let loaded = false;

export async function loadAbilities(): Promise<void> {
  if (loaded) return;
  const res = await fetch('/data/abilities.json');
  abilities = await res.json();
  loaded = true;
}

export function getAbilityById(id: string): AbilityDef | undefined {
  return abilities.find(a => a.id === id);
}

export function getAbilitiesByType(type: string): AbilityDef[] {
  return abilities.filter(a => a.type === type);
}
