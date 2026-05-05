// js/minigames/circle-trace.ts
// Spark-drag circle tracing minigame - Verified functionality

import {
  circleQuality,
  circleIntegrity,
  circlePower,
  runeSlots,
  tutorial,
  updateState
} from '../core/state-signals.js';
import { addLog } from '../ui/log-manager.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents, type CircleTracedPayload } from '../core/events.js';
import { narrateEvent } from '../ai/ai-engine.js';
import { el } from '../core/dom-helper.js';
import { updateRuneSlots } from '../ui/ui-renderer.js';
import { getGuidanceHitZoneMultiplier } from '../systems/familiar-manager.js';

let circleCanvas: HTMLCanvasElement | null = null;
let circleCtx: CanvasRenderingContext2D | null = null;
let isActive = false;
let hasTraced = false;

let gameState: 'idle' | 'tracing' | 'completed' = 'idle';
let traceProgress = 0;
let traceQuality = 0;
let isDragging = false;
let lastAngle: number | null = null;
let lastCursorPos: { x: number; y: number } | null = null;

const CENTER_X = 220;  // integer – no sub‑pixel rendering (MDN best practice)
const CENTER_Y = 220;
const CIRCLE_RADIUS = 150;
const GUIDE_OPACITY = 0.3;
const TRACE_WIDTH = 6;

let angleHistory: number[] = [];
const SMOOTHNESS_WINDOW = 5;

let particles: Particle[] = [];
let trailPoints: { x: number; y: number; quality: number }[] = [];
let completionAnimationFrame: number | null = null;

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string;
}

const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];
const RUNE_COUNT = 12;

export function initCircleTracing(): void {
  circleCanvas = el("circleCanvas") as HTMLCanvasElement | null;
  if (!circleCanvas) return;
  circleCtx = circleCanvas.getContext("2d");
  if (!circleCtx) return;

  circleCanvas.addEventListener("mousedown", handleMouseDown);
  circleCanvas.addEventListener("mousemove", handleMouseMove);
  circleCanvas.addEventListener("mouseup", handleMouseUp);
  circleCanvas.addEventListener("mouseleave", handleMouseUp);
  circleCanvas.addEventListener("touchstart", handleTouchStart);
  circleCanvas.addEventListener("touchmove", handleTouchMove);
  circleCanvas.addEventListener("touchend", handleTouchEnd);

  const traceBtn = el("traceCircleBtn");
  if (traceBtn) {
    traceBtn.onclick = () => {
      if (hasTraced) {
        clearTrace();
      } else {
        startTracing();
      }
    };
  }

  drawIdleCircle();
}

function drawIdleCircle(): void {
  if (!circleCtx || !circleCanvas) return;
  circleCtx.clearRect(0, 0, circleCanvas.width, circleCanvas.height);
  circleCtx.save();
  circleCtx.shadowColor = '#5a7a3a';
  circleCtx.shadowBlur = 8;
  circleCtx.beginPath();
  circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS, 0, 2 * Math.PI);
  circleCtx.strokeStyle = '#6a4a3a';
  circleCtx.lineWidth = 1.5;
  circleCtx.globalAlpha = GUIDE_OPACITY;
  circleCtx.stroke();
  circleCtx.globalAlpha = 1;
  drawRunes();
  const startAngle = -Math.PI / 2;
  const startX = Math.floor(CENTER_X + Math.cos(startAngle) * CIRCLE_RADIUS);
  const startY = Math.floor(CENTER_Y + Math.sin(startAngle) * CIRCLE_RADIUS);
  circleCtx.shadowColor = '#d4af37';
  circleCtx.shadowBlur = 20;
  circleCtx.beginPath();
  circleCtx.arc(startX, startY, 8, 0, 2 * Math.PI);
  const gradient = circleCtx.createRadialGradient(startX-3, startY-3, 0, startX, startY, 10);
  gradient.addColorStop(0, '#ffd700');
  gradient.addColorStop(1, '#a0d07a');
  circleCtx.fillStyle = gradient;
  circleCtx.fill();
  circleCtx.shadowBlur = 15;
  circleCtx.beginPath();
  circleCtx.arc(startX, startY, 4, 0, 2 * Math.PI);
  circleCtx.fillStyle = '#ffffff';
  circleCtx.fill();
  circleCtx.restore();
}

