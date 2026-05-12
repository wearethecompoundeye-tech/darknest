// js/minigames/rune-etch.ts
// Rune Invocation – Etch a chosen rune into the ritual circle.
// Quality of the trace determines the rune's potency (bonus multiplier).
// The acolyte selects a rune and a slot, then traces its shape against a fading guide.

import {
  ingredients,
  knownRunes,
  runeSlots,
  selectedRunes,
  tutorial,
  addMasteryXP,
  autoSave,
} from '../core/state-signals.js';
import { runeData } from '../data/runes.js';
import { addLog } from '../ui/log-manager.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import { el } from '../core/dom-helper.js';
import { updateRuneSlots } from '../ui/ui-renderer.js';

// ── Configuration ─────────────────────────────────────────────────
const CANVAS_SIZE = 300;
const TRACE_WIDTH = 5;
const FADE_STEPS = 12;       // guide fades in steps as you trace
const QUALITY_THRESHOLD = 0.5; // minimum quality to succeed

// ── State ────────────────────────────────────────────────────────
let overlay: HTMLDivElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let isActive = false;
let targetRuneName = '';
let targetSlot = -1;          // 0,1,2
let runeShape: number[][] = [];

// Tracing state
let tracing = false;
let cursorPos: { x: number; y: number } | null = null;
let tracePoints: { x: number; y: number }[] = [];
let traceQuality = 0;
let guideAlpha = 1.0;        // fades as you trace
let currentSegment = 0;
let totalSegments = 0;
let segmentDistanceCovered = 0;

// Selection phase
let selectedRune = '';
let selectedSlot = -1;

// ── Public entry ────────────────────────────────────────────────
export function startRuneTracing(preSelectedRune?: string, preSelectedSlot?: number): void {
  if (isActive) return;

  if (knownRunes.value.length === 0) {
    addLog('No runes known. Study a rune first.', true);
    return;
  }

  // If a rune and slot were pre‑selected, use them; otherwise show selection UI
  if (preSelectedRune && preSelectedSlot !== undefined && preSelectedSlot >= 0 && preSelectedSlot <= 2) {
    // Check that the slot is empty
    if (runeSlots.value[preSelectedSlot] !== '') {
      addLog(`Slot ${preSelectedSlot + 1} is already filled. Click "Clear Rune" first.`, true);
      return;
    }
    beginInvocation(preSelectedRune, preSelectedSlot);
  } else {
    showSelectionOverlay();
  }
}

