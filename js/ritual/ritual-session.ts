// js/ritual/ritual-session.ts
// Orchestrates the full summoning ritual: Circle → Runes → Offering → Summon.
// Provides a beautiful overlay with progress indicators, rune slot selection,
// and high‑quality particle feedback. Dispatches minigame‑state events for Zilion.

import {
  circleQuality,
  circlePower,
  runeSlots,
  selectedRunes,
  knownRunes,
  crafted,
  ingredients,
  will,
  maxWill,
  kalgothsNoose,
  tutorial,
  discoveries,
  addMasteryXP,
  autoSave,
  updateState,
} from '../core/state-signals.js';
import { runeData } from '../data/runes.js';
import { addLog } from '../ui/log-manager.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import { el } from '../core/dom-helper.js';
import { startRuneTracing } from '../minigames/rune-etch.js';
import { startOffering } from '../minigames/offering.js';
import { summonEntity } from '../systems/summoning.js';
import { updateRuneSlots } from '../ui/ui-renderer.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents } from '../core/events.js';

// ── Internal state ────────────────────────────────────────────
let overlay: HTMLDivElement | null = null;
let sessionActive = false;
let offeringResult = 0;
let pendingRune = '';
let pendingSlot = -1;

const filledSlots = () => runeSlots.value.filter(r => r !== '').length;

// ── Public entry ──────────────────────────────────────────────
export function startRitualSession(): void {
  if (sessionActive) return;

  if (circleQuality.value <= 0) {
    addLog('The circle must be traced first. Use "Trace Circle".', true);
    return;
  }

  sessionActive = true;
  offeringResult = (window as any).__offeringQuality || 0;
  pendingRune = '';
  pendingSlot = -1;

  buildOverlay();
  updateOverlay();
  document.body.appendChild(overlay!);
  overlay!.style.display = 'flex';
  playSfx('uiClick');
  window.dispatchEvent(new CustomEvent('darknest:minigame-state', { detail: { active: true, source: 'ritual-session' } }));

  // Listen for offering completion to enable summon button
  window.addEventListener('offering:completed', handleOfferingCompleted as EventListener);
}

