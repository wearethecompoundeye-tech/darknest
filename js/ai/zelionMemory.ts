// js/ai/zelionMemory.ts
export interface ZilionMemoryEntry { type: string; data?: any; time: number; }
export interface PersonalityTraits { curiosity: number; loyalty: number; aggression: number; playfulness: number; }
const DEFAULT_TRAITS: PersonalityTraits = { curiosity: 50, loyalty: 70, aggression: 10, playfulness: 30 };

export class ZilionMemory {
  private memory: ZilionMemoryEntry[] = [];
  private traits: PersonalityTraits = { ...DEFAULT_TRAITS };
  private storageKey = 'zelion-brain';

  constructor() { this.load(); }

  recordEvent(type: string, data?: any): void {
    this.memory.push({ type, data, time: Date.now() });
    if (this.memory.length > 200) this.memory = this.memory.slice(-200);
    this.save();
  }
  getRecent(count: number = 10): ZilionMemoryEntry[] { return this.memory.slice(-count).reverse(); }
  countRecentType(type: string, lookBack: number = 20): number { return this.memory.slice(-lookBack).filter(e => e.type === type).length; }
  getTraits(): PersonalityTraits { return { ...this.traits }; }
  updateTrait(trait: keyof PersonalityTraits, delta: number): void {
    this.traits[trait] = Math.max(0, Math.min(100, this.traits[trait] + delta));
    this.save();
  }
  getPersonalityPrompt(): string {
    const t = this.traits;
    let mood = '';
    if (t.loyalty > 80) mood += ' deeply loyal';
    else if (t.loyalty < 30) mood += ' feeling distant';
    if (t.curiosity > 70) mood += ' and intensely curious';
    else if (t.curiosity < 30) mood += ' and somewhat indifferent';
    if (t.playfulness > 70) mood += ', with a mischievous streak';
    if (t.aggression > 60) mood += ', on edge and aggressive';
    const recent = this.getRecent(3);
    let recentSummary = '';
    if (recent.length > 0) {
      const names = recent.map(e => e.type.replace(/_/g, ' ')).join(', ');
      recentSummary = ` Recently happened: ${names}.`;
    }
    return `[Current mood:${mood || ' neutral'}.${recentSummary}]`;
  }

  private save(): void {
    try { 
      localStorage.setItem(this.storageKey, JSON.stringify({ memory: this.memory.slice(-200), traits: this.traits })); 
    } catch (error) {
      console.warn('Failed to persist Zelion memory:', error);
    }
  }
  private load(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) { 
        const data = JSON.parse(raw); 
        this.memory = data.memory || []; 
        this.traits = { ...DEFAULT_TRAITS, ...(data.traits || {}) }; 
      }
    } catch (error) {
      console.warn('Failed to load Zelion memory:', error);
    }
  }
}

let instance: ZilionMemory | null = null;
export function getZilionMemory(): ZilionMemory {
  if (!instance) instance = new ZilionMemory();
  return instance;
}