// ── Selection Overlay ────────────────────────────────────────────
function showSelectionOverlay(): void {
  overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.style.display = 'flex';
  overlay.style.zIndex = '3000';
  let runeOptions = '';
  knownRunes.value.forEach(r => {
    runeOptions += `<button class="craft-btn rune-select-btn" data-rune="${r}" style="margin:4px;">${r}</button>`;
  });
  let slotOptions = '';
  for (let i = 0; i < 3; i++) {
    const filled = runeSlots.value[i];
    const disabled = filled ? 'disabled' : '';
    slotOptions += `<button class="craft-btn slot-select-btn" data-slot="${i}" ${disabled} style="margin:4px;">Slot ${i+1}${filled ? ` (${filled})` : ''}</button>`;
  }

  overlay.innerHTML = `
    <div class="modal-content" style="max-width:400px; text-align:center;">
      <h3>✏️ Invoke Rune</h3>
      <p>Choose a rune and an empty slot to inscribe.</p>
      <div id="runeSelection">${runeOptions}</div>
      <div style="margin-top:10px;">Select Slot:</div>
      <div id="slotSelection">${slotOptions}</div>
      <p id="selectionStatus" style="color:#ffd700;">Rune: none, Slot: none</p>
      <button id="confirmInvokeBtn" class="craft-btn" disabled>Begin Tracing</button>
      <button id="cancelSelectionBtn" class="craft-btn">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Selection logic
  document.querySelectorAll('.rune-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rune = (e.currentTarget as HTMLElement).dataset.rune!;
      selectedRune = rune;
      document.querySelectorAll('.rune-select-btn').forEach(b => b.classList.remove('selected'));
      (e.currentTarget as HTMLElement).classList.add('selected');
      updateSelectionStatus();
    });
  });
  document.querySelectorAll('.slot-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const slot = parseInt((e.currentTarget as HTMLElement).dataset.slot!);
      if (runeSlots.value[slot] !== '') return;
      selectedSlot = slot;
      document.querySelectorAll('.slot-select-btn').forEach(b => b.classList.remove('selected'));
      (e.currentTarget as HTMLElement).classList.add('selected');
      updateSelectionStatus();
    });
  });

  document.getElementById('confirmInvokeBtn')!.addEventListener('click', () => {
    if (selectedRune && selectedSlot !== -1) {
      overlay?.remove();
      overlay = null;
      beginInvocation(selectedRune, selectedSlot);
    }
  });
  document.getElementById('cancelSelectionBtn')!.addEventListener('click', () => {
    overlay?.remove();
    overlay = null;
  });

  function updateSelectionStatus() {
    const status = document.getElementById('selectionStatus')!;
    status.textContent = `Rune: ${selectedRune || 'none'}, Slot: ${selectedSlot !== -1 ? selectedSlot + 1 : 'none'}`;
    const confirmBtn = document.getElementById('confirmInvokeBtn') as HTMLButtonElement;
    if (confirmBtn) confirmBtn.disabled = !(selectedRune && selectedSlot !== -1);
  }
}

// ── Invocation Setup ─────────────────────────────────────────────
function beginInvocation(runeName: string, slot: number): void {
  const rune = runeData.find(r => r.name === runeName);
  if (!rune) { addLog('Rune data missing.', true); return; }
  targetRuneName = runeName;
  targetSlot = slot;
  runeShape = rune.shape.map(([x, y]) => [
    (x / 200) * CANVAS_SIZE,
    (y / 200) * CANVAS_SIZE
  ]);
  totalSegments = runeShape.length - 1;

  // Build tracing overlay
  overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.style.display = 'flex';
  overlay.style.zIndex = '3000';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width:480px; text-align:center;">
      <h3>✏️ Inscribe ${runeName} into Slot ${slot + 1}</h3>
      <p style="color:#c0b0a0;">Trace the rune accurately. Guide fades as you progress.</p>
      <canvas id="etchCanvas" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" style="background:#1a0e1a; border-radius:12px; border:1px solid #5a4a3a;"></canvas>
      <div class="progress-bar" style="width:100%; height:10px; margin:8px 0;">
        <div id="etchProgress" class="progress-fill" style="width:0%; background:linear-gradient(90deg,#7ea04b,#d4af37);"></div>
      </div>
      <p id="etchStatus">Trace the glowing path</p>
      <div style="display:flex; justify-content:center; gap:10px;">
        <button id="etchConfirmBtn" class="craft-btn">✅ Complete</button>
        <button id="etchCancelBtn" class="craft-btn">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  canvas = document.getElementById('etchCanvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d');
  if (!ctx) { closeEtch(false); return; }

  // Events
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('mouseleave', onPointerUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  document.getElementById('etchConfirmBtn')!.addEventListener('click', finishEtch);
  document.getElementById('etchCancelBtn')!.addEventListener('click', () => closeEtch(false));

  isActive = true;
  guideAlpha = 1.0;
  tracePoints = [];
  traceQuality = 0;
  currentSegment = 0;
  segmentDistanceCovered = 0;

  window.dispatchEvent(new CustomEvent('darknest:minigame-state', { detail: { active: true, source: 'rune-etch' } }));
  playSfx('runeClick');

  drawGuideAndTrail();
}

// ── Drawing ──────────────────────────────────────────────────────
function drawGuideAndTrail(): void {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 1. Draw the guide (fading)
  if (guideAlpha > 0.05) {
    ctx.save();
    ctx.strokeStyle = `rgba(240, 168, 90, ${guideAlpha * 0.5})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = `rgba(240, 168, 90, ${guideAlpha * 0.3})`;
    ctx.shadowBlur = 8;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let i = 0; i < runeShape.length; i++) {
      const [x, y] = runeShape[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 2. Draw the player's trace (additive glow)
  if (tracePoints.length > 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = TRACE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#d4af37';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(tracePoints[0].x, tracePoints[0].y);
    for (let i = 1; i < tracePoints.length; i++) {
      ctx.lineTo(tracePoints[i].x, tracePoints[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 3. Show cursor
  if (cursorPos) {
    ctx.save();
    ctx.fillStyle = '#a0d07a';
    ctx.shadowColor = '#a0d07a';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cursorPos.x, cursorPos.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Progress bar
  const progress = computeTraceQuality().progress;
  const progEl = document.getElementById('etchProgress');
  if (progEl) progEl.style.width = `${Math.floor(progress * 100)}%`;
}

// ── Trace quality computation ────────────────────────────────────
function computeTraceQuality(): { progress: number; accuracy: number } {
  // Compare trace points to ideal segments
  let totalCovered = 0;
  let accuracySum = 0;
  let accuracyCount = 0;

  // For each segment, check how much of it the trace covers
  for (let seg = 0; seg < totalSegments; seg++) {
    const [x1, y1] = runeShape[seg];
    const [x2, y2] = runeShape[seg + 1];
    const segLength = Math.hypot(x2 - x1, y2 - y1);
    let covered = 0;
    // Check each trace point against this segment
    for (const p of tracePoints) {
      const dist = distanceToSegment(p.x, p.y, x1, y1, x2, y2);
      if (dist < 15) {
        // point is near this segment
        covered += 5; // approximate
      }
    }
    const segmentCoverage = Math.min(1, covered / segLength);
    totalCovered += segmentCoverage;
    if (segmentCoverage > 0.3) {
      accuracySum += segmentCoverage;
      accuracyCount++;
    }
  }

  const progress = totalCovered / totalSegments;
  const accuracy = accuracyCount > 0 ? accuracySum / accuracyCount : 0;
  return { progress, accuracy };
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

// ── Pointer events ──────────────────────────────────────────────
function getCanvasPos(e: MouseEvent): { x: number; y: number } {
  const rect = canvas!.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function getTouchPos(e: TouchEvent): { x: number; y: number } {
  const rect = canvas!.getBoundingClientRect();
  const t = e.touches[0];
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}

function onPointerDown(e: MouseEvent): void {
  if (!isActive) return;
  tracing = true;
  const p = getCanvasPos(e);
  tracePoints = [p];
  cursorPos = p;
  // Fade guide a bit
  guideAlpha = Math.max(0.0, guideAlpha - 0.15);
  drawGuideAndTrail();
}

function onPointerMove(e: MouseEvent): void {
  if (!isActive || !tracing) return;
  const p = getCanvasPos(e);
  tracePoints.push(p);
  cursorPos = p;
  // Keep guide fading slightly
  if (tracePoints.length % 10 === 0) guideAlpha = Math.max(0.0, guideAlpha - 0.05);
  drawGuideAndTrail();
}

function onPointerUp(): void {
  tracing = false;
  if (!isActive) return;
  // Update quality after finishing
  const { progress, accuracy } = computeTraceQuality();
  traceQuality = accuracy * progress; // combined score
  const statusEl = document.getElementById('etchStatus');
  if (statusEl) statusEl.textContent = `Accuracy: ${Math.floor(accuracy * 100)}% | Coverage: ${Math.floor(progress * 100)}%`;
}

function onTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (!isActive) return;
  tracing = true;
  const p = getTouchPos(e);
  tracePoints = [p];
  cursorPos = p;
  guideAlpha = Math.max(0.0, guideAlpha - 0.15);
  drawGuideAndTrail();
}

function onTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (!isActive || !tracing) return;
  const p = getTouchPos(e);
  tracePoints.push(p);
  cursorPos = p;
  if (tracePoints.length % 10 === 0) guideAlpha = Math.max(0.0, guideAlpha - 0.05);
  drawGuideAndTrail();
}

function onTouchEnd(e: TouchEvent): void {
  e.preventDefault();
  tracing = false;
  if (!isActive) return;
  const { progress, accuracy } = computeTraceQuality();
  traceQuality = accuracy * progress;
  const statusEl = document.getElementById('etchStatus');
  if (statusEl) statusEl.textContent = `Accuracy: ${Math.floor(accuracy * 100)}% | Coverage: ${Math.floor(progress * 100)}%`;
}

// ── Completion ───────────────────────────────────────────────────
function finishEtch(): void {
  if (!isActive) return;
  const { progress, accuracy } = computeTraceQuality();
  traceQuality = accuracy * progress;
  const success = traceQuality >= QUALITY_THRESHOLD;

  closeEtch(success);
}

function closeEtch(success: boolean): void {
  isActive = false;
  window.dispatchEvent(new CustomEvent('darknest:minigame-state', { detail: { active: false, source: 'rune-etch' } }));

  if (overlay) { overlay.remove(); overlay = null; }
  if (canvas) {
    canvas.removeEventListener('mousedown', onPointerDown);
    canvas.removeEventListener('mousemove', onPointerMove);
    canvas.removeEventListener('mouseup', onPointerUp);
    canvas.removeEventListener('mouseleave', onPointerUp);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas = null;
  }

  if (success && targetSlot >= 0 && targetRuneName) {
    // Place the rune in the selected slot
    const newSlots = [...runeSlots.value] as [string, string, string];
    newSlots[targetSlot] = targetRuneName;
    runeSlots.value = newSlots;

    const qualityPercent = Math.floor(traceQuality * 100);
    addLog(`Rune ${targetRuneName} etched in slot ${targetSlot + 1} with ${qualityPercent}% potency.`, false, 'player');
    playSfx('runeApply');
    addMasteryXP(8 + Math.floor(traceQuality * 10));
    updateRuneSlots();

    if (!tutorial.value.firstRuneEtched) {
      tutorial.value = { ...tutorial.value, firstRuneEtched: true };
      addLog('📖 Tome updated: Rune Etching.', false, 'system');
    }
    autoSave();
  } else if (!success) {
    addLog(`Etching failed. Quality insufficient (< ${QUALITY_THRESHOLD * 100}%).`, true);
    playSfx('runeEtchFail');
  }
}