// js/ui/gaze-ui.ts – Enhanced Gaze overlay with stress visuals, ward patterns, and combat actions

import { el } from '../core/dom-helper.js';
import {
  will, maxWill, health, dailyConsumableSlots, crafted, ingredients,
  circleMastery,
} from '../core/state-signals.js';
import {
  gazeWardCount, gazeWardImageIds, gazeWardPattern,
  useConsumable, attemptWardCast, forceStartGazeEvent, confrontHollow,
} from '../systems/gaze-event.js';

let gazeOverlay: HTMLDivElement | null = null;
let wardElements: HTMLDivElement[] = [];

export function showGazeUI(phase: 'warning' | 'active'): void {
  if (gazeOverlay) gazeOverlay.remove();
  gazeOverlay = document.createElement('div');
  gazeOverlay.id = 'gazeOverlay';
  gazeOverlay.style.cssText = `
    position:fixed; inset:0; z-index:5000; display:flex; flex-direction:column;
    align-items:center; justify-content:center; background: radial-gradient(circle at 50% 50%, rgba(20,0,20,0.9) 0%, #000 100%);
    pointer-events:none;
  `;

  if (phase === 'warning') {
    gazeOverlay.innerHTML = `
      <div style="position:absolute; inset:0; background:radial-gradient(circle, rgba(80,0,80,0.3) 0%, rgba(0,0,0,0.8) 100%); animation:pulseWarning 2s infinite; pointer-events:none;"></div>
      <div style="text-align:center; color:#d4af37; font-size:3rem; text-shadow:0 0 30px #8a2be2;">KALGOTH'S GAZE APPROACHES</div>
      <div style="color:#a0d07a; font-size:1.5rem; margin-top:20px;">Return to the circle!</div>
      <div style="margin-top:40px; display:flex; gap:20px; pointer-events:auto;">
        <button id="gazeStartNowBtn" class="craft-btn">⚡ Begin Now</button>
        <button id="gazeDismissWarningBtn" class="craft-btn" style="background:#5a2a2a;">✖ Close</button>
      </div>
    `;
    const startBtn = el('gazeStartNowBtn');
    const dismissBtn = el('gazeDismissWarningBtn');
    if (startBtn) startBtn.addEventListener('click', forceStartGazeEvent);
    if (dismissBtn) dismissBtn.addEventListener('click', () => {
      gazeOverlay?.remove();
      gazeOverlay = null;
      const gc = el('gameContainer');
      if (gc) gc.style.pointerEvents = 'auto';
    });
  } else {
    gazeOverlay.style.pointerEvents = 'auto';
    gazeOverlay.innerHTML = buildActiveUI();
    bindActiveEvents();
  }

  document.body.appendChild(gazeOverlay);
}

function buildActiveUI(): string {
  const avatarSrc = '/Images/Player Icon.png';
  return `
    <div id="gazeBackground" style="position:absolute; inset:0; background:radial-gradient(circle at 50% 50%, rgba(139,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%); pointer-events:none; transition:background 1s ease;"></div>
    
    <!-- CENTER: Player Avatar with rotating wards -->
    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:300px; height:300px;">
      <div id="wardContainer" style="position:absolute; inset:0; pointer-events:none; transition:filter 0.5s ease;"></div>
      <img id="playerAvatar" src="${avatarSrc}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; border:3px solid #d4af37; box-shadow:0 0 40px rgba(200,170,120,0.6); transition:filter 0.5s ease;">
    </div>

    <!-- Vitals bars (top) -->
    <div style="position:absolute; top:20px; left:20px; right:20px; display:flex; gap:20px;">
      <div style="flex:1;">
        <span>❤️ Health</span>
        <div class="progress-bar"><div id="gazeHealthBar" class="progress-fill" style="width:100%; background:#7ea04b; transition:background 0.3s;"></div></div>
        <span id="gazeHealthText">100/100</span>
      </div>
      <div style="flex:1;">
        <span>🌀 Will</span>
        <div class="progress-bar"><div id="gazeWillBar" class="progress-fill" style="width:100%; background:#7ea04b; transition:background 0.3s;"></div></div>
        <span id="gazeWillText">100/100</span>
      </div>
    </div>

    <!-- Timer and drain rate (top‑right) -->
    <div style="position:absolute; top:20px; right:30px; text-align:right; color:#d4af37;">
      <div id="gazeTimer" style="font-size:2rem; font-family:monospace;">60</div>
      <div id="gazeDrainRate" style="color:#ff6a6a; font-size:0.9rem;">Drain: 0.0/s</div>
      <div id="gazeStressLevel" style="color:#ff0000; margin-top:4px;">Stress: 0%</div>
    </div>

    <!-- Bandolier slots (bottom left) -->
    <div style="position:absolute; bottom:30px; left:30px; display:flex; gap:15px;">
      ${[0,1,2].map(i => `
        <div id="bandolierSlot${i}" class="bandolier-slot" data-slot="${i}">
          <span id="bandolierIcon${i}">⬤</span>
          <span id="bandolierCount${i}">0</span>
        </div>
      `).join('')}
    </div>

    <!-- Action buttons (bottom center) -->
    <div style="position:absolute; bottom:30px; left:50%; transform:translateX(-50%); display:flex; gap:15px;">
      <button id="castWardBtn" class="craft-btn" style="padding:12px 24px;">🛡️ Cast Ward (2 Ichor)</button>
      <button id="reinforceBtn" class="craft-btn" style="padding:12px 24px;">✨ Reinforce</button>
      <button id="hollowBtn" class="craft-btn" style="padding:12px 24px; background:#4a1a1a;">💀 Confront Hollow</button>
    </div>

    <!-- Ichor display -->
    <div style="position:absolute; top:100px; right:30px; color:#c0b0a0;">Ichor: ${ingredients.value.demonIchor}</div>

    <!-- DYNAMIC EFFECTS LAYER (for stress/glitching) -->
    <div id="stressEffects" style="position:absolute; inset:0; pointer-events:none; mix-blend-mode:overlay; opacity:0;"></div>
  `;
}

