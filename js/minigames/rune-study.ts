// js/minigames/rune-study.ts
// Shattered Glyph – rebuild a broken rune by dragging its scattered fragments
// back into place.  Correctly aligned with the ghost guide.

import {
  ingredients,
  knownRunes,
  discoveries,
  tutorial,
  addMasteryXP,
  autoSave,
} from '../core/state-signals.js';
import { runeData } from '../data/runes.js';
import { addLog } from '../ui/log-manager.js';
import { playSfx } from '../audio/sfx.js';

// ── Configuration ─────────────────────────────────────────────────
const CANVAS_SIZE = 360;
const SNAP_DIST = 18;          // pixels – generous snap radius
const GUIDE_OPACITY = 0.25;    // how faint the completed rune appears

// ── Fragment definition ───────────────────────────────────────────
interface Fragment {
  id: number;
  targetX: number;              // where it belongs (canvas coords)
  targetY: number;
  length: number;               // length of this stroke
  angle: number;               // direction in radians
  type: 'line';
  p1x: number;                  // original start point (unscaled)
  p1y: number;
  p2x: number;                  // original end point (unscaled)
  p2y: number;
}

// ── State ────────────────────────────────────────────────────────
let overlay: HTMLDivElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let isActive = false;
let targetRuneName = '';

let fragments: Fragment[] = [];
// Draggable pieces
interface DraggedPiece {
  frag: Fragment;
  x: number;        // current drawn position (center of line)
  y: number;
  snapped: boolean;
}
let pieces: DraggedPiece[] = [];
let selectedIdx = -1;
let dragOffX = 0;
let dragOffY = 0;

