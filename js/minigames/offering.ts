// js/minigames/offering.ts
// Offering – Pour the Phial and ignite the Powder to seal the circle.
// Quality saved to (window as any).__offeringQuality and dispatched via event.

import {
  crafted,
  circlePower,
  circleQuality,
  runeSlots,
  kalgothsNoose,
  addMasteryXP,
  autoSave,
} from '../core/state-signals.js';
import { addLog } from '../ui/log-manager.js';
import { playSfx } from '../audio/sfx.js';

// ── Configuration ─────────────────────────────────────────────────
const CANVAS_SIZE = 360;
const POUR_DURATION_MS = 4000;
const QUALITY_THRESHOLD = 0.4;

// ── State ────────────────────────────────────────────────────────
let overlay: HTMLDivElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let isActive = false;

let pourProgress = 0;
let pourStartTime = 0;
let pouring = false;
let pourQuality = 0;

let igniteProgress = 0;
let igniting = false;
let flamePoints: { angle: number; life: number }[] = [];

let offeringQuality = 0;

export function startOffering(): boolean {
  if (isActive) return false;

  if (circleQuality.value <= 0) {
    addLog('The circle must be traced first.', true);
    return false;
  }
  if (runeSlots.value.filter(r => r !== '').length === 0) {
    addLog('At least one rune must be etched.', true);
    return false;
  }
  if (crafted.value.powderOfWarding < 1 || crafted.value.phialOfSubjugation < 1) {
    addLog('Missing Powder or Phial.', true);
    return false;
  }

  crafted.value = {
    ...crafted.value,
    powderOfWarding: crafted.value.powderOfWarding - 1,
    phialOfSubjugation: crafted.value.phialOfSubjugation - 1,
  };

  isActive = true;
  pourProgress = 0;
  igniteProgress = 0;
  pouring = false;
  igniting = false;
  offeringQuality = 0;
  flamePoints = [];

  overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.style.display = 'flex';
  overlay.style.zIndex = '3000';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width:480px; text-align:center;">
      <h3>🕯️ Seal the Ritual</h3>
      <p id="offeringInstructions" style="color:#c0b0a0;">Pour the Phial steadily. Keep the flask level.</p>
      <canvas id="offeringCanvas" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" style="background:#0a0508; border-radius:50%; border:2px solid #5a4a3a; margin:8px auto; display:block;"></canvas>
      <div class="progress-bar" style="width:100%; height:8px; margin:6px 0;">
        <div id="offeringProgress" class="progress-fill" style="width:0%; background:linear-gradient(90deg,#7ea04b,#d4af37);"></div>
      </div>
      <p id="offeringStatus">Prepare the Phial</p>
      <button id="offeringCancelBtn" class="craft-btn">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  canvas = document.getElementById('offeringCanvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d');
  if (!ctx) { closeOffering(); return false; }

  canvas.addEventListener('mousedown', onPourStart);
  canvas.addEventListener('mousemove', onPourMove);
  canvas.addEventListener('mouseup', onPourEnd);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('click', onCanvasClick);

  document.getElementById('offeringCancelBtn')!.addEventListener('click', () => closeOffering());

  window.dispatchEvent(new CustomEvent('darknest:minigame-state', { detail: { active: true, source: 'offering' } }));
  playSfx('uiClick');

  setTimeout(() => startPourPhase(), 800);
  return true;
}

function startPourPhase(): void {
  pouring = true;
  pourStartTime = performance.now();
  document.getElementById('offeringInstructions')!.textContent = 'Move the mouse slowly up and down to keep the pour steady.';
}

function onPourStart(e: MouseEvent): void { if (pouring && !igniting) pourStartTime = performance.now(); }
function onTouchStart(e: TouchEvent): void { e.preventDefault(); onPourStart(e as any); }
function onPourMove(e: MouseEvent): void { /* tracking not needed */ }
function onTouchMove(e: TouchEvent): void { e.preventDefault(); }

function onPourEnd(e: MouseEvent): void {
  if (!pouring || igniting) return;
  pouring = false;
  const elapsed = performance.now() - pourStartTime;
  pourProgress = Math.min(1, elapsed / POUR_DURATION_MS);
  pourQuality = Math.min(1, elapsed / POUR_DURATION_MS) * 0.7 + 0.3;
  startIgnitePhase();
}
function onTouchEnd(e: TouchEvent): void { e.preventDefault(); onPourEnd(e as any); }

