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
import { ritualEngine } from '../systems/ritual-engine.js';
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
  glowIntensity?: number;
}

interface CompletionRune {
  angle: number;
  scale: number;
  opacity: number;
  index: number;
}

const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];
const RUNE_COUNT = 12;

export function initCircleTracing(): void {
  circleCanvas = el("circleCanvas") as HTMLCanvasElement | null;
  if (!circleCanvas) return;
  
  // Optimize canvas rendering
  circleCanvas.style.imageRendering = 'crisp-edges';
  circleCanvas.style.willChange = 'contents';
  
  circleCtx = circleCanvas.getContext("2d", { alpha: true, willReadFrequently: false });
  if (!circleCtx) return;
  
  // Set optimal rendering quality
  circleCtx.imageSmoothingEnabled = true;
  circleCtx.imageSmoothingQuality = 'high';
  
  circleCanvas.addEventListener("mousedown", handleMouseDown);
  circleCanvas.addEventListener("mousemove", handleMouseMove);
  circleCanvas.addEventListener("mouseup", handleMouseUp);
  circleCanvas.addEventListener("mouseleave", handleMouseUp);
  circleCanvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  circleCanvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  circleCanvas.addEventListener("touchend", handleTouchEnd, { passive: false });

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
  
  // Apply glow effect dynamically
  const glowIntensity = hasTraced ? 0.8 : 0.3;
  circleCtx.shadowColor = `rgba(90, 122, 58, ${glowIntensity})`;
  circleCtx.shadowBlur = 12 + glowIntensity * 15;
  circleCtx.shadowOffsetX = 0;
  circleCtx.shadowOffsetY = 0;
  
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
  window.dispatchEvent(new CustomEvent('darknest:minigame-state', { detail: { active: true, source: 'circle-trace' } }));
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
  
  // Background glow effect based on quality
  const glowIntensity = traceQuality * 0.5;
  circleCtx.shadowColor = `rgba(212, 175, 55, ${glowIntensity})`;
  circleCtx.shadowBlur = 20 + glowIntensity * 30;
  
  // Guide circle (faint)
  circleCtx.beginPath();
  circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS, 0, 2 * Math.PI);
  circleCtx.strokeStyle = '#6a4a3a';
  circleCtx.lineWidth = 1.5;
  circleCtx.globalAlpha = GUIDE_OPACITY;
  circleCtx.stroke();
  circleCtx.globalAlpha = 1;
  
  // Progress arc (bright and glowing)
  if (traceProgress > 0) {
    // Outer glow layer
    circleCtx.beginPath();
    circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS + 3, -Math.PI / 2, -Math.PI / 2 + traceProgress * 2 * Math.PI);
    circleCtx.strokeStyle = `rgba(255, 215, 0, ${0.4 * traceQuality})`;
    circleCtx.lineWidth = 8;
    circleCtx.shadowColor = '#ffd700';
    circleCtx.shadowBlur = 20;
    circleCtx.stroke();
    
    // Main progress arc
    circleCtx.beginPath();
    circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS, -Math.PI / 2, -Math.PI / 2 + traceProgress * 2 * Math.PI);
    circleCtx.strokeStyle = '#d4af37';
    circleCtx.lineWidth = 5;
    circleCtx.shadowColor = '#ffd700';
    circleCtx.shadowBlur = 15;
    circleCtx.lineCap = 'round';
    circleCtx.stroke();
  }
  
  // Traced path with gradient trail
  if (trailPoints.length > 1) {
    for (let i = 0; i < trailPoints.length - 1; i++) {
      const p1 = trailPoints[i];
      const p2 = trailPoints[i + 1];
      
      // Hue based on quality (green to gold)
      const hue = 80 + p1.quality * 40;
      const mainColor = `hsl(${hue}, 80%, 60%)`;
      const glowColor = `hsl(${hue}, 90%, 70%)`;
      
      // Trail width scales with quality
      const width = TRACE_WIDTH * (0.4 + p1.quality * 0.8);
      
      // Outer glow
      circleCtx.beginPath();
      circleCtx.moveTo(p1.x, p1.y);
      circleCtx.lineTo(p2.x, p2.y);
      circleCtx.strokeStyle = glowColor;
      circleCtx.lineWidth = width + 4;
      circleCtx.lineCap = 'round';
      circleCtx.lineJoin = 'round';
      circleCtx.globalAlpha = 0.3 * p1.quality;
      circleCtx.shadowColor = glowColor;
      circleCtx.shadowBlur = 16;
      circleCtx.stroke();
      
      // Main trail
      circleCtx.globalAlpha = 1;
      circleCtx.beginPath();
      circleCtx.moveTo(p1.x, p1.y);
      circleCtx.lineTo(p2.x, p2.y);
      circleCtx.strokeStyle = mainColor;
      circleCtx.lineWidth = width;
      circleCtx.lineCap = 'round';
      circleCtx.lineJoin = 'round';
      circleCtx.shadowColor = mainColor;
      circleCtx.shadowBlur = 10;
      circleCtx.stroke();
    }
  }
  
  // Highlight active rune based on progress
  drawRunesWithHighlight(traceProgress);
  
  // Start point indicator
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
  
  // Cursor indicator (dynamic and pulsing)
  if (isDragging && lastCursorPos) {
    const pulseSize = 6 + Math.sin(Date.now() * 0.008) * 2;
    const pulseGlow = 20 + Math.sin(Date.now() * 0.006) * 8;
    
    // Main cursor dot
    circleCtx.shadowColor = '#7acd3a';
    circleCtx.shadowBlur = pulseGlow;
    circleCtx.beginPath();
    circleCtx.arc(lastCursorPos.x, lastCursorPos.y, pulseSize, 0, 2 * Math.PI);
    circleCtx.fillStyle = 'rgba(160, 208, 122, 0.8)';
    circleCtx.fill();
    
    // Outer ring
    circleCtx.beginPath();
    circleCtx.arc(lastCursorPos.x, lastCursorPos.y, pulseSize + 4, 0, 2 * Math.PI);
    circleCtx.strokeStyle = 'rgba(160, 208, 122, 0.4)';
    circleCtx.lineWidth = 2;
    circleCtx.stroke();
  }
  
  // Enhanced particle effects
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life++;
    return p.life < p.maxLife;
  });
  
  particles.forEach(p => {
    const alpha = 1 - p.life / p.maxLife;
    const scaledSize = p.size * alpha * (0.5 + 0.5 * Math.sin(p.life * 0.3));
    
    if (circleCtx) {
      circleCtx.beginPath();
      circleCtx.arc(p.x, p.y, scaledSize, 0, 2 * Math.PI);
      circleCtx.fillStyle = p.color;
      circleCtx.shadowColor = p.color;
      circleCtx.shadowBlur = 10 * alpha;
      circleCtx.globalAlpha = alpha * 0.8;
      circleCtx.fill();
      
      // Particle glow
      circleCtx.globalAlpha = alpha * 0.3;
      circleCtx.beginPath();
      circleCtx.arc(p.x, p.y, scaledSize * 1.5, 0, 2 * Math.PI);
      circleCtx.fillStyle = p.color;
      circleCtx.fill();
    }
  });
  
  circleCtx.globalAlpha = 1;
  drawQualityMeter();
  circleCtx.restore();
}