// ── Main entry ────────────────────────────────────────────────────
export function startRuneStudy(): void {
  if (isActive) return;

  const unknown = runeData.filter(r => !knownRunes.value.includes(r.name));
  if (unknown.length === 0) {
    addLog('All runes known.', true);
    return;
  }

  if (ingredients.value.nightshadeMoss < 5 || ingredients.value.cryptPhlegm < 5) {
    addLog("Need 5 Moss and 5 Phlegm.", true);
    return;
  }
  ingredients.value = {
    ...ingredients.value,
    nightshadeMoss: ingredients.value.nightshadeMoss - 5,
    cryptPhlegm: ingredients.value.cryptPhlegm - 5,
  };

  const rune = unknown[Math.floor(Math.random() * unknown.length)];
  targetRuneName = rune.name;

  // Build fragments from the rune shape
  fragments = [];
  const shape = rune.shape;   // array of [x,y] points, 200×200 reference
  const scale = CANVAS_SIZE / 200;
  for (let i = 0; i < shape.length - 1; i++) {
    const p1 = shape[i];
    const p2 = shape[i + 1];
    const dx = (p2[0] - p1[0]) * scale;
    const dy = (p2[1] - p1[1]) * scale;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    fragments.push({
      id: i,
      targetX: p1[0] * scale,       // start of segment = where fragment should be placed
      targetY: p1[1] * scale,
      length: len,
      angle: angle,
      type: 'line',
      p1x: p1[0],
      p1y: p1[1],
      p2x: p2[0],
      p2y: p2[1],
    });
  }

  pieces = fragments.map(f => ({
    frag: f,
    x: 40 + Math.random() * (CANVAS_SIZE - 80),
    y: 40 + Math.random() * (CANVAS_SIZE - 80),
    snapped: false,
  }));

  // Build UI
  overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.style.display = 'flex';
  overlay.style.zIndex = '3000';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width:440px; text-align:center;">
      <h3>🧩 Reconstruct the Glyph</h3>
      <p style="margin:4px 0; color:#c0b0a0;">Drag the glowing shards onto the faint outline to restore the rune.</p>
      <canvas id="studyCanvas" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" style="background:#0f0a14; border-radius:12px; margin:8px auto; display:block; border:1px solid #5a4a3a;"></canvas>
      <div id="studyProgress" style="color:#d4af37;">0/${fragments.length} shards placed</div>
      <div style="display:flex; justify-content:center; gap:10px; margin-top:8px;">
        <button id="studyResetBtn" class="craft-btn">🔄 Scatter</button>
        <button id="studyCancelBtn" class="craft-btn">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  canvas = document.getElementById('studyCanvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d');
  if (!ctx) { closeStudy(false); return; }

  // Events
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('mouseleave', onPointerUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  document.getElementById('studyResetBtn')!.addEventListener('click', resetPieces);
  document.getElementById('studyCancelBtn')!.addEventListener('click', () => closeStudy(false));

  isActive = true;
  window.dispatchEvent(new CustomEvent('darknest:minigame-state', { detail: { active: true, source: 'rune-study' } }));
  playSfx('pageTurn');

  draw();
}

// ── Drawing ──────────────────────────────────────────────────────
function draw(): void {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 1. Draw ghost guide (completed rune)
  if (targetRuneName) {
    const rune = runeData.find(r => r.name === targetRuneName);
    if (rune) {
      const shape = rune.shape;
      const scale = CANVAS_SIZE / 200;
      ctx.save();
      ctx.strokeStyle = `rgba(240, 168, 90, ${GUIDE_OPACITY})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.shadowColor = 'rgba(240,168,90,0.3)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < shape.length; i++) {
        const [x, y] = shape[i];
        if (i === 0) ctx.moveTo(x * scale, y * scale);
        else ctx.lineTo(x * scale, y * scale);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2. Draw each piece
  pieces.forEach((piece, idx) => {
    if (piece.snapped) return;  // snapped pieces drawn by ghost guide above
    drawFragment(piece, idx === selectedIdx);
  });

  // 3. Progress text
  const snappedCount = pieces.filter(p => p.snapped).length;
  const progressEl = document.getElementById('studyProgress');
  if (progressEl) progressEl.textContent = `${snappedCount}/${fragments.length} shards placed`;

  // 4. Check completion
  if (snappedCount === pieces.length) {
    setTimeout(() => completeStudy(), 600);
  }
}

function drawFragment(piece: DraggedPiece, selected: boolean): void {
  if (!ctx) return;
  const f = piece.frag;
  ctx.save();
  ctx.translate(piece.x, piece.y);
  ctx.rotate(f.angle);

  // Glow
  ctx.shadowColor = selected ? '#ffd700' : '#f0a85a';
  ctx.shadowBlur = selected ? 12 : 6;

  // Draw the line segment
  ctx.strokeStyle = selected ? '#ffd700' : '#f0a85a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(f.length, 0);
  ctx.stroke();

  // End caps (dots to grab)
  ctx.fillStyle = selected ? '#ffd700' : '#f0a85a';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(f.length, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── Hit testing ──────────────────────────────────────────────────
function hitTest(x: number, y: number): number {
  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i];
    if (p.snapped) continue;
    const dx = x - p.x;
    const dy = y - p.y;
    if (Math.sqrt(dx * dx + dy * dy) < 24) return i;
  }
  return -1;
}

// ── Pointer events ───────────────────────────────────────────────
function canvasPos(e: MouseEvent) { const r = canvas!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function touchPos(e: TouchEvent) { const r = canvas!.getBoundingClientRect(); const t = e.touches[0]; return { x: t.clientX - r.left, y: t.clientY - r.top }; }

function onPointerDown(e: MouseEvent): void {
  if (!isActive) return;
  const p = canvasPos(e);
  const idx = hitTest(p.x, p.y);
  if (idx === -1) return;
  selectedIdx = idx;
  dragOffX = p.x - pieces[idx].x;
  dragOffY = p.y - pieces[idx].y;
  draw();
}

function onPointerMove(e: MouseEvent): void {
  if (selectedIdx === -1 || !isActive) return;
  const p = canvasPos(e);
  pieces[selectedIdx].x = p.x - dragOffX;
  pieces[selectedIdx].y = p.y - dragOffY;
  // Re‑check snap on every move
  checkSnap(selectedIdx);
  draw();
}

function onPointerUp(): void {
  if (selectedIdx !== -1) {
    checkSnap(selectedIdx);
    selectedIdx = -1;
    draw();
  }
}

function onTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (!isActive) return;
  const p = touchPos(e);
  const idx = hitTest(p.x, p.y);
  if (idx === -1) return;
  selectedIdx = idx;
  dragOffX = p.x - pieces[idx].x;
  dragOffY = p.y - pieces[idx].y;
  draw();
}

function onTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (selectedIdx === -1 || !isActive) return;
  const p = touchPos(e);
  pieces[selectedIdx].x = p.x - dragOffX;
  pieces[selectedIdx].y = p.y - dragOffY;
  checkSnap(selectedIdx);
  draw();
}

function onTouchEnd(e: TouchEvent): void {
  e.preventDefault();
  if (selectedIdx !== -1) {
    checkSnap(selectedIdx);
    selectedIdx = -1;
    draw();
  }
}

// ── Snap logic ────────────────────────────────────────────────────
function checkSnap(idx: number): void {
  const piece = pieces[idx];
  const frag = piece.frag;
  const dist = Math.hypot(piece.x - frag.targetX, piece.y - frag.targetY);
  // Also check orientation: the piece should be nearly the same angle
  const angleDiff = Math.abs(normalizeAngle(frag.angle - 0)); // pieces are not rotated by default, so target angle is frag.angle
  // Actually, we draw fragments rotated by frag.angle, so when the piece is at (targetX,targetY) and rotation 0, it aligns perfectly.
  // If the piece is rotated, we'd need to compare; but we don't give rotation ability, so it's always correct orientation.
  // So we only need to check position.
  if (dist < SNAP_DIST) {
    piece.snapped = true;
    piece.x = frag.targetX;
    piece.y = frag.targetY;
    playSfx('runeClick');
  }
}

function normalizeAngle(a: number): number {
  let na = a % (2 * Math.PI);
  if (na < 0) na += 2 * Math.PI;
  return na;
}

// ── Reset / complete ─────────────────────────────────────────────
function resetPieces(): void {
  pieces.forEach(p => {
    p.snapped = false;
    p.x = 40 + Math.random() * (CANVAS_SIZE - 80);
    p.y = 40 + Math.random() * (CANVAS_SIZE - 80);
  });
  draw();
}

function completeStudy(): void {
  if (!isActive) return;
  isActive = false;

  if (!knownRunes.value.includes(targetRuneName)) {
    knownRunes.value = [...knownRunes.value, targetRuneName];
  }
  discoveries.value = {
    ...discoveries.value,
    runes: [...discoveries.value.runes, targetRuneName],
  };
  addMasteryXP(12);
  addLog(`📖 Through study, you learned the rune ${targetRuneName}!`, false, 'player');
  playSfx('learnRune');
  if (!tutorial.value.firstRuneStudied) {
    tutorial.value = { ...tutorial.value, firstRuneStudied: true };
    addLog('📖 Tome updated: Rune Study.', false, 'system');
  }
  autoSave();
  setTimeout(() => closeStudy(true), 1000);
}

function closeStudy(success: boolean): void {
  isActive = false;
  window.dispatchEvent(new CustomEvent('darknest:minigame-state', { detail: { active: false, source: 'rune-study' } }));
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
}