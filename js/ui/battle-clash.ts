// js/ui/battle-clash.ts – Physics‑enhanced clash with spring motion, pooled particles, and audio sync.
import { type Card } from '../data/cards.js';
import { playSfx, startLoop } from '../audio/sfx.js';
import { emitParticles } from './particle-system.js';

const CONFIG = {
  duration: {
    flipIn: 300,
    pushIn: 1250,
    clash: 250,
    pushOut: 800,
    fadeOut: 400,
  },
  positions: {
    startOffset: 350,
    idleOffset: -180,
    clashOffset: -5,
    endOffset: -120,
  },
  scale: {
    start: 0.7,
    idle: 1.05,
    clash: 1.35,
    end: 1.1,
  },
  rotation: {
    start: 25,
    end: 3,
  },
  particleCount: 150,          // reused for pooled runic burst
  spring: {
    bounce: 1.8,
    decay: 12,
  },
  easing: {
    flipIn: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // easeOutBack
    pushIn: 'ease-in-out',
    shake: 'ease-out',
    pushOut: 'ease-in-out',
    fadeOut: 'ease-in-out',
  },
};

let clashEnabled = true;
export function setClashEnabled(enabled: boolean) { clashEnabled = enabled; }
export function isClashEnabled(): boolean { return clashEnabled; }

