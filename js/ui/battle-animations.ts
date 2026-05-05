// js/ui/battle-animations.ts – Immersive canvas clash with background art and particles
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import type { Card } from '../data/cards.js';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let animFrame = 0;

function setupCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.className = 'battle-canvas-layer';
  document.body.appendChild(canvas);
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function cleanup() {
  cancelAnimationFrame(animFrame);
  if (canvas) {
    canvas.remove();
    canvas = null;
    ctx = null;
  }
  stopLoop('card_battle_music_bed');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function playBattleCommenceAnimation(enemyCard: Card): Promise<void> {
  setupCanvas();
  startLoop('card_battle_music_bed');
  playSfx('enemy_card_reveal');
  playSfx('player_card_reveal');

  const enemyImg = await loadImage(enemyCard.image);
  const enemyFrame = enemyCard.frame ? await loadImage(enemyCard.frame) : null;

  const startTime = performance.now();
  const duration = 2500;

  return new Promise(resolve => {
    function draw(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      if (!ctx) return;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Darken background gradually
      ctx.fillStyle = `rgba(0,0,0,${0.85 * (1 - progress)})`;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // Card draws in
      const scale = 0.4 + progress * 0.6;
      const alpha = Math.min(1, progress * 2);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(window.innerWidth / 2, window.innerHeight / 2);
      ctx.scale(scale, scale);
      if (enemyImg) {
        ctx.drawImage(enemyImg, -175, -233, 350, 466);
      }
      if (enemyFrame) {
        ctx.drawImage(enemyFrame, -175, -233, 350, 466);
      }
      ctx.restore();

      // Runic particles (high density)
      for (let i = 0; i < 12; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const r = 250 * progress + Math.random() * 60;
        const x = window.innerWidth / 2 + Math.cos(angle) * r;
        const y = window.innerHeight / 2 + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.arc(x, y, 2 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,164,92,${0.6 * progress})`;
        ctx.fill();
      }

      if (progress < 1) {
        animFrame = requestAnimationFrame(draw);
      } else {
        cleanup();
        resolve();
      }
    }

    animFrame = requestAnimationFrame(draw);
  });
}