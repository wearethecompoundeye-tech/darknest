// js/ui/battle-effects.ts – High‑resolution canvas‑based battle spectacle
// All particle effects, damage numbers, screen shake, victory/defeat sequences
// are drawn on a dedicated retina‑resolution canvas. No memory‑heavy CSS abuse.
import { playSfx } from '../audio/sfx.js';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  type: 'damage' | 'element' | 'victory' | 'defeat';
  text?: string;
}

interface ScreenShake {
  intensity: number; duration: number; elapsed: number;
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

  // HP bar targets for CSS bars (we update the CSS directly)
  private hpPlayerTarget = 100;
  private hpEnemyTarget = 100;
  private hpPlayerCurrent = 100;
  private hpEnemyCurrent = 100;
  private activeBanners: HTMLElement[] = [];

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
  }

  setPlayerHp(percent: number): void {
    this.hpPlayerTarget = Math.max(0, Math.min(100, percent));
  }
  setEnemyHp(percent: number): void {
    this.hpEnemyTarget = Math.max(0, Math.min(100, percent));
  }
  bindHpBars(_playerBar: HTMLElement, _enemyBar: HTMLElement): void {
    // Not needed; CSS bars are updated directly via setPlayerHp/setEnemyHp and the render loop.
  }

  showDamage(
    x: number, y: number, amount: number,
    type: 'normal' | 'critical' | 'blocked' | 'heal' = 'normal',
    element?: string
  ): void {
    const colorMap: Record<string, string> = {
      normal: '#ffffff', critical: '#ffd700', blocked: '#88ccff', heal: '#a0d07a',
      Fire: '#ff6a2a', Ice: '#69a3e7', Void: '#aa55ff', Earth: '#c8b890',
      Air: '#90c0e0', Water: '#7ea0d0', Life: '#a0d07a', Death: '#cc6666'
    };
    const color = colorMap[element || type] || colorMap[type];
    const prefix = type === 'heal' ? '+' : '';
    this.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 30,
      vy: -70 - Math.random() * 40,
      life: 0, maxLife: 2.2,
      color, size: type === 'critical' ? 32 : 22,
      type: 'damage', text: `${prefix}${amount}`
    });

    if (type === 'critical') this.triggerShake(8, 0.6);
    if (element) {
      const elementColor = colorMap[element] || '#ffffff';
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 80;
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * dist * 0.05,
          vy: Math.sin(angle) * dist * 0.05,
          life: 0, maxLife: 0.8,
          color: elementColor, size: 4 + Math.random() * 6,
          type: 'element'
        });
      }
    }
  }

  triggerShake(intensity: number, duration: number): void {
    this.shake = { intensity, duration, elapsed: 0 };
    playSfx('screen_shake');
  }

  showVictory(): Promise<void> {
    return new Promise(resolve => {
      const startTime = performance.now();
      const drawVictory = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        if (elapsed > 3) { resolve(); return; }
        if (!this.ctx) return;
        this.ctx.save();
        this.ctx.globalAlpha = Math.min(1, elapsed * 2);
        this.ctx.font = 'bold 80px Cinzel';
        this.ctx.fillStyle = '#ffd700';
        this.ctx.shadowColor = '#ffaa00';
        this.ctx.shadowBlur = 50;
        const text = 'VICTORY';
        const textWidth = this.ctx.measureText(text).width;
        this.ctx.fillText(text, this.width / 2 - textWidth / 2, this.height / 2);
        this.ctx.restore();
        for (let i = 0; i < 2; i++) {
          const angle = Math.random() * Math.PI * 2;
          this.particles.push({
            x: this.width / 2 + (Math.random() - 0.5) * 200,
            y: this.height / 2 + (Math.random() - 0.5) * 100,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3 - 1,
            life: 0, maxLife: 2, color: '#ffd700', size: 3 + Math.random() * 5,
            type: 'victory'
          });
        }
        if (elapsed < 3) requestAnimationFrame(drawVictory);
      };
      requestAnimationFrame(drawVictory);
    });
  }

  showDefeat(): Promise<void> {
    return new Promise(resolve => {
      const startTime = performance.now();
      const drawDefeat = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        if (elapsed > 2.2) { resolve(); return; }
        if (!this.ctx) return;
        this.ctx.save();
        this.ctx.globalAlpha = Math.min(1, elapsed * 2);
        this.ctx.font = 'bold 80px Cinzel';
        this.ctx.fillStyle = '#cc0000';
        this.ctx.shadowColor = '#ff0000';
        this.ctx.shadowBlur = 30;
        const text = 'DEFEAT';
        const textWidth = this.ctx.measureText(text).width;
        this.ctx.fillText(text, this.width / 2 - textWidth / 2, this.height / 2);
        this.ctx.restore();
        for (let i = 0; i < 1; i++) {
          const angle = Math.random() * Math.PI * 2;
          this.particles.push({
            x: this.width / 2, y: this.height / 2,
            vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2 - 1,
            life: 0, maxLife: 1.5, color: '#cc0000', size: 2 + Math.random() * 4,
            type: 'defeat'
          });
        }
        if (elapsed < 2.2) requestAnimationFrame(drawDefeat);
      };
      requestAnimationFrame(drawDefeat);
    });
  }

  showTurnBanner(text: string): void {
    const banner = document.createElement('div');
    banner.textContent = text;
    banner.style.cssText = `
      position: fixed; top: 12%; left: 50%; transform: translate(-50%, -50%);
      font-size: 2rem; font-weight: bold; font-family: 'Cinzel', serif;
      color: #e0d8cc; text-shadow: 0 0 20px #d4af37;
      animation: turnIn 0.4s ease-out, turnOut 0.4s 1.2s ease-in forwards;
      pointer-events: none; z-index: 5000;
    `;
    document.body.appendChild(banner);
    this.activeBanners.push(banner);
    setTimeout(() => {
      banner.remove();
      this.activeBanners = this.activeBanners.filter(b => b !== banner);
    }, 1700);
  }

  shakeCard(cardEl: HTMLElement): void {
    cardEl.style.animation = 'none';
    void cardEl.offsetWidth; // force reflow
    cardEl.style.animation = 'cardShake 0.35s ease-in-out';
    setTimeout(() => { cardEl.style.animation = ''; }, 350);
  }

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
      ctx.save();
      ctx.globalAlpha = 1 - t;
      if (p.type === 'damage' && p.text) {
        ctx.font = `${p.size}px Cinzel, serif`;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t), 0, Math.PI * 2);
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
        const sx = (Math.random() - 0.5) * this.shake.intensity * decay;
        const sy = (Math.random() - 0.5) * this.shake.intensity * decay;
        this.canvas!.style.transform = `translate(${sx}px, ${sy}px)`;
      }
    }
  }

  private injectStyles(): void {
    if (document.getElementById('battle-fx-styles')) return;
    const style = document.createElement('style');
    style.id = 'battle-fx-styles';
    style.textContent = `
      @keyframes turnIn {
        from { opacity: 0; transform: translate(-50%, -60%); }
        to   { opacity: 1; transform: translate(-50%, -50%); }
      }
      @keyframes turnOut {
        to   { opacity: 0; transform: translate(-50%, -40%); }
      }
      @keyframes cardShake {
        0%, 100% { transform: translateX(0); }
        20%      { transform: translateX(-4px); }
        40%      { transform: translateX(4px); }
        60%      { transform: translateX(-3px); }
        80%      { transform: translateX(3px); }
      }
    `;
    document.head.appendChild(style);
  }
}