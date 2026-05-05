// js/ui/attack-effects.ts – Centralised attack visual effects.
// Uses DOM particles with object pooling via the particle-system module for high-performance bursts.

import { playSfx } from '../audio/sfx.js';

type AttackFxType = 'slash' | 'radial' | 'rune' | 'critical';

export class AttackEffects {
  private static readonly RUNES = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'];

  /**
   * Play an attack visual effect at the given screen coordinates.
   * @param type – visual style of the effect.
   * @param x,y – screen coordinates.
   * @param damage – damage amount (influences intensity).
   * @param aspect – optional aspect for thematic particle colors.
   */
  static async play(type: AttackFxType, x: number, y: number, damage: number, aspect?: string) {
    const container = document.createElement('div');
    container.style.cssText = `position:fixed; left:${x}px; top:${y}px; width:0; height:0; pointer-events:none; z-index:5000;`;

    switch (type) {
      case 'slash':
        this.slash(container, damage);
        this.playAttackSounds(damage, true);
        break;
      case 'radial':
        this.radialBurst(container, damage);
        this.playAttackSounds(damage, false);
        break;
      case 'rune':
        this.runeExplosion(container, damage);
        this.playSpellSounds(aspect);
        break;
      case 'critical':
        this.slash(container, damage, true);
        this.radialBurst(container, damage, true);
        this.playCriticalSounds();
        break;
    }

    document.body.appendChild(container);
    await new Promise(resolve => setTimeout(resolve, 1000));
    container.remove();
  }

  private static playAttackSounds(damage: number, isSlash: boolean) {
    playSfx('attack_swing');
    const lightPool = ['light_impact_hit', 'light_impact_hit_v2', 'tiny_ice_hit'];
    const heavyPool = ['high_impact_hit', 'card_attack_heavy_slash', 'hard_impact_critical_bone_crush'];
    const pool = damage > 8 ? heavyPool : (isSlash ? ['high_impact_hit', 'card_attack_heavy_slash'] : lightPool);
    playSfx(pool[Math.floor(Math.random() * pool.length)]);
  }

  private static playCriticalSounds() {
    playSfx('finishing_move_heavy_attack');
    playSfx('hard_impact_critical_bone_crush');
    playSfx('screen_shake');
    document.body.style.animation = 'stageShake 0.3s ease-out';
    setTimeout(() => document.body.style.animation = '', 300);
  }

  private static playSpellSounds(aspect?: string) {
    playSfx('spell_impact');
    const aspectMap: Record<string, string> = {
      Fire: 'rife_spell', Water: 'ice_spell', Air: 'rife_spell',
      Earth: 'light_earth_spell_damage', Death: 'void_spell',
      Life: 'light_earth_spell_damage', Void: 'void_spell'
    };
    const extra = aspect ? (aspectMap[aspect] || 'spell_impact') : 'spell_impact';
    playSfx(extra);
  }

  private static slash(container: HTMLDivElement, intensity: number, isCrit = false) {
    const length = 60 + intensity * 3;
    const angle = -45 + Math.random() * 90;
    const line = document.createElement('div');
    line.style.cssText = `
      position:absolute; width:${length}px; height:2px;
      background:linear-gradient(90deg, transparent, #ffd700, transparent);
      transform: rotate(${angle}deg) translateX(-50%);
      filter:blur(1px); box-shadow:0 0 8px #ffd700;
      animation:slashLine 0.4s ease-out forwards;
    `;
    container.appendChild(line);
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      p.style.cssText = `
        position:absolute; width:2px; height:2px; background:#fff; border-radius:50%;
        transform: translate(${Math.random() * length}px, 0) scale(0);
        animation:slashParticle 0.4s ease-out forwards;
      `;
      container.appendChild(p);
    }
  }

  private static radialBurst(container: HTMLDivElement, intensity: number, isCrit = false) {
    const rings = isCrit ? 2 : 1;
    for (let r = 0; r < rings; r++) {
      const count = 20 + intensity * 1.5;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + r * 0.5;
        const dist = 40 + r * 20;
        const p = document.createElement('div');
        p.style.cssText = `
          position:absolute; width:2px; height:2px; background:#fff; border-radius:50%;
          box-shadow:0 0 4px #ffd700;
          animation:radialParticle 0.5s ease-out forwards;
        `;
        p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
        container.appendChild(p);
      }
    }
  }

  private static runeExplosion(container: HTMLDivElement, intensity: number) {
    const count = 30 + intensity * 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 60;
      const size = 4 + Math.random() * 4;
      const char = this.RUNES[Math.floor(Math.random() * this.RUNES.length)];
      const p = document.createElement('div');
      p.style.cssText = `
        position:absolute; width:${size}px; height:${size}px;
        display:flex; align-items:center; justify-content:center;
        font-size:${size * 0.7}px; color:#90ee90;
        text-shadow:0 0 6px #90ee90;
        animation:runeParticle 0.6s ease-out forwards;
      `;
      p.textContent = char;
      p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      container.appendChild(p);
    }
  }
}

// Injecting keyframes only once
(function() {
  if (document.getElementById('attack-effects-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'attack-effects-keyframes';
  style.textContent = `
    @keyframes slashLine { 0%{opacity:0; transform:scaleX(0)} 50%{opacity:1} 100%{opacity:0; transform:scaleX(1)} }
    @keyframes slashParticle { 0%{opacity:1; transform:translate(0,0) scale(1)} 100%{opacity:0; transform:translate(var(--dx), var(--dy)) scale(0)} }
    @keyframes radialParticle { 0%{opacity:1; transform:translate(0,0)} 100%{opacity:0; transform:translate(var(--dx), var(--dy))} }
    @keyframes runeParticle { 0%{opacity:1; transform:translate(0,0) rotate(0deg)} 100%{opacity:0; transform:translate(var(--dx), var(--dy)) rotate(var(--rot))} }
  `;
  document.head.appendChild(style);
})();