function startIgnitePhase(): void {
  igniting = true;
  document.getElementById('offeringInstructions')!.textContent = 'Click around the circle to spread the flame.';
  canvas!.removeEventListener('mousedown', onPourStart);
  canvas!.removeEventListener('mousemove', onPourMove);
  canvas!.removeEventListener('mouseup', onPourEnd);
  canvas!.removeEventListener('touchstart', onTouchStart);
  canvas!.removeEventListener('touchmove', onTouchMove);
  canvas!.removeEventListener('touchend', onTouchEnd);
}

function onCanvasClick(e: MouseEvent): void {
  if (!igniting) return;
  const rect = canvas!.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cx = CANVAS_SIZE / 2, cy = CANVAS_SIZE / 2;
  const angle = Math.atan2(y - cy, x - cx);
  flamePoints.push({ angle, life: 1.0 });
  if (flamePoints.length > 60) flamePoints.shift();

  const covered = computeFlameCoverage();
  igniteProgress = Math.min(1, covered);
  document.getElementById('offeringProgress')!.style.width = Math.floor(igniteProgress * 100) + '%';
  document.getElementById('offeringStatus')!.textContent = `Flame spreading: ${Math.floor(igniteProgress * 100)}%`;
  playSfx('circleTraceDot');
  draw();

  if (igniteProgress >= 0.95) completeOffering();
}

function computeFlameCoverage(): number {
  const sectors = 12;
  const hits = new Array(sectors).fill(false);
  flamePoints.forEach(fp => {
    let sec = Math.floor(((fp.angle + Math.PI) / (2 * Math.PI)) * sectors);
    if (sec < 0) sec += sectors;
    sec = Math.min(sectors - 1, Math.max(0, sec));
    hits[sec] = true;
  });
  return hits.filter(Boolean).length / sectors;
}

function completeOffering(): void {
  igniting = false;
  offeringQuality = pourQuality * 0.5 + igniteProgress * 0.5;
  const success = offeringQuality >= QUALITY_THRESHOLD;

  if (success) {
    circlePower.value = Math.min(100, circlePower.value + Math.floor(offeringQuality * 15));
    kalgothsNoose.value = Math.max(0, kalgothsNoose.value - Math.floor(offeringQuality * 8));
    addLog(`The offering is accepted. Circle power enhanced, Noose loosened.`, false, 'player');
    playSfx('circleTraceComplete');
  } else {
    addLog('The offering flickers weakly... the circle holds, but barely.', true);
    playSfx('runeEtchFail');
  }

  (window as any).__offeringQuality = offeringQuality;
  window.dispatchEvent(new CustomEvent('offering:completed', { detail: { quality: offeringQuality } }));
  addMasteryXP(5 + Math.floor(offeringQuality * 5));
  autoSave();
  setTimeout(() => closeOffering(), 1500);
}

function draw(): void {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const cx = CANVAS_SIZE / 2, cy = CANVAS_SIZE / 2, radius = CANVAS_SIZE / 2 - 20;
  ctx.save();
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  flamePoints.forEach(fp => {
    const x = cx + Math.cos(fp.angle) * radius;
    const y = cy + Math.sin(fp.angle) * radius;
    ctx.save();
    ctx.globalAlpha = fp.life * 0.8;
    ctx.fillStyle = '#ff6a2a';
    ctx.shadowColor = '#ff6a2a';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, 3 + fp.life * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    fp.life -= 0.015;
  });
  flamePoints = flamePoints.filter(fp => fp.life > 0);

  if (pouring || pourProgress > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(160, 200, 100, 0.7)';
    ctx.beginPath();
    ctx.rect(cx - 15, cy - pourProgress * 80, 30, pourProgress * 80);
    ctx.fill();
    ctx.restore();
  }
}

function closeOffering(): void {
  isActive = false;
  window.dispatchEvent(new CustomEvent('darknest:minigame-state', { detail: { active: false, source: 'offering' } }));
  if (overlay) { overlay.remove(); overlay = null; }
  canvas?.removeEventListener('click', onCanvasClick);
  canvas = null;
}