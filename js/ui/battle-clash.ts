// js/ui/battle-clash.ts – Fluid, cinematic card clash
// Dense particle impact, pool‑based SFX, reusable stage for seamless battle transition.
// Uses lightweight DOM particles for high count without canvas overhead.

import { playPool, playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import type { Card } from '../data/cards.js';

const CONFIG = {
  duration: {
    flipIn: 300,
    pushIn: 900,
    clash: 200,
    pushOut: 700,
    fadeOut: 300,
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
    clash: 1.25,
    end: 1.1,
  },
  rotation: {
    start: 25,
    end: 3,
  },
  particleCount: 300,          // dense burst
  spring: {
    bounce: 1.4,
    decay: 10,
  },
};

let clashEnabled = true;
export function setClashEnabled(enabled: boolean) { clashEnabled = enabled; }
export function isClashEnabled(): boolean { return clashEnabled; }

// ── Injected CSS keyframes ─────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('clash-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'clash-keyframes';
  style.textContent = `
    @keyframes clashFlash {
      0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
      15%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      30%  { opacity: 0.7; transform: translate(-50%, -50%) scale(0.9); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(1.4); }
    }
    @keyframes clashParticleFly {
      0%   { transform: translate(0,0) scale(1); opacity: 1; }
      100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
    }
    @keyframes cardLand {
      0%   { transform: translate(-50%, -50%) rotateY(var(--rot)) scale(var(--scl)); opacity: 0; }
      100% { transform: translate(-50%, -50%) rotateY(0) scale(1); opacity: 1; }
    }
    @keyframes cardPushOut {
      to { transform: translate(-50%, -50%) translateX(var(--tx)) scale(var(--scl)) rotateY(var(--rot)); opacity: 0.4; }
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

// ── Helper to animate via Web Animations API ───────────────────────
function animateEl(
  el: HTMLElement,
  keyframes: Keyframe[],
  options: number | KeyframeAnimationOptions,
): Promise<void> {
  const anim = el.animate(keyframes, options);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    anim.finish();
  }
  return anim.finished.then(() => undefined);
}

// ── Spawn dense DOM particle burst ─────────────────────────────────
function spawnClashParticles(stage: HTMLElement, count: number) {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute; top:50%; left:50%; width:0; height:0; pointer-events:none;';
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 160;
    const size = 2 + Math.random() * 4;
    p.style.cssText = `
      position:absolute; width:${size}px; height:${size}px;
      background: #ffd700; border-radius:50%;
      box-shadow: 0 0 ${size * 2}px #ffaa00;
      animation: clashParticleFly 0.6s ease-out forwards;
    `;
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    container.appendChild(p);
  }
  stage.appendChild(container);
  setTimeout(() => container.remove(), 800);
}

// ── Main Clash Animation Class ─────────────────────────────────────
export class CardClashAnimation {
  private overlay: HTMLDivElement | null = null;
  private playerEl: HTMLDivElement | null = null;
  private enemyEl: HTMLDivElement | null = null;
  private stage: HTMLDivElement | null = null;
  private skipHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.skipHandler = (e: KeyboardEvent) => this.onSkip(e);
    injectStyles();
  }

  /**
   * Plays the full clash sequence.
   * Returns the overlay element (stage) so the caller can attach battle UI inside.
   */
  public async play(playerCard: Card, enemyCard: Card): Promise<HTMLDivElement | null> {
    if (!clashEnabled) return null;

    startLoop('card_battle_music_bed');
    playPool('clash_card_reveal');

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:3000; display:flex; align-items:center; justify-content:center; overflow:hidden;';
    this.stage = document.createElement('div');
    this.stage.style.cssText = 'position:relative; width:100%; height:100%;';
    this.overlay.appendChild(this.stage);

    this.playerEl = this.createCard(playerCard, 'player');
    this.enemyEl = this.createCard(enemyCard, 'enemy');
    this.stage.appendChild(this.playerEl);
    this.stage.appendChild(this.enemyEl);

    // Initial off‑screen positions
    this.playerEl.style.transform = `translate(-50%, -50%) translateX(${-CONFIG.positions.startOffset}px) rotateY(${CONFIG.rotation.start}deg) scale(${CONFIG.scale.start})`;
    this.enemyEl.style.transform = `translate(-50%, -50%) translateX(${CONFIG.positions.startOffset}px) rotateY(${-CONFIG.rotation.start}deg) scale(${CONFIG.scale.start})`;

    document.body.appendChild(this.overlay);
    document.addEventListener('keydown', this.skipHandler);

    // Sequence
    await this.flipIn();
    playPool('clash_landing', 0.8);
    await this.pushToClash();

    // Impact burst
    playSfx('clash_impact', 1.0);
    spawnClashParticles(this.stage, CONFIG.particleCount);
    this.applyFlexDistortion();

    await this.pushApart();
    // Done – keep overlay alive with dim background and cards in final places
    return this.overlay;
  }

  /** Dispose completely (called on skip or after battle) */
  public dispose(): void {
    document.removeEventListener('keydown', this.skipHandler);
    stopLoop('card_battle_music_bed');
    this.overlay?.remove();
    this.overlay = null;
    this.stage = null;
  }

  // ── Private sequence methods ────────────────────────────────────
  private async flipIn(): Promise<void> {
    const dur = CONFIG.duration.flipIn;
    await Promise.all([
      animateEl(this.playerEl!, [
        { transform: `translate(-50%, -50%) translateX(${-CONFIG.positions.startOffset}px) rotateY(${CONFIG.rotation.start}deg) scale(${CONFIG.scale.start})` },
        { transform: `translate(-50%, -50%) translateX(${CONFIG.positions.idleOffset}px) rotateY(0deg) scale(${CONFIG.scale.idle})` }
      ], { duration: dur, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }),
      animateEl(this.enemyEl!, [
        { transform: `translate(-50%, -50%) translateX(${CONFIG.positions.startOffset}px) rotateY(${-CONFIG.rotation.start}deg) scale(${CONFIG.scale.start})` },
        { transform: `translate(-50%, -50%) translateX(${-CONFIG.positions.idleOffset}px) rotateY(0deg) scale(${CONFIG.scale.idle})` }
      ], { duration: dur, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' })
    ]);
  }

  private async pushToClash(): Promise<void> {
    const dur = CONFIG.duration.pushIn;
    await Promise.all([
      animateEl(this.playerEl!, [
        { transform: `translate(-50%, -50%) translateX(${CONFIG.positions.idleOffset}px) scale(${CONFIG.scale.idle})` },
        { transform: `translate(-50%, -50%) translateX(${CONFIG.positions.clashOffset}px) scale(${CONFIG.scale.clash})` }
      ], { duration: dur, easing: 'ease-in-out', fill: 'forwards' }),
      animateEl(this.enemyEl!, [
        { transform: `translate(-50%, -50%) translateX(${-CONFIG.positions.idleOffset}px) scale(${CONFIG.scale.idle})` },
        { transform: `translate(-50%, -50%) translateX(${-CONFIG.positions.clashOffset}px) scale(${CONFIG.scale.clash})` }
      ], { duration: dur, easing: 'ease-in-out', fill: 'forwards' })
    ]);
  }

  private async pushApart(): Promise<void> {
    const dur = CONFIG.duration.pushOut;
    await Promise.all([
      animateEl(this.playerEl!, [
        { transform: `translate(-50%, -50%) translateX(${CONFIG.positions.clashOffset}px) scale(${CONFIG.scale.clash})` },
        { transform: `translate(-50%, -50%) translateX(${CONFIG.positions.endOffset}px) scale(${CONFIG.scale.end}) rotateY(${CONFIG.rotation.end}deg)` }
      ], { duration: dur, easing: 'ease-in-out', fill: 'forwards' }),
      animateEl(this.enemyEl!, [
        { transform: `translate(-50%, -50%) translateX(${-CONFIG.positions.clashOffset}px) scale(${CONFIG.scale.clash})` },
        { transform: `translate(-50%, -50%) translateX(${-CONFIG.positions.endOffset}px) scale(${CONFIG.scale.end}) rotateY(${-CONFIG.rotation.end}deg)` }
      ], { duration: dur, easing: 'ease-in-out', fill: 'forwards' })
    ]);
  }

  private applyFlexDistortion(): void {
    [this.playerEl, this.enemyEl].forEach(el => {
      if (!el) return;
      const inner = el.querySelector('div');
      if (inner) {
        inner.style.filter = `perspective(800px) skewX(${Math.random() * 4 - 2}deg) skewY(${Math.random() * 4 - 2}deg)`;
        setTimeout(() => { if (inner) inner.style.filter = ''; }, 180);
      }
    });
  }

  private createCard(card: Card, side: 'player' | 'enemy'): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position:absolute; top:50%; left:50%; width:260px; aspect-ratio:3/4;
      filter:drop-shadow(0 0 30px rgba(255,215,0,0.5));
      will-change:transform,opacity;
      backface-visibility:hidden; -webkit-backface-visibility:hidden;
      transform-origin: center center;
    `;
    const inner = document.createElement('div');
    inner.style.cssText = 'position:relative; width:100%; height:100%; border-radius:16px; overflow:hidden; background:#0a0508;';
    inner.innerHTML = `
      <img src="${card.image}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:16px;">
      <img src="${card.frame}" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;object-fit:contain;border-radius:16px;">
      <div style="position:absolute;bottom:-30px;left:50%;transform:translateX(-50%);color:#e0d8cc;font-size:1.3rem;text-shadow:0 0 15px rgba(0,0,0,0.8);white-space:nowrap;">${card.name}</div>
    `;
    wrapper.appendChild(inner);
    return wrapper;
  }

  private onSkip(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.dispose();
  }
}