function drawRunes(): void {
  if (!circleCtx) return;
  const radius = CIRCLE_RADIUS + 18;
  circleCtx.save();
  circleCtx.font = "bold 16px 'Courier New', monospace";
  circleCtx.fillStyle = '#8a6a4a';
  circleCtx.textAlign = "center";
  circleCtx.textBaseline = "middle";
  circleCtx.globalAlpha = 0.6;
  for (let i = 0; i < RUNE_COUNT; i++) {
    const angle = (i / RUNE_COUNT) * 2 * Math.PI - Math.PI / 2;
    const x = CENTER_X + Math.cos(angle) * radius;
    const y = CENTER_Y + Math.sin(angle) * radius;
    circleCtx.fillText(RUNES[i % RUNES.length], x, y);
  }
  circleCtx.restore();
}

function startTracing(): void {
  if (isActive) return;
  isActive = true;
  hasTraced = false;
  gameState = 'tracing';
  traceProgress = 0;
  traceQuality = 0;
  isDragging = false;
  lastAngle = null;
  lastCursorPos = null;
  angleHistory = [];
  particles = [];
  trailPoints = [];
  if (completionAnimationFrame) {
    cancelAnimationFrame(completionAnimationFrame);
    completionAnimationFrame = null;
  }
  drawIdleCircle();
  startLoop("circleTraceLoop");
  playSfx('uiClick');
}

function handleMouseDown(e: MouseEvent): void {
  if (!isActive || gameState !== 'tracing') return;
  const point = getCanvasPoint(e);
  const startAngle = -Math.PI / 2;
  const startX = Math.floor(CENTER_X + Math.cos(startAngle) * CIRCLE_RADIUS);
  const startY = Math.floor(CENTER_Y + Math.sin(startAngle) * CIRCLE_RADIUS);
  const distToStart = Math.hypot(point.x - startX, point.y - startY);
  if (distToStart > 30) return;
  isDragging = true;
  lastCursorPos = point;
  lastAngle = startAngle;
  traceProgress = 0;
  traceQuality = 0;
  angleHistory = [];
  trailPoints = [{ x: point.x, y: point.y, quality: 1 }];
  playSfx('circleTraceDot');
}

function handleMouseMove(e: MouseEvent): void {
  if (!isActive || gameState !== 'tracing' || !isDragging) return;
  const point = getCanvasPoint(e);
  processTracePoint(point);
}

function handleMouseUp(): void {
  if (!isActive || gameState !== 'tracing') return;
  isDragging = false;
  lastCursorPos = null;
  lastAngle = null;
  if (traceProgress >= 0.98 && traceQuality >= 0.3) {
    completeTrace(true);
  } else if (traceProgress > 0) {
    addLog("Trace incomplete. Follow the spark around the full circle.", true);
    playSfx('runeEtchFail');
    clearTrace();
  }
}

function handleTouchStart(e: TouchEvent): void {
  if (!isActive || gameState !== 'tracing') return;
  e.preventDefault();
  const point = getCanvasTouchPoint(e);
  const startAngle = -Math.PI / 2;
  const startX = Math.floor(CENTER_X + Math.cos(startAngle) * CIRCLE_RADIUS);
  const startY = Math.floor(CENTER_Y + Math.sin(startAngle) * CIRCLE_RADIUS);
  const distToStart = Math.hypot(point.x - startX, point.y - startY);
  if (distToStart > 30) return;
  isDragging = true;
  lastCursorPos = point;
  lastAngle = startAngle;
  traceProgress = 0;
  traceQuality = 0;
  angleHistory = [];
  trailPoints = [{ x: point.x, y: point.y, quality: 1 }];
  playSfx('circleTraceDot');
}

function handleTouchMove(e: TouchEvent): void {
  if (!isActive || gameState !== 'tracing' || !isDragging) return;
  e.preventDefault();
  const point = getCanvasTouchPoint(e);
  processTracePoint(point);
}

function handleTouchEnd(e: TouchEvent): void {
  if (!isActive || gameState !== 'tracing') return;
  e.preventDefault();
  isDragging = false;
  lastCursorPos = null;
  lastAngle = null;
  if (traceProgress >= 0.98 && traceQuality >= 0.3) {
    completeTrace(true);
  } else if (traceProgress > 0) {
    addLog("Trace incomplete. Follow the spark around the full circle.", true);
    playSfx('runeEtchFail');
    clearTrace();
  }
}