// ── Overlay construction ──────────────────────────────────────
function buildOverlay(): void {
  overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.id = 'ritualSessionModal';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.92);
    backdrop-filter: blur(12px); z-index: 3000;
    display: flex; align-items: center; justify-content: center;
  `;
  overlay.innerHTML = `
    <div class="ritual-session-content" style="
      background: #0a0508; border: 2px solid #b8a070; border-radius: 32px;
      padding: 24px; max-width: 650px; width: 95%; color: #e0d8cc;
      box-shadow: 0 0 40px rgba(200,170,120,0.4), inset 0 0 60px rgba(0,0,0,0.6);
      position: relative; overflow: hidden;
    ">
      <div style="position:absolute; inset:0; background: radial-gradient(circle at 20% 30%, rgba(40,60,40,0.2), transparent 80%); pointer-events:none;"></div>

      <h3 style="color:#d4af37; text-align:center; margin:0 0 16px; font-size:1.6rem; text-shadow:0 0 20px #6a2a2a;">
        🌑 RITUAL OF SUMMONING
      </h3>

      <div style="display:flex; justify-content:space-between; margin-bottom:20px; position:relative;">
        <div class="ritual-step ${circleQuality.value>0?'completed':''}" style="text-align:center; flex:1;">
          <div style="width:40px; height:40px; border-radius:50%; background:${circleQuality.value>0?'#4a7a2a':'#2a2a2a'}; margin:0 auto; line-height:40px; font-size:1.2rem; box-shadow:0 0 15px ${circleQuality.value>0?'#7ea04b':'none'};">🜁</div>
          <span style="font-size:0.7rem; display:block; margin-top:4px;">Circle</span>
        </div>
        <div class="ritual-step ${filledSlots()>0?'completed':''}" style="text-align:center; flex:1;">
          <div style="width:40px; height:40px; border-radius:50%; background:${filledSlots()>0?'#4a7a2a':'#2a2a2a'}; margin:0 auto; line-height:40px; font-size:1.2rem; box-shadow:0 0 15px ${filledSlots()>0?'#7ea04b':'none'};">ᚠ</div>
          <span style="font-size:0.7rem; display:block; margin-top:4px;">Runes</span>
        </div>
        <div class="ritual-step ${offeringResult>0?'completed':''}" style="text-align:center; flex:1;">
          <div style="width:40px; height:40px; border-radius:50%; background:${offeringResult>0?'#4a7a2a':'#2a2a2a'}; margin:0 auto; line-height:40px; font-size:1.2rem; box-shadow:0 0 15px ${offeringResult>0?'#7ea04b':'none'};">🕯️</div>
          <span style="font-size:0.7rem; display:block; margin-top:4px;">Offering</span>
        </div>
        <div class="ritual-step" style="text-align:center; flex:1;">
          <div style="width:40px; height:40px; border-radius:50%; background:#2a2a2a; margin:0 auto; line-height:40px; font-size:1.2rem;">🔺</div>
          <span style="font-size:0.7rem; display:block; margin-top:4px;">Summon</span>
        </div>
      </div>

      <div style="display:flex; justify-content:center; gap:20px; margin:16px 0;" id="runeSlotsContainer">
        ${[0,1,2].map(i => `
          <div class="ritual-rune-slot" data-slot="${i}" style="
            width:72px; height:72px; border-radius:50%;
            border:2px solid ${runeSlots.value[i]?'#ffd700':'#5a4a3a'};
            background: radial-gradient(circle at 35% 35%, rgba(30,15,5,0.9), rgba(10,5,0,0.9));
            box-shadow: 0 0 ${runeSlots.value[i]?'20px #ffd700':'0'} rgba(212,175,55,0.6);
            display:flex; align-items:center; justify-content:center;
            cursor: pointer; font-size:1.5rem; color:${runeSlots.value[i]?'#fff':'#5a4a3a'};
            transition: 0.2s;
          ">${runeSlots.value[i]?runeSlots.value[i]:'·'}</div>
        `).join('')}
      </div>

      <div id="ritualPhaseContent" style="margin:12px 0; text-align:center;">
        <p style="color:#c0b0a0;" id="ritualPhaseText">Select a rune from the console, then touch a slot.</p>
      </div>

      <div style="display:flex; justify-content:center; gap:12px; margin-top:16px;">
        <button id="ritualActionBtn" class="craft-btn" style="padding:12px 24px;">Invoke Rune</button>
        <button id="ritualOfferBtn" class="craft-btn" style="padding:12px 24px;" ${filledSlots()===0?'disabled':''}>🕯️ Offer</button>
        <button id="ritualSummonBtn" class="craft-btn" style="padding:12px 24px; background:#5a1a1a;" ${offeringResult===0?'disabled':''}>🔺 Summon</button>
        <button id="ritualCloseBtn" class="craft-btn">Close</button>
      </div>
    </div>
  `;

  // Bind buttons
  overlay.querySelector('#ritualActionBtn')!.addEventListener('click', onActionClick);
  overlay.querySelector('#ritualOfferBtn')!.addEventListener('click', onOfferClick);
  overlay.querySelector('#ritualSummonBtn')!.addEventListener('click', onSummonClick);
  overlay.querySelector('#ritualCloseBtn')!.addEventListener('click', closeSession);

  // Bind rune slot clicks
  overlay.querySelectorAll('.ritual-rune-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
      const idx = parseInt((e.currentTarget as HTMLElement).dataset.slot!);
      if (selectedRunes.value.length === 0) {
        addLog('Select a rune pattern from the console first.', true);
        return;
      }
      pendingRune = selectedRunes.value[0];
      pendingSlot = idx;
      updateOverlay();
    });
  });
}

// ── Update overlay UI ─────────────────────────────────────────
function updateOverlay(): void {
  if (!overlay) return;
  const filled = filledSlots();
  const actionBtn = document.getElementById('ritualActionBtn') as HTMLButtonElement;
  const offerBtn = document.getElementById('ritualOfferBtn') as HTMLButtonElement;
  const summonBtn = document.getElementById('ritualSummonBtn') as HTMLButtonElement;
  const phaseText = document.getElementById('ritualPhaseText')!;

  // Refresh slot visuals
  for (let i = 0; i < 3; i++) {
    const slot = document.querySelector(`.ritual-rune-slot[data-slot="${i}"]`) as HTMLElement;
    if (!slot) continue;
    const rune = runeSlots.value[i];
    slot.style.borderColor = rune ? '#ffd700' : '#5a4a3a';
    slot.style.boxShadow = rune ? '0 0 20px rgba(212,175,55,0.6)' : 'none';
    slot.textContent = rune ? rune : '·';
  }

  // Determine state
  if (offeringResult > 0) {
    actionBtn.disabled = true;
    offerBtn.disabled = true;
    summonBtn.disabled = false;
    phaseText.textContent = 'The circle is sealed. Call the entity.';
  } else if (filled === 3) {
    actionBtn.disabled = true;
    offerBtn.disabled = false;
    summonBtn.disabled = true;
    phaseText.textContent = 'All runes inscribed. Perform the offering.';
  } else {
    actionBtn.disabled = !(pendingRune && pendingSlot !== -1 && runeSlots.value[pendingSlot] === '');
    offerBtn.disabled = filled === 0;
    summonBtn.disabled = true;
    phaseText.textContent = pendingRune ? `Inscribing ${pendingRune} into slot ${pendingSlot+1}. Click Invoke.` : 'Select a rune and touch a slot.';
  }
}

// ── Button handlers ───────────────────────────────────────────
function onActionClick(): void {
  if (!pendingRune || pendingSlot === -1) return;
  if (runeSlots.value[pendingSlot] !== '') {
    addLog('Slot already filled.', true);
    return;
  }
  // Launch the invocation minigame
  startRuneTracing(pendingRune, pendingSlot);
  // The minigame will close its own overlay; after it ends, we need to refresh.
  // Since rune-etch closes async, we'll set a watcher that checks rune slots periodically.
  // Use a simple interval that clears when slot changes or session closes.
  const watchInterval = setInterval(() => {
    if (!sessionActive) { clearInterval(watchInterval); return; }
    if (runeSlots.value[pendingSlot] !== '') {
      // Rune placed
      pendingRune = '';
      pendingSlot = -1;
      updateOverlay();
      clearInterval(watchInterval);
    }
  }, 300);
  // Also if the etch fails (slot remains empty after some time), we need to clear after a timeout.
  setTimeout(() => clearInterval(watchInterval), 15000);
}

function onOfferClick(): void {
  if (filledSlots() === 0) return;
  // If offering already completed, don't allow redo (we could allow but reset)
  if (offeringResult > 0) {
    addLog('Offering already completed.', true);
    return;
  }
  // Start the offering minigame; it will dispatch 'offering:completed' when done.
  startOffering();
}

function onSummonClick(): void {
  if (offeringResult === 0) return;
  closeSession();
  summonEntity();
}

// ── Offering completion handler ───────────────────────────────
function handleOfferingCompleted(e: CustomEvent): void {
  const quality = e.detail?.quality ?? 0;
  offeringResult = quality;
  (window as any).__offeringQuality = quality;
  updateOverlay();
  addLog('Offering complete. The circle is sealed.', false, 'player');
}

// ── Close ─────────────────────────────────────────────────────
function closeSession(): void {
  sessionActive = false;
  window.removeEventListener('offering:completed', handleOfferingCompleted as EventListener);
  window.dispatchEvent(new CustomEvent('darknest:minigame-state', { detail: { active: false, source: 'ritual-session' } }));
  if (overlay) { overlay.remove(); overlay = null; }
}

// ── Expose for offering.ts to set result ──────────────────────
export function setOfferingResult(quality: number): void {
  // Legacy; the event is now used instead.
  offeringResult = quality;
  if (sessionActive && overlay) updateOverlay();
}