function bindActiveEvents(): void {
  [0,1,2].forEach(i => {
    const slot = el(`bandolierSlot${i}`);
    if (slot) slot.addEventListener('click', () => useConsumable(i));
  });

  const castBtn = el('castWardBtn');
  if (castBtn) {
    castBtn.addEventListener('click', () => {
      const emptyWardIndex = gazeWardPattern.value.findIndex(w => w === 0);
      if (emptyWardIndex === -1) {
        addLog('Ward slots are full!', true);
        return;
      }
      if (attemptWardCast()) {
        const lastWardType = gazeWardPattern.value.filter(w => w > 0).pop() || 1;
        const newType = (lastWardType % 3) + 1; // rotate types 1-3
        const updated = [...gazeWardPattern.value];
        updated[emptyWardIndex] = newType;
        gazeWardPattern.value = updated;
      }
    });
  }

  const hollowBtn = el('hollowBtn');
  if (hollowBtn) {
    hollowBtn.addEventListener('click', () => {
      const { success, effect } = confrontHollow();
      if (success) {
        playSfx('insight_gain');
        const avatar = el('playerAvatar');
        if (avatar) {
          avatar.style.filter = 'brightness(1.3) saturate(1.5)';
          setTimeout(() => { if (avatar) avatar.style.filter = ''; }, 1500);
        }
      } else {
        playSfx('hollow_defeat');
        document.body.style.transform = `translate(${Math.random()*10}px, ${Math.random()*10}px)`;
        setTimeout(() => document.body.style.transform = '', 300);
      }
      updateGazeUI({ willPercent: will.value / maxWill.value });
    });
  }

  updateWardVisuals();
}

export function updateGazeUI(data: {
  willPercent?: number;
  healthPercent?: number;
  timerSeconds?: number;
  drainRate?: number;
  wardCount?: number;
  stressLevel?: number;
}): void {
  if (!gazeOverlay) return;
  const { stressLevel = 0 } = data;

  // Stress visual effects
  const stressEffects = el('stressEffects');
  if (stressEffects) {
    stressEffects.style.opacity = `${Math.min(1, stressLevel / 100)}`;
  }
  const avatar = el('playerAvatar');
  if (avatar) {
    if (stressLevel > 60) {
      avatar.style.filter = `hue-rotate(${stressLevel}deg)`;
    } else {
      avatar.style.filter = '';
    }
  }
  const bg = el('gazeBackground');
  if (bg) {
    bg.style.animation = stressLevel > 80 
      ? 'pulseWarning 0.5s infinite' 
      : stressLevel > 50 
        ? 'pulseWarning 1s infinite' 
        : 'none';
  }

  if (data.willPercent !== undefined) {
    const wb = el('gazeWillBar');
    if (wb) {
      wb.style.width = `${data.willPercent * 100}%`;
      wb.style.background = data.willPercent < 0.3 ? '#ff4444' : '#7ea04b';
    }
    const txt = el('gazeWillText');
    if (txt) txt.textContent = `${Math.floor(will.value)}/${maxWill.value}`;
  }
  if (data.healthPercent !== undefined) {
    const hb = el('gazeHealthBar');
    if (hb) hb.style.width = `${data.healthPercent * 100}%`;
    const txt = el('gazeHealthText');
    if (txt) txt.textContent = `${Math.floor(health.value)}/100`;
  }
  if (data.timerSeconds !== undefined) {
    const timer = el('gazeTimer');
    if (timer) timer.textContent = Math.ceil(data.timerSeconds).toString();
  }
  if (data.drainRate !== undefined) {
    const dr = el('gazeDrainRate');
    if (dr) dr.textContent = `Drain: ${data.drainRate.toFixed(1)}/s`;
  }
  updateConsumableDisplay();
  updateWardVisuals();
}

