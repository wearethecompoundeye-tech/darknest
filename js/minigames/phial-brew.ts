// js/minigames/phial-brew.ts
// 🧪 CAULDRON BOIL – robust precision minigame with skill-based rewards
// Features: dynamic difficulty scaling, time pressure, precision-tied rewards,
//          combo system, visual feedback, touch support, predictive indicators.

import {
  ingredients,
  crafted,
  updateState,
  addMasteryXP,
  discover,
  autoSave,
} from '../core/state-signals.js';
import { addLog } from '../ui/log-manager.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';

// ── Dispatch minigame state for Whisp avoidance ───────────────
function notifyMinigame(active: boolean, source: string) {
  window.dispatchEvent(new CustomEvent('darknest:minigame-state', {
    detail: { active, source }
  }));
}

export function startPhialBrewing(
  onComplete?: (success: boolean) => void
): void {
  if (ingredients.value.cryptPhlegm < 1 || ingredients.value.bansheeSalts < 1) {
    addLog("Missing Phlegm or Banshee Salts.", true);
    onComplete?.(false);
    return;
  }

  notifyMinigame(true, 'cauldron-brew');

  // ── Build overlay ──────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.className = "modal";
  overlay.style.display = "flex";
  overlay.innerHTML = `
    <div class="modal-content" style="max-width:580px; text-align:center; position:relative;">
      <h3>🧪 CAULDRON BOIL</h3>
      <p>Keep the glowing ring inside the moving boil zone. Higher precision = better rewards!</p>
      <div style="display:flex; justify-content:space-around; margin:10px 0; font-size:0.9rem;">
        <div><span id="timeLeft" style="color:#d4af37; font-weight:bold; font-size:1.2rem;">30s</span></div>
        <div>Combo: <span id="comboCount" style="color:#ffd700; font-weight:bold;">0</span></div>
        <div>Score: <span id="currentScore" style="color:#c8b070; font-weight:bold;">0</span></div>
      </div>
      <div style="position:relative; width:340px; height:340px; margin:20px auto;">
        <canvas id="boilCanvas" width="340" height="340" style="background:#1a0e1a; border-radius:50%; border:2px solid #6a4a3a;"></canvas>
        <!-- Precision needle -->
        <div id="boilNeedle" style="position:absolute; top:50%; left:50%; width:3px; height:70px; background: linear-gradient(0deg, transparent 0%, #f0a85a 80%, #ffd700 100%); transform-origin: bottom center; transform: translate(-50%, -100%) rotate(0deg); pointer-events:none; border-radius:0 0 3px 3px; box-shadow: 0 0 8px rgba(255,215,0,0.6);"></div>
      </div>
      <div class="progress-bar" style="width:100%; height:14px; margin:10px 0; border-radius:10px; background:#2a1a2a;">
        <div id="boilProgress" class="progress-fill" style="width:0%; background: linear-gradient(90deg, #4a7a2a 0%, #d4af37 50%, #8a2a2a 100%); border-radius:10px; box-shadow: 0 0 10px rgba(212,175,55,0.5);"></div>
      </div>
      <p id="boilStatus">Precision: <span style="color:#d4af37;">0%</span> · In Zone: <span id="inZonePercent" style="color:#7acd3a;">0%</span></p>
      <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin:12px 0;">
        <span>Phials Earned:</span>
        <div id="bonusVisual" style="width:28px; height:28px; background:url('/Images/Cauldron.png') center/contain no-repeat; filter: drop-shadow(0 0 6px #ffd700);"></div>
        <span id="bonusCount" style="font-size:1.4rem; color:#ffd700; font-weight:bold;">0</span>
      </div>
      <div style="display:flex; gap:10px; justify-content:center; margin-top:16px;">
        <button id="startBoilBtn" class="craft-btn">🔥 Start Boil</button>
        <button id="cancelBoilBtn" class="craft-btn">Cancel</button>
      </div>
      <p style="font-size:0.7rem; color:#a09080; margin-top:8px;">Press <kbd>Enter</kbd> to start · <kbd>Esc</kbd> to cancel · Stay in the golden zone!</p>
    </div>
  `;
  document.body.appendChild(overlay);
  startLoop("phialBoiling");

  const canvas = overlay.querySelector("#boilCanvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  const progressFill = overlay.querySelector("#boilProgress") as HTMLElement;
  const statusEl = overlay.querySelector("#boilStatus") as HTMLElement;
  const inZonePercentEl = overlay.querySelector("#inZonePercent") as HTMLElement;
  const bonusCountEl = overlay.querySelector("#bonusCount") as HTMLElement;
  const timeLeftEl = overlay.querySelector("#timeLeft") as HTMLElement;
  const comboCountEl = overlay.querySelector("#comboCount") as HTMLElement;
  const scoreEl = overlay.querySelector("#currentScore") as HTMLElement;
  const startBtn = overlay.querySelector("#startBoilBtn") as HTMLButtonElement;
  const cancelBtn = overlay.querySelector("#cancelBoilBtn") as HTMLButtonElement;
  const needle = overlay.querySelector("#boilNeedle") as HTMLElement;

  // ── State ──────────────────────────────────────────────────
  let boiling = false;
  let progress = 0;
  let avgPrecision = 0;
  let phialsEarned = 0;
  let combo = 0;
  let totalScore = 0;
  let timeRemaining = 30;  // seconds
  let zoneAngle = 0;
  let baseZoneSpeed = 0.8;  // radians per second
  let zoneRadius = 85;      // distance from centre
  let minZoneSize = 25;
  let maxZoneSize = 45;
  let currentZoneSize = maxZoneSize;
  let mouseX = 170, mouseY = 170; // relative to canvas
  let lastTime = performance.now();
  let lastComboTime = 0;
  let comboTimeout = 2000; // ms before combo resets
  let animFrame: number | null = null;
  let timeInterval: number | null = null;
  let inZoneFrames = 0;
  let totalFrames = 0;

  const CAULDRON_RADIUS = 140;
  const CENTER_X = 170, CENTER_Y = 170;

  // ── Bubbles (dynamic background) ──────────────────────────
  let bubbles: { x: number; y: number; r: number; speed: number; alpha: number; maxAlpha: number; wobble: number; wobbleSpeed: number }[] = [];
  for (let i = 0; i < 25; i++) {
    bubbles.push({
      x: CENTER_X + (Math.random() - 0.5) * CAULDRON_RADIUS * 1.6,
      y: CENTER_Y + Math.random() * 60 + 50,
      r: 2 + Math.random() * 6,
      speed: 0.3 + Math.random() * 1.2,
      alpha: 0,
      maxAlpha: 0.12 + Math.random() * 0.18,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 2 + Math.random() * 3,
    });
  }

  // ── Draw function ─────────────────────────────────────────
  function drawBoil() {
    ctx.clearRect(0, 0, 340, 340);

    // Cauldron rim
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, CAULDRON_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "#6a4a3a";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Glow effect on rim when boiling
    if (boiling) {
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, CAULDRON_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(240,168,90,${0.2 + 0.1 * Math.sin(Date.now() * 0.005)})`;
      ctx.lineWidth = 12;
      ctx.stroke();
    }

    // Bubbles with wobble
    bubbles.forEach((b, i) => {
      b.y -= b.speed;
      b.wobble += b.wobbleSpeed * 0.016;
      b.x = CENTER_X + (Math.random() - 0.5) * 8 + Math.cos(b.wobble) * 15;
      
      if (b.y < CENTER_Y - CAULDRON_RADIUS + 10) {
        b.y = CENTER_Y + Math.random() * 40 + 20;
        b.x = CENTER_X + (Math.random() - 0.5) * CAULDRON_RADIUS * 1.4;
        b.alpha = b.maxAlpha;
      }
      b.alpha = Math.max(0, b.alpha - 0.002);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240,200,140,${b.alpha})`;
      ctx.strokeStyle = `rgba(255,255,200,${b.alpha * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fill();
    });

    // Zone center
    const zoneX = CENTER_X + Math.cos(zoneAngle) * zoneRadius;
    const zoneY = CENTER_Y + Math.sin(zoneAngle) * zoneRadius;

    // Predictive zone path (faint trail showing where it's going)
    if (boiling) {
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = 'rgba(240,168,90,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, zoneRadius, zoneAngle, zoneAngle + 1.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Main swirling zone (pulsing ring)
    const pulse = 1 + 0.08 * Math.sin(Date.now() * 0.025);
    const displayZoneSize = currentZoneSize * pulse;
    ctx.save();
    ctx.translate(zoneX, zoneY);
    ctx.rotate(zoneAngle * 2);
    
    // Inner glow
    ctx.beginPath();
    ctx.arc(0, 0, displayZoneSize, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(0, 0, displayZoneSize * 0.3, 0, 0, displayZoneSize);
    gradient.addColorStop(0, 'rgba(255,215,0,0.5)');
    gradient.addColorStop(0.6, 'rgba(240,168,90,0.2)');
    gradient.addColorStop(1, 'rgba(240,168,90,0.05)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, displayZoneSize, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.restore();

    // Progress ring (inner)
    if (progress > 0) {
      const progressColor = progress > 0.8 ? '#c05050' : (progress > 0.5 ? '#d4af37' : '#4a7a2a');
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, CAULDRON_RADIUS - 8, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.strokeStyle = progressColor;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Precision needle direction and length based on mouse relative to zone centre
    const dx = mouseX - zoneX;
    const dy = mouseY - zoneY;
    const distance = Math.hypot(dx, dy);
    const needleAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    const inZone = distance <= currentZoneSize;

    if (!inZone && distance > 5) {
      const needleLen = Math.min(distance * 0.8, 80);
      needle.style.height = `${needleLen}px`;
      needle.style.transform = `translate(-50%, -100%) rotate(${needleAngle}deg)`;
      needle.style.opacity = '0.8';
    } else {
      needle.style.height = '30px';
      needle.style.transform = 'translate(-50%, -100%) rotate(0deg)';
      needle.style.opacity = '0.5';
    }

    // Player position indicator (small dot at mouse)
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 5, 0, Math.PI * 2);
    const playerColor = inZone ? 'rgba(122,205,58,0.7)' : 'rgba(255,100,100,0.5)';
    ctx.fillStyle = playerColor;
    ctx.fill();
    ctx.strokeStyle = inZone ? '#7acd3a' : '#ff6464';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function updateDifficulty(progressRatio: number) {
    // Scale difficulty based on progress
    baseZoneSpeed = 0.8 + progressRatio * 1.2;
    currentZoneSize = maxZoneSize - progressRatio * (maxZoneSize - minZoneSize);
  }

  function moveZone(delta: number) {
    zoneAngle += baseZoneSpeed * delta;
    if (zoneAngle > Math.PI * 2) zoneAngle -= Math.PI * 2;
  }

  function calculateRewards(): { phials: number; xp: number } {
    const precisionBonus = Math.floor(avgPrecision * 1.5);
    const basePhials = 1;
    const bonusPhials = Math.max(0, precisionBonus);
    const totalPhials = basePhials + bonusPhials;
    const baseXP = 5;
    const xpGain = baseXP + (bonusPhials * 3) + (combo * 2);
    return { phials: totalPhials, xp: xpGain };
  }

  // ── Animation loop ────────────────────────────────────────
  function animate() {
    if (!boiling) return;
    const now = performance.now();
    const delta = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    totalFrames++;

    moveZone(delta);

    const zoneX = CENTER_X + Math.cos(zoneAngle) * zoneRadius;
    const zoneY = CENTER_Y + Math.sin(zoneAngle) * zoneRadius;
    const dist = Math.hypot(mouseX - zoneX, mouseY - zoneY);
    const inZone = dist <= currentZoneSize;

    if (inZone) {
      inZoneFrames++;
      const closeness = 1 - dist / currentZoneSize;
      progress = Math.min(1, progress + delta * 0.45);
      avgPrecision = (avgPrecision * (totalFrames - 1) + closeness) / totalFrames;
      
      // Combo and bonus phials on perfect closeness
      if (closeness > 0.85 && now - lastComboTime > 300) {
        combo++;
        phialsEarned = Math.floor(1 + (combo / 10));
        lastComboTime = now;
        bonusCountEl.textContent = phialsEarned.toString();
        totalScore += 10 * Math.floor(closeness * 100);
        scoreEl.textContent = totalScore.toString();
        
        const bv = document.getElementById('bonusVisual');
        if (bv) {
          bv.style.transform = 'scale(1.4)';
          bv.style.filter = 'drop-shadow(0 0 12px #ffd700) brightness(1.3)';
          setTimeout(() => {
            bv.style.transform = 'scale(1)';
            bv.style.filter = 'drop-shadow(0 0 6px #ffd700)';
          }, 150);
        }
        playSfx('phialSuccess');
      }
    } else {
      progress = Math.max(0, progress - delta * 0.15);
      if (combo > 0 && now - lastComboTime > comboTimeout) {
        combo = 0;
        comboCountEl.textContent = '0';
      }
    }

    updateDifficulty(progress);
    const inZonePercent = totalFrames > 0 ? Math.floor((inZoneFrames / totalFrames) * 100) : 0;
    
    progressFill.style.width = `${Math.floor(progress * 100)}%`;
    statusEl.innerHTML = `Precision: <span style="color:#d4af37;">${Math.floor(avgPrecision * 100)}%</span> · In Zone: <span id="inZonePercent" style="color:#7acd3a;">${inZonePercent}%</span>`;
    comboCountEl.textContent = combo.toString();
    drawBoil();

    if (progress >= 1) {
      finishBoiling(true);
      return;
    }
    
    if (timeRemaining <= 0) {
      finishBoiling(false);
      return;
    }

    animFrame = requestAnimationFrame(animate);
  }

  // ── Mouse tracking ────────────────────────────────────────
  function onMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
    mouseX = Math.max(0, Math.min(340, mouseX));
    mouseY = Math.max(0, Math.min(340, mouseY));
  }

  // ── Touch support ─────────────────────────────────────────
  function onTouchMove(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (touch.clientX - rect.left) * scaleX;
    mouseY = (touch.clientY - rect.top) * scaleY;
    mouseX = Math.max(0, Math.min(340, mouseX));
    mouseY = Math.max(0, Math.min(340, mouseY));
  }

  // ── Keyboard shortcuts ────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !boiling) {
      startBoil();
    } else if (e.key === 'Escape') {
      cancelBoil();
    }
  }

  function startBoil() {
    if (boiling) return;
    boiling = true;
    startBtn.disabled = true;
    cancelBtn.disabled = true;
    lastTime = performance.now();
    progress = 0;
    avgPrecision = 0;
    phialsEarned = 1;
    combo = 0;
    totalScore = 0;
    timeRemaining = 30;
    inZoneFrames = 0;
    totalFrames = 0;
    bonusCountEl.textContent = "1";
    comboCountEl.textContent = "0";
    scoreEl.textContent = "0";
    drawBoil();
    animate();
    
    // Time countdown
    timeInterval = window.setInterval(() => {
      timeRemaining--;
      const mins = Math.floor(timeRemaining / 60);
      const secs = timeRemaining % 60;
      const timeStr = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
      timeLeftEl.textContent = timeStr;
      
      if (timeRemaining <= 0) {
        clearInterval(timeInterval!);
        finishBoiling(false);
      }
    }, 1000);
  }

  function finishBoiling(success: boolean) {
    boiling = false;
    stopLoop("phialBoiling");
    if (animFrame) cancelAnimationFrame(animFrame);
    if (timeInterval) clearInterval(timeInterval);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("keydown", onKeyDown);
    overlay.remove();
    notifyMinigame(false, 'cauldron-brew');

    if (success) {
      const rewards = calculateRewards();
      const totalPhials = rewards.phials;
      
      updateState(() => {
        ingredients.value = {
          ...ingredients.value,
          cryptPhlegm: ingredients.value.cryptPhlegm - 1,
          bansheeSalts: ingredients.value.bansheeSalts - 1,
        };
        crafted.value = {
          ...crafted.value,
          phialOfSubjugation: crafted.value.phialOfSubjugation + totalPhials,
        };
        discover('ingredients', 'bansheeSalts');
      });
      addMasteryXP(rewards.xp);
      playSfx('phialSuccess');
      const perfMsg = avgPrecision > 0.85 ? ' (Exceptional!)' : avgPrecision > 0.7 ? ' (Excellent!)' : '';
      addLog(`Brew complete!${perfMsg} +${totalPhials} Phial${totalPhials > 1 ? 's' : ''} · Score: ${totalScore}`, false, 'player');
      autoSave();
      onComplete?.(true);
    } else {
      const reason = timeRemaining <= 0 ? 'Time expired!' : 'Boil failed!';
      updateState(() => {
        if (Math.random() < 0.6) {
          ingredients.value = { ...ingredients.value, cryptPhlegm: ingredients.value.cryptPhlegm - 1 };
        } else {
          ingredients.value = { ...ingredients.value, bansheeSalts: ingredients.value.bansheeSalts - 1 };
        }
      });
      addLog(`${reason} One ingredient lost.`, true);
      playSfx('phialFail');
      onComplete?.(false);
    }
  }

  function cancelBoil() {
    stopLoop("phialBoiling");
    if (animFrame) cancelAnimationFrame(animFrame);
    if (timeInterval) clearInterval(timeInterval);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("keydown", onKeyDown);
    overlay.remove();
    notifyMinigame(false, 'cauldron-brew');
    addLog("Brewing cancelled.");
    onComplete?.(false);
  }

  // ── Event listeners ───────────────────────────────────────
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("keydown", onKeyDown);
  startBtn.addEventListener("click", startBoil);
  cancelBtn.addEventListener("click", cancelBoil);
}