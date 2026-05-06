const DEFAULT_TRAITS = { curiosity: 50, loyalty: 70, aggression: 10, playfulness: 30 };
export class ZilionMemory {
    memory = [];
    traits = { ...DEFAULT_TRAITS };
    storageKey = 'zelion-brain';
    constructor() { this.load(); }
    recordEvent(type, data) {
        this.memory.push({ type, data, time: Date.now() });
        if (this.memory.length > 200)
            this.memory = this.memory.slice(-200);
        this.save();
    }
    getRecent(count = 10) { return this.memory.slice(-count).reverse(); }
    countRecentType(type, lookBack = 20) { return this.memory.slice(-lookBack).filter(e => e.type === type).length; }
    getTraits() { return { ...this.traits }; }
    updateTrait(trait, delta) {
        this.traits[trait] = Math.max(0, Math.min(100, this.traits[trait] + delta));
        this.save();
    }
    getPersonalityPrompt() {
        const t = this.traits;
        let mood = '';
        if (t.loyalty > 80)
            mood += ' deeply loyal';
        else if (t.loyalty < 30)
            mood += ' feeling distant';
        if (t.curiosity > 70)
            mood += ' and intensely curious';
        else if (t.curiosity < 30)
            mood += ' and somewhat indifferent';
        if (t.playfulness > 70)
            mood += ', with a mischievous streak';
        if (t.aggression > 60)
            mood += ', on edge and aggressive';
        const recent = this.getRecent(3);
        let recentSummary = '';
        if (recent.length > 0) {
            const names = recent.map(e => e.type.replace(/_/g, ' ')).join(', ');
            recentSummary = ` Recently happened: ${names}.`;
        }
        return `[Current mood:${mood || ' neutral'}.${recentSummary}]`;
    }
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({ memory: this.memory.slice(-200), traits: this.traits }));
        }
        catch { }
    }
    load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) {
                const data = JSON.parse(raw);
                this.memory = data.memory || [];
                this.traits = { ...DEFAULT_TRAITS, ...(data.traits || {}) };
            }
        }
        catch { }
    }
}
let instance = null;
export function getZilionMemory() {
    if (!instance)
        instance = new ZilionMemory();
    return instance;
}