function getCanvasPoint(e: MouseEvent): { x: number; y: number } {
  const rect = circleCanvas!.getBoundingClientRect();
  const scaleX = circleCanvas!.width / rect.width;
  const scaleY = circleCanvas!.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

function getCanvasTouchPoint(e: TouchEvent): { x: number; y: number } {
  const rect = circleCanvas!.getBoundingClientRect();
  const scaleX = circleCanvas!.width / rect.width;
  const scaleY = circleCanvas!.height / rect.height;
  const touch = e.touches[0];
  return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
}

function processTracePoint(point: { x: number; y: number }): void {
  if (!lastAngle && lastAngle !== 0) return;
  const dx = point.x - CENTER_X;
  const dy = point.y - CENTER_Y;
  let currentAngle = Math.atan2(dy, dx);
  let normalizedAngle = currentAngle;
  if (normalizedAngle < -Math.PI / 2) normalizedAngle += 2 * Math.PI;
  const progress = (normalizedAngle + Math.PI / 2) / (2 * Math.PI);
  if (progress < traceProgress - 0.05) {
    traceQuality = Math.max(0, traceQuality - 0.01);
    addParticle(point.x, point.y, '#8a4a3a');
  } else {
    traceProgress = Math.min(1, progress);
  }
  const idealX = CENTER_X + Math.cos(currentAngle) * CIRCLE_RADIUS;
  const idealY = CENTER_Y + Math.sin(currentAngle) * CIRCLE_RADIUS;
  const distanceFromCircle = Math.hypot(point.x - idealX, point.y - idealY);
  const guidanceBonus = getGuidanceHitZoneMultiplier();
  const maxDist = 40 * guidanceBonus;
  const closeness = Math.max(0, 1 - distanceFromCircle / maxDist);
  let smoothness = 1;
  if (lastAngle !== null) {
    let angleDelta = Math.abs(currentAngle - lastAngle);
    if (angleDelta > Math.PI) angleDelta = 2 * Math.PI - angleDelta;
    angleHistory.push(angleDelta);
    if (angleHistory.length > SMOOTHNESS_WINDOW) angleHistory.shift();
    const avgDelta = angleHistory.reduce((a, b) => a + b, 0) / angleHistory.length;
    const maxSmoothDelta = 0.15;
    smoothness = Math.max(0, 1 - avgDelta / maxSmoothDelta);
  }
  const qualityGain = closeness * smoothness * 0.015;
  traceQuality = Math.min(1, traceQuality + qualityGain);
  trailPoints.push({ x: point.x, y: point.y, quality: traceQuality });
  if (trailPoints.length > 200) trailPoints.shift();
  const particleColor = closeness > 0.7 ? '#d4af37' : (closeness > 0.4 ? '#a0d07a' : '#8a6a3a');
  addParticle(point.x, point.y, particleColor);
  if (Math.random() < 0.2) playSfx('circleTraceDot');
  lastAngle = currentAngle;
  lastCursorPos = point;
  drawTracingFrame();
}

function drawTracingFrame(): void {
  if (!circleCtx || !circleCanvas) return;
  circleCtx.clearRect(0, 0, circleCanvas.width, circleCanvas.height);
  circleCtx.save();
  circleCtx.shadowColor = '#5a7a3a';
  circleCtx.shadowBlur = 8;
  circleCtx.beginPath();
  circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS, 0, 2 * Math.PI);
  circleCtx.strokeStyle = '#6a4a3a';
  circleCtx.lineWidth = 1.5;
  circleCtx.globalAlpha = GUIDE_OPACITY;
  circleCtx.stroke();
  circleCtx.globalAlpha = 1;
  if (traceProgress > 0) {
    circleCtx.beginPath();
    circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS, -Math.PI / 2, -Math.PI / 2 + traceProgress * 2 * Math.PI);
    circleCtx.strokeStyle = '#d4af37';
    circleCtx.lineWidth = 4;
    circleCtx.shadowColor = '#ffd700';
    circleCtx.shadowBlur = 15;
    circleCtx.stroke();
  }
  if (trailPoints.length > 1) {
    for (let i = 0; i < trailPoints.length - 1; i++) {
      const p1 = trailPoints[i];
      const p2 = trailPoints[i + 1];
      const hue = 80 + p1.quality * 40;
      const color = `hsl(${hue}, 80%, 60%)`;
      circleCtx.beginPath();
      circleCtx.moveTo(p1.x, p1.y);
      circleCtx.lineTo(p2.x, p2.y);
      circleCtx.strokeStyle = color;
      circleCtx.lineWidth = TRACE_WIDTH * (0.5 + p1.quality * 0.5);
      circleCtx.lineCap = 'round';
      circleCtx.shadowColor = color;
      circleCtx.shadowBlur = 12;
      circleCtx.stroke();
    }
  }
  drawRunes();
  const startAngle = -Math.PI / 2;
  const startX = Math.floor(CENTER_X + Math.cos(startAngle) * CIRCLE_RADIUS);
  const startY = Math.floor(CENTER_Y + Math.sin(startAngle) * CIRCLE_RADIUS);
  circleCtx.shadowColor = '#d4af37';
  circleCtx.shadowBlur = 20;
  circleCtx.beginPath();
  circleCtx.arc(startX, startY, 8, 0, 2 * Math.PI);
  const gradient = circleCtx.createRadialGradient(startX-3, startY-3, 0, startX, startY, 10);
  gradient.addColorStop(0, '#ffd700');
  gradient.addColorStop(1, '#a0d07a');
  circleCtx.fillStyle = gradient;
  circleCtx.fill();
  circleCtx.beginPath();
  circleCtx.arc(startX, startY, 4, 0, 2 * Math.PI);
  circleCtx.fillStyle = '#ffffff';
  circleCtx.fill();
  if (isDragging && lastCursorPos) {
    circleCtx.shadowColor = '#a0d07a';
    circleCtx.shadowBlur = 15;
    circleCtx.beginPath();
    circleCtx.arc(lastCursorPos.x, lastCursorPos.y, 6, 0, 2 * Math.PI);
    circleCtx.fillStyle = 'rgba(160, 208, 122, 0.5)';
    circleCtx.fill();
  }
  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.98; p.vy *= 0.98;
    p.life++;
    return p.life < p.maxLife;
  });
  particles.forEach(p => {
    const alpha = 1 - p.life / p.maxLife;
    circleCtx.beginPath();
    circleCtx.arc(p.x, p.y, p.size * alpha, 0, 2 * Math.PI);
    circleCtx.fillStyle = p.color;
    circleCtx.shadowColor = p.color;
    circleCtx.shadowBlur = 8;
    circleCtx.globalAlpha = alpha;
    circleCtx.fill();
  });
  circleCtx.globalAlpha = 1;
  drawQualityMeter();
  circleCtx.restore();
}

