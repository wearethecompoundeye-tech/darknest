// js/ui/attack-effects.ts – Dense, small‑particle attack visuals
// Enhanced with void‑rift, shockwave, and aspect‑themed colors.
// Works with BattleEffects for screen shake (optional).

import { playPool } from '../audio/sfx.js';

type AttackFxType = 'slash' | 'radial' | 'rune' | 'critical' | 'voidRift';

export class AttackEffects {
  private static readonly RUNES = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'];
  private static aspectColors: Record<string, string> = {
    Void: '#aa55ff',
    Fire: '#ff6a2a',
    Earth: '#c8b890',
    Air: '#90c0e0',
    Water: '#69a3e7',
    Life: '#a0d07a',
    Death: '#cc6666',
    default: '#ffd700'
  };

  /**
   * Play an attack visual effect at the given screen coordinates.
   * @param type – visual style of the effect.
   * @param x,y – screen coordinates.
   * @param damage – damage amount (influences intensity).
   * @param aspect – optional aspect for thematic colors.
   */
  static play(type: AttackFxType, x: number, y: number, damage: number, aspect?: string) {
    const container = document.createElement('div');
    container.style.cssText = `position:fixed; left:${x}px; top:${y}px; width:0; height:0; pointer-events:none; z-index:5000;`;

    switch (type) {
      case 'slash':
        this.slash(container, damage, false);
        playPool('attack_hit', 0.9);
        break;
      case 'radial':
        this.radialBurst(container, damage);
        playPool('heavy_hit', 0.9);
        break;
      case 'rune':
        this.runeExplosion(container, damage, aspect);
        playPool('spell_impact', 0.85);
        break;
      case 'critical':
        this.slash(container, damage, true);
        this.radialBurst(container, damage);
        // shockwave ring
        this.shockwaveRing(x, y, damage);
        playPool('critical_hit', 1.0);
        break;
      case 'voidRift':
        this.voidRift(x, y, damage);
        playPool('spell_impact', 0.9);
        break;
    }

    document.body.appendChild(container);
    setTimeout(() => container.remove(), 800);
  }

  // ── Slash: thin arc with tiny sparks ─────────────────────────────
  private static slash(container: HTMLDivElement, intensity: number, isCrit = false) {
    const length = 50 + intensity * 3;
    const angle = -45 + Math.random() * 90;
    const color = isCrit ? '#ffd700' : '#ffffff';
    const line = document.createElement('div');
    line.style.cssText = `
      position:absolute; width:${length}px; height:2px;
      background:linear-gradient(90deg, transparent, ${color}, transparent);
      transform: rotate(${angle}deg) translateX(-50%);
      filter:blur(1px); box-shadow:0 0 8px ${color};
      animation:slashLine 0.4s ease-out forwards;
    `;
    container.appendChild(line);

    const sparkCount = isCrit ? 30 : 18;
    for (let i = 0; i < sparkCount; i++) {
      const p = document.createElement('div');
      const dist = Math.random() * length;
      const sparkAngle = angle + (Math.random() - 0.5) * 30;
      const tx = Math.cos(sparkAngle * Math.PI / 180) * (30 + Math.random() * 25);
      const ty = Math.sin(sparkAngle * Math.PI / 180) * (30 + Math.random() * 25);
      p.style.cssText = `
        position:absolute; width:2px; height:2px; background:${color}; border-radius:50%;
        left:${dist}px; top:0;
        transform: scale(0);
        animation:slashSpark 0.4s ease-out forwards;
      `;
      p.style.setProperty('--dx', `${tx}px`);
      p.style.setProperty('--dy', `${ty}px`);
      container.appendChild(p);
    }
  }