function drawRunesWithHighlight(progress: number): void {
  if (!circleCtx) return;
  const radius = CIRCLE_RADIUS + 18;
  circleCtx.save();
  circleCtx.font = "bold 16px 'Courier New', monospace";
  circleCtx.textAlign = "center";
  circleCtx.textBaseline = "middle";
  
  const highlightIndex = Math.floor(progress * RUNE_COUNT) % RUNE_COUNT;
  
  for (let i = 0; i < RUNE_COUNT; i++) {
    const angle = (i / RUNE_COUNT) * 2 * Math.PI - Math.PI / 2;
    const x = CENTER_X + Math.cos(angle) * radius;
    const y = CENTER_Y + Math.sin(angle) * radius;
    
    // Highlight active/passed runes
    if (i <= highlightIndex) {
      circleCtx.fillStyle = '#d4af37';
      circleCtx.globalAlpha = 0.9;
      circleCtx.shadowColor = '#ffd700';
      circleCtx.shadowBlur = 10;
      const scale = i === highlightIndex ? 1.3 : 1;
      circleCtx.save();
      circleCtx.translate(x, y);
      circleCtx.scale(scale, scale);
      circleCtx.fillText(RUNES[i % RUNES.length], 0, 0);
      circleCtx.restore();
    } else {
      circleCtx.fillStyle = '#8a6a4a';
      circleCtx.globalAlpha = 0.4;
      circleCtx.shadowBlur = 0;
      circleCtx.fillText(RUNES[i % RUNES.length], x, y);
    }
  }
  
  circleCtx.restore();
}

