// js/ui/ritual-meter.ts – Gem Meter with Empowered Circle trigger
// Eight faceted jewels glow red as the ritual builds. When all 8 are lit
// and you have at least 3 Orbex fragments, the circle becomes Empowered!
// Braided‑rite references removed.

import { el } from '../core/dom-helper.js';
import { ritualEngine } from '../systems/ritual-engine.js';
import {
  braidedTracePhases,  // kept for backward compat but no longer used
  empoweredCircle,
  orbexFragments,
  selectedRunes,
} from '../core/state-signals.js';
import { playSfx } from '../audio/sfx.js';
import { addLog } from '../ui/log-manager.js';

const GEM_COUNT = 8;
const CIRCLE_RADIUS = 100;
const CANVAS_SIZE = 440;
const CENTER = CANVAS_SIZE / 2;
const GEM_SIZE = 11;

export class GemMeter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gems: { active: boolean; opacity: number; pulse: number; fillAnim: number }[];
  private allLitOnce = false;   // prevent double‑trigger of empowered circle
  private animFrame: number | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'gemMeterCanvas';
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;
    this.canvas.style.cssText =
      'position:absolute; top:0; left:0; pointer-events:none; z-index:15; border-radius:50%;';
    const ritualCircle = el('ritualCircle');
    if (ritualCircle) {
      ritualCircle.style.position = 'relative';
      ritualCircle.appendChild(this.canvas);
    } else {
      document.body.appendChild(this.canvas);
    }
    this.ctx = this.canvas.getContext('2d')!;
    this.gems = Array.from({ length: GEM_COUNT }, () => ({
      active: false,
      opacity: 0,
      pulse: 0,
      fillAnim: 0,
    }));
    this.startLoop();
  }

  private computeFillCount(): number {
    let count = Math.floor(ritualEngine.score.value / 12.5); // up to 8
    // Bonus for having all three rune slots filled
    if (selectedRunes.value.length === 3) count += 1;
    return Math.min(GEM_COUNT, count);
  }

  /**
   * If the circle becomes fully lit and we have at least 3 Orbex fragments,
   * the circle becomes Empowered – enabling legendary summons.
   */
  private checkEmpowered(): void {
    const fill = this.computeFillCount();
    if (fill >= GEM_COUNT && !this.allLitOnce) {
      if (orbexFragments.value >= 3) {
        empoweredCircle.value = true;
        addLog(
          '💀 The circle ignites with crimson power! The Altar is empowered.',
          false,
          'orbex'
        );
        playSfx('True_Name_Complete');
        this.allLitOnce = true;
      }
    }
    // Once fragments drop below 3, reset the empowerment and allow re‑triggering
    if (orbexFragments.value < 3 && this.allLitOnce) {
      empoweredCircle.value = false;
      this.allLitOnce = false;
    }
  }

  private startLoop(): void {
    const loop = (time: number) => {
      this.draw(time);
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  private draw(timestamp: number): void {
    const ctx = this.ctx;
    const count = this.computeFillCount();
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    for (let i = 0; i < GEM_COUNT; i++) {
      const target = i < count ? 1 : 0;
      const gem = this.gems[i];

      gem.opacity += (target - gem.opacity) * 0.08;

      if (target > 0) {
        gem.pulse += 0.04;
        gem.fillAnim = Math.min(1, gem.fillAnim + 0.03);
      } else {
        gem.pulse = Math.max(0, gem.pulse - 0.05);
        gem.fillAnim = Math.max(0, gem.fillAnim - 0.05);
      }

      const alpha = Math.min(1, Math.max(0, gem.opacity));
      const pulseSize = 1 + Math.sin(gem.pulse * Math.PI * 2) * 0.2 * gem.fillAnim;

      const angle = (i / GEM_COUNT) * Math.PI * 2 - Math.PI / 2;
      const x = CENTER + Math.cos(angle) * CIRCLE_RADIUS;
      const y = CENTER + Math.sin(angle) * CIRCLE_RADIUS;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulseSize, pulseSize);
      this.drawGem(ctx, alpha, gem.fillAnim);
      ctx.restore();
    }
    this.checkEmpowered();
  }

  private drawGem(ctx: CanvasRenderingContext2D, alpha: number, fill: number): void {
    const r = GEM_SIZE + fill * 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.65;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.shadowColor = fill > 0 ? '#ff2020' : '#4a1a1a';
    ctx.shadowBlur = fill > 0 ? 18 + 10 * Math.sin(Date.now() * 0.005 + 1) : 4;

    const gradient = ctx.createRadialGradient(0, -2, 1, 0, 2, r);
    if (fill > 0.3) {
      gradient.addColorStop(0, '#fff0f0');
      gradient.addColorStop(0.3, '#c02020');
      gradient.addColorStop(1, '#600000');
    } else {
      gradient.addColorStop(0, '#3a2a2a');
      gradient.addColorStop(0.3, '#2a1010');
      gradient.addColorStop(1, '#100505');
    }
    ctx.fillStyle = gradient;
    ctx.globalAlpha = alpha;
    ctx.fill();

    if (fill > 0.2) {
      ctx.beginPath();
      ctx.arc(-2, -3, r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * fill) + ')';
      ctx.fill();
    }
  }

  public destroy(): void {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// ── Singleton ──
let instance: GemMeter | null = null;

export function initGemMeter(): GemMeter {
  if (!instance) instance = new GemMeter();
  return instance;
}

export function initRitualMeter(): GemMeter {
  return initGemMeter();
}

export function destroyGemMeter(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}