function injectStyles() {
  if (document.getElementById('clash-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'clash-keyframes';
  style.textContent = `
    @keyframes flashBlast {
      0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
      10%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      25%  { opacity: 0.8; transform: translate(-50%, -50%) scale(0.9); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
    }
    @keyframes auraPulse {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50%      { opacity: 0.6; transform: scale(1.05); }
    }
    @keyframes auraDrift {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes landingDust {
      0%   { transform: translate(0,0) scale(0); opacity: 1; }
      100% { transform: translate(var(--dx), var(--dy)) scale(1.5); opacity: 0; }
    }
    @keyframes parallaxShake {
      0%   { transform: translate(0,0) scale(1); }
      100% { transform: translate(var(--sx), var(--sy)) scale(var(--ss)); }
    }
    @media (prefers-reduced-motion: reduce) {
      .battle-commencement-active,
      .enemy-card-reveal {
        animation-duration: 0.01s !important;
        transition-duration: 0.01s !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function animate(
  el: HTMLElement,
  keyframes: Keyframe[],
  options: number | KeyframeAnimationOptions
): Promise<void> {
  const anim = el.animate(keyframes, options);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    anim.finish();
  }
  return anim.finished.then(() => undefined);
}

// ── Spring‑based motion for push‑in and clash impact ──
async function springAnimate(
  el: HTMLElement,
  toScale: number,
  toOffsetX: number,
  duration: number,
  bounce: number,
  decay: number
): Promise<void> {
  const fps = 60;
  const steps = Math.round((duration / 1000) * fps);
  const frames: Keyframe[] = [];

  const currTransform = el.style.transform || '';
  const scaleMatch = currTransform.match(/scale\(([^)]+)\)/);
  const currentScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
  const translateMatch = currTransform.match(/translateX\(([-\d.]+)px\)/);
  const currentOffset = translateMatch ? parseFloat(translateMatch[1]) : 0;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ease = 1 - Math.exp(-decay * t);
    const offset = toOffsetX * ease;
    const bounceAmplitude = Math.sin(t * bounce * Math.PI) * (1 - t);
    const scale = toScale + (toScale - currentScale) * bounceAmplitude;

    frames.push({
      transform: `translate(-50%, -50%) translateX(${offset}px) scale(${scale.toFixed(3)})`,
      offset: t,
    });
  }

  return animate(el, frames, {
    duration,
    fill: 'forwards',
    easing: 'linear',
  });
}

export class CardClashAnimation {
  private overlay: HTMLDivElement | null = null;
  private skipHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.skipHandler = (e: KeyboardEvent) => this.onSkip(e);
    injectStyles();
  }

  public async play(playerCard: Card, enemyCard: Card): Promise<void> {
    if (!clashEnabled) return;
    try {
      startLoop('card_battle_music_bed');

      this.overlay = document.createElement('div');
      this.overlay.style.cssText = 'position:fixed; inset:0; background:#000; z-index:3000; display:flex; align-items:center; justify-content:center; overflow:hidden;';
      const stage = document.createElement('div');
      stage.style.cssText = 'position:relative; width:100%; height:100%;';
      this.overlay.appendChild(stage);

      const playerEl = this.createClashCard(playerCard, 'player');
      const enemyEl = this.createClashCard(enemyCard, 'enemy');
      stage.appendChild(playerEl);
      stage.appendChild(enemyEl);

      const startX = -CONFIG.positions.startOffset;
      playerEl.style.transform = `translate(-50%, -50%) translateX(${startX}px) rotateY(${CONFIG.rotation.start}deg) scale(${CONFIG.scale.start})`;
      enemyEl.style.transform = `translate(-50%, -50%) translateX(${-startX}px) rotateY(${-CONFIG.rotation.start}deg) scale(${CONFIG.scale.start})`;

      document.body.appendChild(this.overlay);
      document.addEventListener('keydown', this.skipHandler);

      playSfx('enemy_card_reveal');
      playSfx('player_card_reveal');

      await this.runSequence(playerEl, enemyEl, stage);
    } catch (error) {
      console.error('Clash failed:', error);
    } finally {
      document.removeEventListener('keydown', this.skipHandler);
      this.dispose();
    }
  }

  private async runSequence(playerEl: HTMLElement, enemyEl: HTMLElement, stage: HTMLElement) {
    const pos = CONFIG.positions;
    const dur = CONFIG.duration;
    const scl = CONFIG.scale;
    const rot = CONFIG.rotation;
    const easing = CONFIG.easing;

    // 1. Flip in
    await Promise.all([
      animate(playerEl, [
        { transform: `translate(-50%, -50%) translateX(${-pos.startOffset}px) rotateY(${rot.start}deg) scale(${scl.start})` },
        { transform: `translate(-50%, -50%) translateX(${pos.idleOffset}px) rotateY(0deg) scale(${scl.idle})` }
      ], { duration: dur.flipIn, easing: easing.flipIn, fill: 'forwards' }),
      animate(enemyEl, [
        { transform: `translate(-50%, -50%) translateX(${pos.startOffset}px) rotateY(${-rot.start}deg) scale(${scl.start})` },
        { transform: `translate(-50%, -50%) translateX(${-pos.idleOffset}px) rotateY(0deg) scale(${scl.idle})` }
      ], { duration: dur.flipIn, easing: easing.flipIn, fill: 'forwards' })
    ]);

    playSfx('cards_landing_in_place');
    this.spawnLandingDust(stage);

    // 2. Spring push toward clash
    await Promise.all([
      springAnimate(playerEl, scl.clash, pos.clashOffset, dur.pushIn, CONFIG.spring.bounce, CONFIG.spring.decay),
      springAnimate(enemyEl, scl.clash, -pos.clashOffset, dur.pushIn, CONFIG.spring.bounce, CONFIG.spring.decay)
    ]);

    // Micro‑rebound
    await Promise.all([
      animate(playerEl, [
        { transform: `translate(-50%, -50%) translateX(${pos.clashOffset}px) scale(${scl.clash})` },
        { transform: `translate(-50%, -50%) translateX(${pos.clashOffset + 3}px) scale(${scl.clash - 0.03})` }
      ], { duration: 60, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'forwards' }),
      animate(enemyEl, [
        { transform: `translate(-50%, -50%) translateX(${-pos.clashOffset}px) scale(${scl.clash})` },
        { transform: `translate(-50%, -50%) translateX(${-pos.clashOffset - 3}px) scale(${scl.clash - 0.03})` }
      ], { duration: 60, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'forwards' })
    ]);

    // Flex distortion
    this.applyFlexDistortion(playerEl.querySelector('div'), enemyEl.querySelector('div'));

    // Impact SFX + shake
    this.playImpactSFX();
    this.parallaxShake(stage, 300);

    // Pooled runic blast (replaces heavy canvas)
    this.spawnRunicBlast(stage);

    // Push apart and fade
    await Promise.all([
      animate(playerEl, [
        { transform: `translate(-50%, -50%) translateX(${pos.clashOffset}px) scale(${scl.clash})` },
        { transform: `translate(-50%, -50%) translateX(${pos.endOffset}px) scale(${scl.end}) rotateY(${rot.end}deg)` }
      ], { duration: dur.pushOut, easing: easing.pushOut, fill: 'forwards' }),
      animate(enemyEl, [
        { transform: `translate(-50%, -50%) translateX(${-pos.clashOffset}px) scale(${scl.clash})` },
        { transform: `translate(-50%, -50%) translateX(${-pos.endOffset}px) scale(${scl.end}) rotateY(${-rot.end}deg)` }
      ], { duration: dur.pushOut, easing: easing.pushOut, fill: 'forwards' })
    ]);

    await Promise.all([
      animate(playerEl, { opacity: [1, 0] }, { duration: dur.fadeOut, easing: easing.fadeOut, fill: 'forwards' }),
      animate(enemyEl, { opacity: [1, 0] }, { duration: dur.fadeOut, easing: easing.fadeOut, fill: 'forwards' })
    ]);

    if (this.overlay) {
      this.overlay.style.transition = `opacity ${dur.fadeOut}ms`;
      this.overlay.style.opacity = '0';
      await new Promise(resolve => setTimeout(resolve, dur.fadeOut + 50));
    }
  }

  private createClashCard(card: Card, side: 'player' | 'enemy'): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute; top:50%; left:50%; width:280px; aspect-ratio:3/4; filter:drop-shadow(0 0 35px rgba(212,175,55,0.6)); will-change:transform,opacity; backface-visibility:hidden; -webkit-backface-visibility:hidden; transform:translate3d(0,0,0);';
    const inner = document.createElement('div');
    inner.style.cssText = 'position:relative; width:100%; height:100%; border-radius:16px; overflow:hidden; background:#0a0508;';
    inner.innerHTML = `
      <img src="${card.image}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:16px;">
      <img src="${card.frame}" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:16px;object-fit:contain;">
      <div style="position:absolute;bottom:-36px;left:50%;transform:translateX(-50%);color:#e0d8cc;font-size:1.4rem;text-shadow:0 0 15px rgba(0,0,0,0.8);white-space:nowrap;">${card.name}</div>
    `;
    const aura = document.createElement('div');
    aura.style.cssText = `
      position:absolute; inset:-15px; border-radius:16px; pointer-events:none;
      background: radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 70%);
      animation: auraPulse 3s ease-in-out infinite, auraDrift 6s linear infinite;
    `;
    inner.appendChild(aura);
    wrapper.appendChild(inner);
    return wrapper;
  }

  private applyFlexDistortion(inner1: HTMLElement | null, inner2: HTMLElement | null) {
    [inner1, inner2].forEach(inner => {
      if (!inner) return;
      inner.style.filter = `perspective(800px) skewX(${Math.random() * 3 - 1.5}deg) skewY(${Math.random() * 3 - 1.5}deg)`;
      setTimeout(() => { if (inner) inner.style.transform = ''; }, 150);
    });
  }

  private spawnLandingDust(stage: HTMLElement) {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute; top:50%; left:50%; width:0; height:0; pointer-events:none;';
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('div');
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 80;
      p.style.cssText = `
        position:absolute; width:4px; height:4px; background:#c8b89a;
        border-radius:50%; box-shadow:0 0 4px #c8b89a;
        animation: landingDust 0.5s ease-out forwards;
      `;
      p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      container.appendChild(p);
    }
    stage.appendChild(container);
    setTimeout(() => container.remove(), 600);
  }

  private parallaxShake(stage: HTMLElement, duration: number) {
    const layers = [
      { scale: 0.98, intensity: 2 },
      { scale: 1.0, intensity: 6 },
      { scale: 1.02, intensity: 10 },
    ];

    layers.forEach(({ scale, intensity }) => {
      const layer = document.createElement('div');
      layer.style.cssText = `position:absolute; inset:0; pointer-events:none;`;
      const keyframes: Keyframe[] = [];
      for (let i = 0; i <= 20; i++) {
        const offset = i / 20;
        keyframes.push({
          transform: `translate(${(Math.random() - 0.5) * intensity}px, ${(Math.random() - 0.5) * intensity}px) scale(${scale})`,
          offset,
        });
      }
      layer.animate(keyframes, { duration, fill: 'forwards', easing: 'ease-out' });
      stage.appendChild(layer);
      setTimeout(() => layer.remove(), duration + 50);
    });
  }

  private spawnRunicBlast(stage: HTMLElement) {
    // Use the pooled particle system – avoids canvas toDataURL entirely.
    emitParticles(stage, {
      type: 'runic',
      count: CONFIG.particleCount,
      duration: 1100,
      velocity: 3,
      spread: 1.5,
    });

    // Add a central flash via a CSS‑animated element (lightweight)
    const flash = document.createElement('div');
    flash.style.cssText = `
      position:absolute; top:50%; left:50%; width:120px; height:120px;
      background:radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,224,0.8) 30%, transparent 70%);
      border-radius:50%; transform:translate(-50%, -50%) scale(0.6);
      animation: flashBlast 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    `;
    stage.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
  }

  private playImpactSFX() {
    playSfx('clash_impact', 1.2);
    if (navigator.vibrate) navigator.vibrate(40);
    setTimeout(() => playSfx('hard_impact_critical_bone_crush', 1.0), 150);
    setTimeout(() => playSfx('spell_impact', 0.7), 200);
    playSfx('screen_shake');
  }

  private dispose() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  private onSkip(e: KeyboardEvent) {
    if (e.key === 'Escape') this.dispose();
  }
}