function drawQualityMeter(): void {
  const barWidth = 200, barX = 120, barY = 435;
  circleCtx!.save();
  
  // Background bar
  circleCtx!.fillStyle = '#1a100a';
  circleCtx!.fillRect(barX, barY, barWidth, 8);
  
  // Border
  circleCtx!.strokeStyle = '#3a2a1a';
  circleCtx!.lineWidth = 1;
  circleCtx!.strokeRect(barX, barY, barWidth, 8);
  
  // Quality gradient
  const gradient = circleCtx!.createLinearGradient(barX, barY, barX + barWidth, barY);
  gradient.addColorStop(0, '#5a7a3a');
  gradient.addColorStop(0.5, '#a0d07a');
  gradient.addColorStop(1, '#d4af37');
  
  circleCtx!.fillStyle = gradient;
  circleCtx!.shadowColor = `rgba(212, 175, 55, ${traceQuality * 0.6})`;
  circleCtx!.shadowBlur = 10 + traceQuality * 10;
  circleCtx!.fillRect(barX, barY, barWidth * traceQuality, 8);
  
  // Pulsing glow effect
  const pulseGlow = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
  circleCtx!.strokeStyle = `rgba(212, 175, 55, ${traceQuality * pulseGlow * 0.5})`;
  circleCtx!.lineWidth = 2;
  circleCtx!.strokeRect(barX, barY, barWidth * traceQuality, 8);
  
  // Quality percentage text
  circleCtx!.fillStyle = '#d4af37';
  circleCtx!.font = '12px Arial';
  circleCtx!.textAlign = 'center';
  circleCtx!.globalAlpha = 0.7;
  circleCtx!.fillText(`${Math.floor(traceQuality * 100)}%`, barX + barWidth / 2, barY + 20);
  
  circleCtx!.restore();
}

function addParticle(x: number, y: number, color: string): void {
  particles.push({
    x, y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
    life: 1, maxLife: 20 + Math.random() * 30, size: 1.5 + Math.random() * 6, color,
    glowIntensity: 0.5 + Math.random() * 0.5
  });
}