  // ── Radial burst: small fast particles ───────────────────────────
  private static radialBurst(container: HTMLDivElement, intensity: number) {
    const count = 35 + intensity * 4;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 30 + Math.random() * 60;
      const size = 1.5 + Math.random() * 2.5;
      const p = document.createElement('div');
      p.style.cssText = `
        position:absolute; width:${size}px; height:${size}px;
        background:#ffd700; border-radius:50%;
        box-shadow:0 0 ${size}px #ffaa00;
        animation:radialBurstParticle 0.45s ease-out forwards;
      `;
      p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      container.appendChild(p);
    }
  }

  // ── Rune explosion: tiny dense rune characters ──────────────────
  private static runeExplosion(container: HTMLDivElement, intensity: number, aspect?: string) {
    const color = this.aspectColors[aspect || 'default'] || this.aspectColors.default;
    const count = 40 + intensity * 3;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 80;
      const size = 10 + Math.random() * 6;
      const char = this.RUNES[Math.floor(Math.random() * this.RUNES.length)];
      const p = document.createElement('div');
      p.style.cssText = `
        position:absolute; width:${size}px; height:${size}px;
        display:flex; align-items:center; justify-content:center;
        font-size:${size * 0.7}px; color:${color};
        text-shadow:0 0 8px ${color};
        animation:runeParticle 0.55s ease-out forwards;
      `;
      p.textContent = char;
      p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      p.style.setProperty('--rot', `${Math.random() * 360}deg`);
      container.appendChild(p);
    }
  }

  // ── Shockwave ring (expanding circle) ───────────────────────────
  private static shockwaveRing(x: number, y: number, intensity: number) {
    const ring = document.createElement('div');
    const size = 20 + intensity;
    ring.style.cssText = `
      position:fixed; left:${x - size/2}px; top:${y - size/2}px;
      width:${size}px; height:${size}px; border: 3px solid rgba(255,215,0,0.7);
      border-radius:50%; pointer-events:none; z-index:5001;
      animation:shockwaveExpand 0.5s ease-out forwards;
    `;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 550);
  }

  // ── Void rift: dark vortex with screen distortion ───────────────
  private static voidRift(x: number, y: number, damage: number) {
    const vortex = document.createElement('div');
    const radius = 60 + damage * 2;
    vortex.style.cssText = `
      position:fixed; left:${x - radius/2}px; top:${y - radius/2}px;
      width:${radius}px; height:${radius}px;
      background: radial-gradient(circle, rgba(170,85,255,0.6) 0%, rgba(0,0,0,0.8) 70%);
      border-radius:50%; pointer-events:none; z-index:5001;
      animation:voidRiftPulse 0.8s ease-out forwards;
      mix-blend-mode: screen;
    `;
    document.body.appendChild(vortex);
    // Temporary screen hue rotation
    try {
      const currentFilter = document.body.style.filter;
      document.body.style.filter = `hue-rotate(${damage * 5}deg)`;
      setTimeout(() => {
        document.body.style.filter = currentFilter;
        vortex.remove();
      }, 800);
    } catch {}
  }
}

// ── Global keyframes (injected once) ──────────────────────────────
(function() {
  if (document.getElementById('attack-effects-keyframes-v3')) return;
  const style = document.createElement('style');
  style.id = 'attack-effects-keyframes-v3';
  style.textContent = `
    @keyframes slashLine {
      0% { opacity: 0; transform: rotate(var(--angle)) scaleX(0); }
      50% { opacity: 1; }
      100% { opacity: 0; transform: rotate(var(--angle)) scaleX(1); }
    }
    @keyframes slashSpark {
      0% { opacity: 1; transform: translate(0, 0) scale(1); }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0); }
    }
    @keyframes radialBurstParticle {
      0% { opacity: 1; transform: translate(0,0); }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)); }
    }
    @keyframes runeParticle {
      0% { opacity: 1; transform: translate(0,0) rotate(0deg); }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); }
    }
    @keyframes shockwaveExpand {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(2); opacity: 0; }
    }
    @keyframes voidRiftPulse {
      0% { transform: scale(0.3); opacity: 1; }
      100% { transform: scale(1.8); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
})();