function drawQualityMeter(): void {
  const barWidth = 200, barX = 120, barY = 435;
  circleCtx!.save();
  circleCtx!.fillStyle = '#1a100a';
  circleCtx!.fillRect(barX, barY, barWidth, 6);
  const gradient = circleCtx!.createLinearGradient(barX, barY, barX + barWidth, barY);
  gradient.addColorStop(0, '#5a7a3a');
  gradient.addColorStop(0.5, '#a0d07a');
  gradient.addColorStop(1, '#d4af37');
  circleCtx!.fillStyle = gradient;
  circleCtx!.fillRect(barX, barY, barWidth * traceQuality, 6);
  circleCtx!.restore();
}

function addParticle(x: number, y: number, color: string): void {
  particles.push({
    x, y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
    life: 1, maxLife: 15 + Math.random() * 20, size: 2 + Math.random() * 5, color
  });
}

function completeTrace(success: boolean): void {
  gameState = 'completed';
  isActive = false;
  isDragging = false;
  stopLoop("circleTraceLoop");
  const finalQuality = traceQuality;
  if (success && finalQuality >= 0.3) {
    circleQuality.value = finalQuality;
    circlePower.value = Math.min(100, circlePower.value + 25 + Math.floor(finalQuality * 20));
    circleIntegrity.value = Math.min(100, circleIntegrity.value + 25);
    hasTraced = true;
      gameBus.emit<CircleTracedPayload>(GameEvents.CIRCLE_TRACED, { quality: finalQuality });
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      addParticle(CENTER_X + Math.cos(angle) * CIRCLE_RADIUS, CENTER_Y + Math.sin(angle) * CIRCLE_RADIUS, i % 3 === 0 ? '#d4af37' : '#a0d07a');
    }
    addLog(`✨ Circle traced with ${Math.floor(finalQuality * 100)}% quality! Power +${25 + Math.floor(finalQuality * 20)}`, false, 'player');
    narrateEvent(`The survivor traces a ritual circle in emerald light. The Seed resonates.`)
      .then(n => { if (n) addLog(`🌿 ${n}`, false, 'orbex'); })
      .catch(() => { });
    const ritualCircle = el("ritualCircle");
    if (ritualCircle) ritualCircle.classList.add("traced");
    startLoop("runeTetherAmbient");
    playSfx('circleTraceComplete');
    if (!tutorial.value.firstTrace) {
      tutorial.value = { ...tutorial.value, firstTrace: true };
      addLog('📖 Tome updated: Circle Tracing.', false, 'system');
    }
    startCompletionAnimation(finalQuality);
  } else {
    addLog(`Trace impure. Quality: ${Math.floor(finalQuality * 100)}%. Focus your will.`, true);
    playSfx('runeEtchFail');
    clearTrace();
  }
  const statusEl = el("grindStatus");
  if (statusEl) statusEl.textContent = success ? "Ritual Complete!" : "Trace Broken";
  const progressFill = el("grindProgress");
  if (progressFill) progressFill.style.width = "0%";
}