function completeTrace(success: boolean): void {
  gameState = 'completed';
  isActive = false;
  isDragging = false;
  stopLoop("circleTraceLoop");
  window.dispatchEvent(new CustomEvent('darknest:minigame-state', { detail: { active: false, source: 'circle-trace' } }));
  const finalQuality = traceQuality;
  if (success && finalQuality >= 0.3) {
    circleQuality.value = finalQuality;
    circlePower.value = Math.min(100, circlePower.value + 25 + Math.floor(finalQuality * 20));
    circleIntegrity.value = Math.min(100, circleIntegrity.value + 25);
    hasTraced = true;
    ritualEngine.recordAction('trace', finalQuality);
    gameBus.emit<CircleTracedPayload>(GameEvents.CIRCLE_TRACED, { quality: finalQuality });
    
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
    
    // Sustained dark magic animation begins
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
  let lastParticleBurst = Date.now();
  const glowIntensity = quality;
  
  // Dark magic color palette
  const darkMagicColors = [
    '#5a1a7a',  // Deep purple
    '#4a0a5a',  // Darker purple
    '#3a3a5a',  // Dark indigo
    '#6a1a4a',  // Dark magenta
    '#2a3a6a',  // Deep blue
    '#5a2a4a',  // Purple-brown
  ];
  
  function animateCompletion(): void {
    if (!circleCtx || !circleCanvas) return;
    
    phase += 0.012; // Continuous phase progression
    if (phase > 100) phase -= 100; // Loop phase
    
    drawIdleCircle();
    
    // Multi-layered dark magic pulse system
    const pulse1 = Math.sin(phase * Math.PI * 3) * 0.2 + 0.8;
    const pulse2 = Math.sin(phase * Math.PI * 2.5 + 0.5) * 0.15 + 0.85;
    const pulse3 = Math.sin(phase * Math.PI * 2 + 1) * 0.2 + 0.8;
    
    // Breathing glow - slower and more subtle for dark magic
    const breathe = 0.4 + 0.3 * Math.sin(phase * Math.PI);
    
    circleCtx.save();
    circleCtx.globalCompositeOperation = 'screen';
    
    // Layer 1: Dark pulsing rings (expanding outward)
    for (let layer = 0; layer < 3; layer++) {
      const layerPhase = phase + layer * 0.2;
      const expandRadius = CIRCLE_RADIUS + 15 + Math.sin(layerPhase * Math.PI * 0.8) * 40;
      const layerOpacity = (0.5 - Math.abs((layerPhase % 1) - 0.5) * 0.3) * glowIntensity * 0.4;
      
      circleCtx.beginPath();
      circleCtx.arc(CENTER_X, CENTER_Y, expandRadius, 0, 2 * Math.PI);
      circleCtx.strokeStyle = `rgba(138, 43, 226, ${layerOpacity})`; // Purple
      circleCtx.lineWidth = 2.5 * glowIntensity;
      circleCtx.shadowColor = '#5a1a7a';
      circleCtx.shadowBlur = 20;
      circleCtx.stroke();
    }
    
    // Layer 2: Core circle with dark magic glow
    circleCtx.globalCompositeOperation = 'source-over';
    
    // Outer dark purple glow
    circleCtx.shadowColor = '#6a1a7a';
    circleCtx.shadowBlur = 30 * glowIntensity * breathe;
    circleCtx.beginPath();
    circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS + 6, 0, 2 * Math.PI);
    circleCtx.strokeStyle = `rgba(106, 26, 122, ${0.2 * glowIntensity * pulse1})`;
    circleCtx.lineWidth = 4 * glowIntensity * pulse1;
    circleCtx.stroke();
    
    // Mid deep indigo glow
    circleCtx.shadowColor = '#4a0a8a';
    circleCtx.shadowBlur = 20 * glowIntensity * breathe;
    circleCtx.beginPath();
    circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS, 0, 2 * Math.PI);
    circleCtx.strokeStyle = `rgba(74, 10, 138, ${0.25 * glowIntensity * pulse2})`;
    circleCtx.lineWidth = 6 * glowIntensity * pulse2;
    circleCtx.stroke();
    
    // Inner dark blue core
    circleCtx.shadowColor = '#2a3a8a';
    circleCtx.shadowBlur = 25 * glowIntensity * breathe;
    circleCtx.beginPath();
    circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS - 6, 0, 2 * Math.PI);
    circleCtx.strokeStyle = `rgba(42, 58, 138, ${0.2 * glowIntensity * pulse3})`;
    circleCtx.lineWidth = 3 * glowIntensity * pulse3;
    circleCtx.stroke();
    
    // Layer 3: Animated runic glow with dark magic
    drawRunesCompletionDarkMagic(phase, quality);
    
    // Continuous particle generation for sustained effect
    const now = Date.now();
    if (now - lastParticleBurst > 80) {
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + phase * 0.5;
        const speed = 0.5 + Math.random() * 1;
        const distance = CIRCLE_RADIUS + Math.random() * 20;
        const x = CENTER_X + Math.cos(angle) * distance;
        const y = CENTER_Y + Math.sin(angle) * distance;
        const vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.3;
        const vy = Math.sin(angle) * speed + (Math.random() - 0.5) * 0.3;
        
        particles.push({
          x, y, vx, vy,
          life: 1, maxLife: 80 + Math.random() * 60,
          size: 0.5 + Math.random() * 1.5, // Much smaller particles
          color: darkMagicColors[Math.floor(Math.random() * darkMagicColors.length)],
          glowIntensity: 0.6 + Math.random() * 0.4
        });
      }
      lastParticleBurst = now;
    }
    
    // Particle effects
    updateAndDrawCompletionParticles(circleCtx);
    
    circleCtx.restore();
    
    // Sustain animation indefinitely
    completionAnimationFrame = requestAnimationFrame(animateCompletion);
  }
  
  completionAnimationFrame = requestAnimationFrame(animateCompletion);
}

