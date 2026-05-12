// js/ui/battle-effects.ts – Dense, high‑performance particle system with combo banners
// Enhanced with AttackEffects cooperation, aspect‑themed damage colours, and combo streaks.

import { playPool, startLoop, stopLoop } from '../audio/sfx.js';
import { AttackEffects } from './attack-effects.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  alpha: number;
  text?: string;
}

interface ScreenShake {
  intensity: number;
  duration: number;
  elapsed: number;
  dirX?: number;
  dirY?: number;
}

export class BattleEffects {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private shake: ScreenShake | null = null;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private animFrame = 0;
  private lastTime = 0;
  private activeBanners: HTMLElement[] = [];
  private comboCount = 0;

  init(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'battle-canvas-layer';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.injectStyles();
    this.startRenderLoop();
  }

  dispose(): void {
    cancelAnimationFrame(this.animFrame);
    this.canvas?.remove();
    this.particles = [];
    this.activeBanners.forEach(b => b.remove());
    this.activeBanners = [];
    this.comboCount = 0;
  }

  /**
   * Show damage numbers + burst particles + screen shake.
   * Coordinates are in screen space.
   */
  showDamage(
    x: number,
    y: number,
    amount: number,
    type: 'normal' | 'critical' | 'blocked' | 'heal' = 'normal',
    element?: string,
    attackerX?: number,
    attackerY?: number,
  ): void {
    const colorMap: Record<string, string> = {
      normal: '#ffffff',
      critical: '#ffd700',
      blocked: '#88ccff',
      heal: '#a0d07a',
      Fire: '#ff6a2a',
      Water: '#69a3e7',
      Void: '#aa55ff',
      Earth: '#c8b890',
      Air: '#90c0e0',
      Life: '#a0d07a',
      Death: '#cc6666',
    };
    const color = colorMap[element ?? type] ?? colorMap[type];
    const prefix = type === 'heal' ? '+' : '';

    // Add damage text particle (floating number)
    const size = type === 'critical' ? 24 : (amount > 20 ? 20 : 16);
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: -70 - Math.random() * 30,
      life: 0,
      maxLife: 2.0,
      color,
      size,
      alpha: 1,
      text: `${prefix}${amount}`,
    });

    // Dense burst of tiny sparks
    const sparkCount = type === 'critical' ? 70 : 35;
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed * 0.04,
        vy: Math.sin(angle) * speed * 0.04,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.6,
        color,
        size: 2 + Math.random() * 3,
        alpha: 0.9,
      });
    }

    // Screen shake for heavy/crit hits, directional if attacker coords provided
    if (type === 'critical' || amount > 15) {
      const intensity = type === 'critical' ? 12 : 8;
      let dirX = 0, dirY = 0;
      if (attackerX !== undefined && attackerY !== undefined) {
        const dx = x - attackerX;
        const dy = y - attackerY;
        const len = Math.hypot(dx, dy) + 0.001;
        dirX = (dx / len) * 0.5;
        dirY = (dy / len) * 0.5;
      }
      this.triggerShake(intensity, 0.45, dirX, dirY);
      playPool('critical_hit', 1.2);
    } else if (type === 'blocked') {
      playPool('card_hit_damage', 0.6);
    } else {
      playPool('attack_hit', 0.9);
    }
  }

  /**
   * Show a combo streak banner (e.g., "⚡ COMBO x3").
   * Automatically increment and display; resets after 2s of no calls.
   */
  showComboBanner(): void {
    this.comboCount++;
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed; top: 30%; left: 50%; transform: translate(-50%, -50%) scale(0.8);
      font-size: ${2 + this.comboCount * 0.3}rem;
      font-weight: bold; font-family: 'Cinzel', serif;
      color: #ffd700; text-shadow: 0 0 20px #ffaa00, 0 0 40px #ff6600;
      pointer-events: none; z-index: 5001;
      animation: comboIn 0.3s ease-out forwards, comboOut 0.4s 1.5s ease-in forwards;
    `;
    banner.textContent = `⚡ COMBO x${this.comboCount}`;
    document.body.appendChild(banner);
    this.activeBanners.push(banner);
    // Reset combo count after a delay
    clearTimeout((this as any)._comboResetTimer);
    (this as any)._comboResetTimer = setTimeout(() => {
      this.comboCount = 0;
    }, 2500);
    setTimeout(() => {
      banner.remove();
      this.activeBanners = this.activeBanners.filter(b => b !== banner);
    }, 2000);
    playPool('victory_fanfare', 0.5);
  }

  triggerShake(intensity: number, duration: number, dirX?: number, dirY?: number): void {
    this.shake = { intensity, duration, elapsed: 0, dirX, dirY };
    playPool('screen_shake', 0.6);
  }

  showTurnBanner(text: string): void {
    const banner = document.createElement('div');
    banner.textContent = text;
    banner.style.cssText = `
      position: fixed; top: 10%; left: 50%; transform: translate(-50%, -50%);
      font-size: 2.4rem; font-weight: bold; font-family: 'Cinzel', serif;
      color: #e0d8cc; text-shadow: 0 0 20px #d4af37;
      animation: turnIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards,
                 turnOut 0.4s 1.5s ease-in forwards;
      pointer-events: none; z-index: 5000;
    `;
    document.body.appendChild(banner);
    this.activeBanners.push(banner);
    setTimeout(() => {
      banner.remove();
      this.activeBanners = this.activeBanners.filter(b => b !== banner);
    }, 2000);
  }

  shakeCard(cardEl: HTMLElement): void {
    cardEl.style.animation = 'none';
    void cardEl.offsetWidth;
    cardEl.style.animation = 'cardShake 0.35s ease-in-out';
    setTimeout(() => {
      cardEl.style.animation = '';
    }, 350);
  }

  async showVictory(tier: 'scuffle' | 'solid' | 'masterful' = 'solid'): Promise<void> {
    playPool('victory_fanfare', 0.8);
    const tierConfig = {
      scuffle: { text: 'VICTORY', color: '#c8b890', particles: 100 },
      solid: { text: 'VICTORY', color: '#ffd700', particles: 160 },
      masterful: { text: 'MASTERFUL', color: '#ffaa00', particles: 250 },
    };
    const cfg = tierConfig[tier];
    const start = performance.now();
    const duration = 3500;

    return new Promise(resolve => {
      const draw = (now: number) => {
        const elapsed = now - start;
        if (elapsed > duration) {
          resolve();
          return;
        }
        if (!this.ctx) return;
        const progress = Math.min(elapsed / 1000, 1);
        this.ctx.save();
        this.ctx.globalAlpha = Math.min(1, progress * 2);
        this.ctx.font = `bold ${tier === 'masterful' ? 100 : 80}px Cinzel, serif`;
        this.ctx.fillStyle = cfg.color;
        this.ctx.shadowColor = cfg.color;
        this.ctx.shadowBlur = 50;
        const text = cfg.text;
        const tw = this.ctx.measureText(text).width;
        this.ctx.fillText(text, this.width / 2 - tw / 2, this.height / 2 - 40);
        this.ctx.restore();

        // Spawn victory sparks via AttackEffects for dense bursts
        if (Math.random() < 0.5) {
          const sx = this.width * (0.3 + Math.random() * 0.4);
          const sy = this.height * (0.3 + Math.random() * 0.4);
          AttackEffects.play('radial', sx, sy, 5, 'Life');
        }

        // Canvas particles
        const spawnRate = tier === 'masterful' ? 10 : 5;
        for (let i = 0; i < spawnRate; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 100 + Math.random() * 250;
          this.particles.push({
            x: this.width / 2 + Math.cos(angle) * dist,
            y: this.height / 2 + Math.sin(angle) * dist * 0.6,
            vx: Math.cos(angle + Math.PI) * 2,
            vy: Math.sin(angle + Math.PI) * 2 - 1,
            life: 0,
            maxLife: 1.8 + Math.random(),
            color: cfg.color,
            size: 3 + Math.random() * 5,
            alpha: 1,
          });
        }
        if (elapsed < duration) requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    });
  }

  async showDefeat(): Promise<void> {
    playPool('defeat', 0.7);
    const start = performance.now();
    const duration = 2500;
    return new Promise(resolve => {
      const draw = (now: number) => {
        const elapsed = now - start;
        if (elapsed > duration) {
          resolve();
          return;
        }
        if (!this.ctx) return;
        const progress = Math.min(elapsed / 1000, 1);
        this.ctx.save();
        this.ctx.globalAlpha = Math.min(1, progress * 2);
        this.ctx.font = 'bold 90px Cinzel, serif';
        this.ctx.fillStyle = '#cc0000';
        this.ctx.shadowColor = '#ff0000';
        this.ctx.shadowBlur = 40;
        const text = 'DEFEAT';
        const tw = this.ctx.measureText(text).width;
        this.ctx.fillText(text, this.width / 2 - tw / 2, this.height / 2);
        this.ctx.restore();

        // Dark, downward particles
        for (let i = 0; i < 4; i++) {
          this.particles.push({
            x: this.width / 2 + (Math.random() - 0.5) * 400,
            y: this.height / 2 + Math.random() * 150,
            vx: (Math.random() - 0.5) * 4,
            vy: 1 + Math.random() * 3,
            life: 0,
            maxLife: 1.8 + Math.random(),
            color: '#cc0000',
            size: 3 + Math.random() * 5,
            alpha: 1,
          });
        }
        if (elapsed < duration) requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    });
  }

  // ── Canvas resize ───────────────────────────────────────────────
  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas!.width = this.width * this.dpr;
    this.canvas!.height = this.height * this.dpr;
    this.canvas!.style.width = `${this.width}px`;
    this.canvas!.style.height = `${this.height}px`;
    this.ctx!.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // ── Render loop ──────────────────────────────────────────────────
  private startRenderLoop(): void {
    const loop = (timestamp: number) => {
      const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
      this.lastTime = timestamp;
      this.ctx!.clearRect(0, 0, this.width, this.height);
      this.updateParticles(dt);
      this.drawParticles();
      this.applyScreenShake(dt);
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx!;
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const ease = 1 - t;
      ctx.save();
      ctx.globalAlpha = p.alpha * ease;
      if (p.text) {
        ctx.font = `bold ${p.size}px Cinzel, serif`;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * ease, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private applyScreenShake(dt: number): void {
    if (this.shake) {
      this.shake.elapsed += dt;
      if (this.shake.elapsed >= this.shake.duration) {
        this.shake = null;
        this.canvas!.style.transform = '';
      } else {
        const decay = 1 - this.shake.elapsed / this.shake.duration;
        let sx = (Math.random() - 0.5) * this.shake.intensity * decay;
        let sy = (Math.random() - 0.5) * this.shake.intensity * decay;
        if (this.shake.dirX !== undefined) {
          sx += this.shake.dirX * this.shake.intensity * decay * 2;
        }
        if (this.shake.dirY !== undefined) {
          sy += this.shake.dirY * this.shake.intensity * decay * 2;
        }
        this.canvas!.style.transform = `translate(${sx}px, ${sy}px)`;
      }
    }
  }

  // ── CSS keyframes ───────────────────────────────────────────────
  private injectStyles(): void {
    if (document.getElementById('battle-fx-styles-v3')) return;
    const style = document.createElement('style');
    style.id = 'battle-fx-styles-v3';
    style.textContent = `
      @keyframes turnIn {
        from { opacity: 0; transform: translate(-50%, -70%); }
        to   { opacity: 1; transform: translate(-50%, -50%); }
      }
      @keyframes turnOut {
        to   { opacity: 0; transform: translate(-50%, -30%); }
      }
      @keyframes cardShake {
        0%, 100% { transform: translateX(0); }
        20%      { transform: translateX(-5px); }
        40%      { transform: translateX(5px); }
        60%      { transform: translateX(-4px); }
        80%      { transform: translateX(4px); }
      }
      @keyframes comboIn {
        0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        50%  { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }
      @keyframes comboOut {
        to   { transform: translate(-50%, -60%) scale(1.1); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}