function startCompletionAnimation(quality: number): void {
  let phase = 0;
  const glowIntensity = quality;
  function animateCompletion(): void {
    if (!circleCtx || !circleCanvas) return;
    drawIdleCircle();
    phase += 0.02;
    const pulse1 = Math.sin(phase) * 0.3 + 0.7;
    const pulse2 = Math.sin(phase * 1.3) * 0.2 + 0.8;
    circleCtx.save();
    circleCtx.shadowColor = '#a0d07a';
    circleCtx.shadowBlur = 25 * glowIntensity * pulse1;
    circleCtx.beginPath();
    circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS, 0, 2 * Math.PI);
    circleCtx.strokeStyle = '#d4af37';
    circleCtx.lineWidth = 5 * glowIntensity * pulse1;
    circleCtx.stroke();
    circleCtx.beginPath();
    circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS - 12, 0, 2 * Math.PI);
    circleCtx.strokeStyle = '#a0d07a';
    circleCtx.lineWidth = 3 * glowIntensity * pulse2;
    circleCtx.shadowBlur = 35 * glowIntensity;
    circleCtx.stroke();
    const waveCount = 3;
    for (let w = 0; w < waveCount; w++) {
      const wavePhase = phase * 1.5 + w * 2.0;
      const expandRadius = CIRCLE_RADIUS + 20 + 60 * (Math.sin(wavePhase) * 0.5 + 0.5);
      const waveOpacity = 0.3 * glowIntensity * (1 - (expandRadius - CIRCLE_RADIUS) / 80);
      circleCtx.beginPath();
      circleCtx.arc(CENTER_X, CENTER_Y, expandRadius, 0, 2 * Math.PI);
      circleCtx.strokeStyle = '#7ea04b';
      circleCtx.lineWidth = 2 * glowIntensity;
      circleCtx.shadowBlur = 40 * glowIntensity;
      circleCtx.globalAlpha = waveOpacity;
      circleCtx.stroke();
    }
    circleCtx.globalAlpha = 1;
    circleCtx.restore();
    completionAnimationFrame = requestAnimationFrame(animateCompletion);
  }
  completionAnimationFrame = requestAnimationFrame(animateCompletion);
}

function clearTrace(): void {
  gameState = 'idle';
  isActive = false;
  isDragging = false;
  traceProgress = 0;
  traceQuality = 0;
  trailPoints = [];
  particles = [];
  angleHistory = [];
  if (completionAnimationFrame) {
    cancelAnimationFrame(completionAnimationFrame);
    completionAnimationFrame = null;
  }
  stopLoop("runeTetherAmbient");
  drawIdleCircle();
  const statusEl = el("grindStatus");
  if (statusEl) statusEl.textContent = "Click 'Trace Circle' to begin";
}

export function resetCircleAfterSummon(): void {
  runeSlots.value = ["", "", ""];
  circleIntegrity.value = Math.max(0, circleIntegrity.value - 15);
  circlePower.value = Math.max(0, circlePower.value - 15);
  hasTraced = false;
  circleQuality.value = 0;
  stopLoop("circleTraceLoop");
  stopLoop("runeTetherAmbient");
  if (completionAnimationFrame) {
    cancelAnimationFrame(completionAnimationFrame);
    completionAnimationFrame = null;
  }
  clearTrace();
  drawIdleCircle();
  const ritualCircle = el("ritualCircle");
  if (ritualCircle) ritualCircle.classList.remove("traced");
  const halo = el("ritualHalo");
  if (halo) halo.style.display = 'none';
  updateRuneSlots();
}