function drawRunesCompletionDarkMagic(phase: number, quality: number): void {
  if (!circleCtx) return;
  const radius = CIRCLE_RADIUS + 18;
  circleCtx.save();
  circleCtx.font = "bold 16px 'Courier New', monospace";
  circleCtx.textAlign = "center";
  circleCtx.textBaseline = "middle";
  
  for (let i = 0; i < RUNE_COUNT; i++) {
    const angle = (i / RUNE_COUNT) * 2 * Math.PI - Math.PI / 2;
    const x = CENTER_X + Math.cos(angle) * radius;
    const y = CENTER_Y + Math.sin(angle) * radius;
    
    // Staggered dark magic pulse
    const runePhase = phase + i / RUNE_COUNT;
    const runeGlow = Math.sin(runePhase * Math.PI * 3) * 0.4 + 0.6;
    const runeScale = 1 + runeGlow * 0.3;
    
    circleCtx.save();
    circleCtx.translate(x, y);
    circleCtx.scale(runeScale, runeScale);
    
    // Dark purple rune glow
    circleCtx.fillStyle = `rgba(138, 43, 226, ${0.2 + runeGlow * quality * 0.5})`;
    circleCtx.shadowColor = '#6a1a7a';
    circleCtx.shadowBlur = 10 * runeGlow * quality;
    circleCtx.fillText(RUNES[i % RUNES.length], 0, 0);
    
    circleCtx.restore();
  }
  circleCtx.restore();
}

function updateAndDrawCompletionParticles(ctx: CanvasRenderingContext2D): void {
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life++;
    return p.life < p.maxLife;
  });
  
  particles.forEach(p => {
    const alpha = 1 - Math.pow(p.life / p.maxLife, 2);
    const size = p.size * Math.sin(alpha * Math.PI);
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12 * alpha * (p.glowIntensity || 1);
    ctx.globalAlpha = alpha * 0.9;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawCompletionFinal(quality: number): void {
  if (!circleCtx || !circleCanvas) return;
  
  circleCtx.clearRect(0, 0, circleCanvas.width, circleCanvas.height);
  circleCtx.save();
  
  // Draw idle circle
  drawIdleCircle();
  
  // Sustained final glow
  const sustainedGlow = 0.6 + 0.2 * Math.sin(Date.now() * 0.003);
  
  circleCtx.shadowColor = '#a0d07a';
  circleCtx.shadowBlur = 40 * quality * sustainedGlow;
  circleCtx.beginPath();
  circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS + 10, 0, 2 * Math.PI);
  circleCtx.strokeStyle = `rgba(160, 208, 122, ${0.2 * quality})`;
  circleCtx.lineWidth = 3;
  circleCtx.stroke();
  
  circleCtx.shadowColor = '#d4af37';
  circleCtx.shadowBlur = 30 * quality * sustainedGlow;
  circleCtx.beginPath();
  circleCtx.arc(CENTER_X, CENTER_Y, CIRCLE_RADIUS, 0, 2 * Math.PI);
  circleCtx.strokeStyle = `rgba(212, 175, 55, ${0.25 * quality})`;
  circleCtx.lineWidth = 4;
  circleCtx.stroke();
  
  // Remaining particles
  updateAndDrawCompletionParticles(circleCtx);
  
  circleCtx.restore();
  
  // Keep redrawing for sustained effect
  completionAnimationFrame = requestAnimationFrame(() => drawCompletionFinal(quality));
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
  window.dispatchEvent(new CustomEvent('darknest:minigame-state', { detail: { active: false, source: 'circle-trace' } }));
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