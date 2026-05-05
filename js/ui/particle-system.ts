// js/ui/particle-system.ts – High‑performance, object‑pooled particle engine.
// Used by summoning, clash, and battle effects. Supports multiple preset types.

const MAX_POOL_SIZE = 300;
let activeParticles: ActiveParticle[] = [];
let animFrameId: number | null = null;
let baseStylesInjected = false;

// Reusable DOM elements
const PARTICLE_POOL: HTMLElement[] = [];

interface ActiveParticle {
  el: HTMLElement;
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  glow?: string;
  text?: string;
  borderRadius?: string;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  scaleSpeed: number;
}

/* ── Preset types ──────────────────────────────────────────────────── */
export type ParticleType = 'runic' | 'void rift' | 'dust' | 'ember' | 'spark' | 'ash';

export interface EmitConfig {
  type: ParticleType;
  count: number;
  duration: number;   // milliseconds
  velocity?: number;
  spread?: number;
  color?: string;
  size?: number;
  text?: boolean;
}

/* ── Style injection ───────────────────────────────────────────────── */
function injectBaseStyles(): void {
  if (baseStylesInjected) return;
  const style = document.createElement('style');
  style.id = 'particle-base-styles';
  style.textContent = `
    .kg-particle {
      position: fixed;
      pointer-events: none;
      z-index: 10000;
      will-change: transform, opacity;
      backface-visibility: hidden;
    }
  `;
  document.head.appendChild(style);
  baseStylesInjected = true;
}

/* ── Pool helpers ──────────────────────────────────────────────────── */
function acquireParticle(): HTMLElement {
  if (PARTICLE_POOL.length > 0) {
    return PARTICLE_POOL.pop()!;
  }
  const el = document.createElement('div');
  el.className = 'kg-particle';
  document.body.appendChild(el);
  return el;
}

function releaseParticle(el: HTMLElement): void {
  el.style.display = 'none';
  el.textContent = '';
  el.style.background = '';
  el.style.boxShadow = '';
  el.style.borderRadius = '';
  if (PARTICLE_POOL.length < MAX_POOL_SIZE) {
    PARTICLE_POOL.push(el);
  } else {
    el.remove();
  }
}

/* ── Render loop ───────────────────────────────────────────────────── */
function startLoop(): void {
  if (animFrameId !== null) return;
  let lastTime = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const p = activeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        releaseParticle(p.el);
        activeParticles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;
      p.scale += p.scaleSpeed * dt;

      const progress = 1 - p.life / p.maxLife;
      const opacity = p.opacity * (1 - progress);

      p.el.style.opacity = `${opacity}`;
      p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rotation}deg) scale(${p.scale})`;

      if (p.glow) {
        p.el.style.boxShadow = `0 0 ${8 * (1 - progress)}px ${p.glow}`;
      }
    }

    if (activeParticles.length > 0) {
      animFrameId = requestAnimationFrame(tick);
    } else {
      animFrameId = null;
    }
  };
  animFrameId = requestAnimationFrame(tick);
}

/* ── Spawn particle ────────────────────────────────────────────────── */
function spawnParticle(opts: {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  glow?: string;
  text?: string;
  borderRadius?: string;
  opacity?: number;
  rotation?: number;
  rotationSpeed?: number;
  scale?: number;
  scaleSpeed?: number;
}): void {
  const el = acquireParticle();
  el.style.display = 'block';
  el.style.width = `${opts.size}px`;
  el.style.height = `${opts.size}px`;
  el.style.borderRadius = opts.borderRadius ?? '50%';
  el.style.transform = `translate3d(${opts.x}px, ${opts.y}px, 0) rotate(${opts.rotation ?? 0}deg) scale(${opts.scale ?? 1})`;
  el.style.opacity = `${opts.opacity ?? 1}`;

  if (opts.text) {
    el.textContent = opts.text;
    el.style.color = opts.color;
    el.style.fontSize = `${opts.size}px`;
    el.style.background = 'none';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.borderRadius = '0';
  } else {
    el.textContent = '';
    el.style.background = opts.color;
    el.style.display = 'block';
  }

  if (opts.glow) {
    el.style.boxShadow = `0 0 8px ${opts.glow}`;
  } else {
    el.style.boxShadow = '';
  }

  activeParticles.push({
    el,
    x: opts.x,
    y: opts.y,
    vx: opts.vx,
    vy: opts.vy,
    life: opts.life,
    maxLife: opts.maxLife,
    size: opts.size,
    color: opts.color,
    glow: opts.glow,
    text: opts.text,
    borderRadius: opts.borderRadius,
    opacity: opts.opacity ?? 1,
    rotation: opts.rotation ?? 0,
    rotationSpeed: opts.rotationSpeed ?? 0,
    scale: opts.scale ?? 1,
    scaleSpeed: opts.scaleSpeed ?? 0,
  });

  startLoop();
}

/* ── Public API ────────────────────────────────────────────────────── */

/**
 * Emit particles from the centre of a target element.
 * @param target  The DOM element around which particles will burst.
 * @param config  Particle configuration (type, count, duration, etc.).
 */
export function emitParticles(target: HTMLElement, config: EmitConfig): void {
  injectBaseStyles();

  const rect = target.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  const lifeSec = config.duration / 1000;
  const count = config.count;
  const velocity = config.velocity ?? 2.5;
  const spread = config.spread ?? 1;

  const presets: Record<ParticleType, Partial<{ size: number; color: string; glow: string; borderRadius: string; text: boolean }>> = {
    'runic': {
      size: 14,
      color: '#f0a85a',
      glow: '#ffd700',
      borderRadius: '20%',
      text: true,
    },
    'void rift': {
      size: 6,
      color: '#8a2be2',
      glow: '#8a2be2',
      borderRadius: '50%',
    },
    'dust': {
      size: 4,
      color: '#c8b89a',
      glow: '#c8b89a',
      borderRadius: '50%',
    },
    'ember': {
      size: 7,
      color: '#ff6a2a',
      glow: '#ff6a2a',
      borderRadius: '50%',
    },
    'spark': {
      size: 3,
      color: '#ffd700',
      glow: '#ffd700',
      borderRadius: '50%',
    },
    'ash': {
      size: 8,
      color: '#555555',
      glow: '#444444',
      borderRadius: '20%',
    },
  };

  const preset = presets[config.type] || presets['spark'];
  const runes = config.type === 'runic' ? ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ'] : null;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = velocity * (0.5 + Math.random());
    const vx = Math.cos(angle) * speed * spread;
    const vy = Math.sin(angle) * speed * spread;
    const life = lifeSec * (0.5 + Math.random() * 0.5);
    const size = (config.size ?? preset.size ?? 4) + Math.random() * 4;
    const color = config.color || preset.color || '#ffffff';
    const glow = preset.glow || color;

    let text: string | undefined;
    if (runes && preset.text) {
      text = runes[Math.floor(Math.random() * runes.length)];
    }

    spawnParticle({
      x: originX + (Math.random() - 0.5) * 10,
      y: originY + (Math.random() - 0.5) * 10,
      vx, vy,
      life,
      maxLife: life,
      size,
      color,
      glow,
      text,
      borderRadius: preset.borderRadius ?? '50%',
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 200,
      scale: 0.2 + Math.random() * 0.8,
      scaleSpeed: (1 - 0.2) / life,
    });
  }
}

/**
 * Immediately remove all active particles.
 */
export function clearAllParticles(): void {
  for (const p of activeParticles) {
    releaseParticle(p.el);
  }
  activeParticles = [];
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}