function updateConsumableDisplay(): void {
  for (let i=0; i<3; i++) {
    const slotId = dailyConsumableSlots.value[i];
    const iconEl = el(`bandolierIcon${i}`);
    const countEl = el(`bandolierCount${i}`);
    if (!iconEl || !countEl) continue;
    if (!slotId) {
      iconEl.textContent = '⬤'; countEl.textContent = 'Empty';
    } else {
      let icon = '🧪'; let count = 0;
      if (slotId === 'restorativeDraught') { icon='🧃'; count=crafted.value.restorativeDraught; }
      else if (slotId === 'powderOfWarding') { icon='🧴'; count=crafted.value.powderOfWarding; }
      else if (slotId === 'phialOfSubjugation') { icon='⚗️'; count=crafted.value.phialOfSubjugation; }
      iconEl.textContent = icon;
      countEl.textContent = count.toString();
      const slotDiv = el(`bandolierSlot${i}`);
      if (slotDiv) {
        slotDiv.style.opacity = count > 0 ? '1' : '0.4';
        slotDiv.style.cursor = count > 0 ? 'pointer' : 'not-allowed';
      }
    }
  }
}

function updateWardVisuals(): void {
  const container = el('wardContainer');
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);
  wardElements = [];

  const wardTypes = gazeWardPattern.value; // [1,2,0] etc.
  for (let i = 0; i < wardTypes.length; i++) {
    const wardDiv = document.createElement('div');
    wardDiv.className = 'gaze-ward';
    wardDiv.style.cssText = `
      position:absolute; top:0; left:0; width:100%; height:100%;
      pointer-events:none;
      animation: wardOrbit 4s linear infinite;
      animation-delay: ${i * -2}s;
      filter: brightness(${wardTypes[i] ? 1 : 0.3}) contrast(${wardTypes[i] ? 1 : 0.7});
    `;

    if (wardTypes[i] === 0) {
      wardDiv.innerHTML = '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:2rem; color:#800;">❌</div>';
    } else {
      const inner = document.createElement('div');
      inner.style.cssText = `
        position:absolute; top:50%; left:50%; width:80px; height:80px;
        margin:-40px 0 0 -40px;
        animation: wardSpin 3s linear infinite;
      `;
      const img = document.createElement('img');
      // Use a generic ward type image (we don't have specific files, but we'll map to Ward (1).png etc.)
      img.src = `/Images/Game Art/Wards/Ward (${wardTypes[i]}).png`;
      img.style.cssText = 'width:100%; height:100%; object-fit:contain; mix-blend-mode:screen; filter: drop-shadow(0 0 12px #a0d07a);';
      inner.appendChild(img);
      wardDiv.appendChild(inner);
    }

    container.appendChild(wardDiv);
    wardElements.push(wardDiv);
  }
}

// Inject animation styles (with new fracturing keyframes)
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes wardOrbit {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes wardSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes wardFracture {
    0% { transform: rotate(0deg); }
    30% { transform: scale(0.95) rotate(-10deg); }
    50% { transform: scale(0.9) rotate(10deg); filter: brightness(0.8) contrast(1.2); }
    70% { transform: scale(0.95) rotate(-5deg); }
    100% { transform: rotate(360deg); }
  }
  .gaze-ward.fracturing {
    animation: wardFracture 0.5s ease-in-out;
    filter: hue-rotate(180deg);
  }
  @keyframes pulseWarning {
    0% { opacity: 0.2; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.05); }
    100% { opacity: 0.2; transform: scale(1); }
  }
`;
document.head.appendChild(styleSheet);

export function hideGazeUI(): void {
  if (gazeOverlay) {
    gazeOverlay.remove();
    gazeOverlay = null;
    wardElements = [];
  }
}