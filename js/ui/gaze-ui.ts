// js/ui/gaze-ui.ts
// UI overlay for Kalgoth's Gaze event - with dismissible warning, fixed sizing and close button

import { el } from '../core/dom-helper.js';
import { will, maxWill, wardIntegrities, dailyConsumableSlots, crafted } from '../core/state-signals.js';
import { useConsumable, reinforceWard, forceStartGazeEvent } from '../systems/gaze-event.js';

let gazeOverlay: HTMLDivElement | null = null;
let willBar: HTMLElement | null = null;
let timerDisplay: HTMLElement | null = null;
let drainRateDisplay: HTMLElement | null = null;
let wardElements: HTMLElement[] = [];
let consumableElements: HTMLElement[] = [];

export function showGazeUI(phase: 'warning' | 'active'): void {
  if (gazeOverlay) gazeOverlay.remove();
  gazeOverlay = document.createElement('div');
  gazeOverlay.id = 'gazeOverlay';
  gazeOverlay.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; z-index:5000; pointer-events:none; display:flex; flex-direction:column; align-items:center; justify-content:center;`;
  
  if (phase === 'warning') {
    gazeOverlay.innerHTML = `
      <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:radial-gradient(circle, rgba(80,0,80,0.3) 0%, rgba(0,0,0,0.8) 100%); animation:pulseWarning 2s infinite;"></div>
      <div style="position:relative; text-align:center; color:#d4af37; font-size:3rem; text-shadow:0 0 30px #8a2be2; animation:textPulse 1s infinite;">KALGOTH'S GAZE APPROACHES</div>
      <div style="position:relative; color:#a0d07a; font-size:1.5rem; margin-top:20px;">Return to the circle!</div>
      <div style="position:relative; margin-top:40px; display:flex; gap:20px; pointer-events:auto;">
        <button id="gazeStartNowBtn" class="craft-btn" style="padding:12px 24px; font-size:1rem;">⚡ Begin Now</button>
        <button id="gazeDismissWarningBtn" class="craft-btn" style="padding:12px 24px; font-size:1rem; background:#5a2a2a;">✖ Close</button>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulseWarning{0%,100%{opacity:0.5;transform:scale(1);}50%{opacity:0.8;transform:scale(1.05);}}
      @keyframes textPulse{0%,100%{opacity:0.7;}50%{opacity:1;text-shadow:0 0 50px #d4af37;}}
    `;
    document.head.appendChild(style);
    
    const startBtn = gazeOverlay.querySelector('#gazeStartNowBtn');
    const dismissBtn = gazeOverlay.querySelector('#gazeDismissWarningBtn');
    
    if (startBtn) startBtn.addEventListener('click', () => { forceStartGazeEvent(); });
    if (dismissBtn) dismissBtn.addEventListener('click', () => {
      if (gazeOverlay) gazeOverlay.remove();
      gazeOverlay = null;
      const gameContainer = el('gameContainer');
      if (gameContainer) gameContainer.style.pointerEvents = 'auto';
    });
    
  } else {
    gazeOverlay.style.pointerEvents = 'auto';
    gazeOverlay.innerHTML = `
      <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:radial-gradient(circle at 50% 50%, rgba(139,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%); pointer-events:none;"></div>
      <div style="position:absolute; bottom:30%; left:50%; transform:translateX(-50%); width:400px; text-align:center;">
        <div style="color:#e0d8cc; font-size:1.2rem; margin-bottom:5px;">WILL</div>
        <div style="background:#0a0205; height:30px; border-radius:15px; border:2px solid #8a2a2a; overflow:hidden;"><div id="gazeWillBar" style="width:100%; height:100%; background:linear-gradient(90deg, #7ea04b, #a0d07a); transition:width 0.1s;"></div></div>
        <div id="gazeWillText" style="color:#f0e8d8; margin-top:5px;">${will.value}/${maxWill.value}</div>
      </div>
      <div style="position:absolute; top:20px; right:30px; text-align:right;"><div id="gazeTimer" style="color:#d4af37; font-size:2rem; font-family:monospace;">60</div><div id="gazeDrainRate" style="color:#ff6a6a;">Drain: 0.0/s</div></div>
      <div style="position:absolute; bottom:45%; left:50%; transform:translateX(-50%); display:flex; gap:40px;">${[0,1,2].map(i=>`<div id="gazeWard${i}" data-index="${i}" style="width:80px; height:80px; background:radial-gradient(circle, #2a1a2a, #0a050a); border:3px solid #8a7a5a; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s; box-shadow:0 0 20px rgba(160,208,122,0.3);"><div style="font-size:2rem; color:#d4af37;">ᚠ</div><div id="gazeWardIntegrity${i}" style="font-size:0.8rem; color:#a0d07a;">100%</div></div>`).join('')}</div>
      <div style="position:absolute; bottom:10%; left:50%; transform:translateX(-50%); display:flex; gap:20px;">${[0,1,2].map(i=>`<div id="gazeConsumable${i}" data-slot="${i}" style="width:70px; height:70px; background:#1c120c; border:2px solid #c8b890; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;"><div id="gazeConsumableIcon${i}" style="font-size:1.5rem;">🧪</div><div id="gazeConsumableCount${i}" style="font-size:0.7rem; color:#f0e8d8;">0</div></div>`).join('')}</div>
    `;
    
    willBar = el('gazeWillBar');
    timerDisplay = el('gazeTimer');
    drainRateDisplay = el('gazeDrainRate');
    for (let i=0; i<3; i++) {
      const ward = el(`gazeWard${i}`); if (ward) { ward.addEventListener('click', () => reinforceWard(i)); wardElements[i] = ward; }
      const consumable = el(`gazeConsumable${i}`); if (consumable) { consumable.addEventListener('click', () => useConsumable(i)); consumableElements[i] = consumable; }
    }
    updateConsumableDisplay();
  }
  document.body.appendChild(gazeOverlay);
}

export function updateGazeUI(data: { willPercent: number; timerSeconds: number; drainRate: number; wardIntegrities: number[] }): void {
  if (!gazeOverlay) return;
  if (willBar) willBar.style.width = `${data.willPercent * 100}%`;
  const willText = el('gazeWillText'); if (willText) willText.textContent = `${Math.floor(will.value)}/${maxWill.value}`;
  if (timerDisplay) timerDisplay.textContent = Math.ceil(data.timerSeconds).toString();
  if (drainRateDisplay) drainRateDisplay.textContent = `Drain: ${data.drainRate.toFixed(1)}/s`;
  for (let i=0; i<3; i++) {
    const integrityEl = el(`gazeWardIntegrity${i}`);
    if (integrityEl) { const integrity = data.wardIntegrities[i]; integrityEl.textContent = `${Math.floor(integrity)}%`; integrityEl.style.color = integrity>50?'#a0d07a':(integrity>20?'#d4af37':'#ff6a6a'); }
    const ward = wardElements[i]; if (ward) { ward.style.boxShadow = data.wardIntegrities[i]>50?'0 0 20px rgba(160,208,122,0.5)':(data.wardIntegrities[i]>20?'0 0 30px rgba(212,175,55,0.7)':'0 0 40px rgba(255,0,0,0.8)'); ward.style.borderColor = data.wardIntegrities[i]>50?'#a0d07a':(data.wardIntegrities[i]>20?'#d4af37':'#ff6a6a'); }
  }
  updateConsumableDisplay();
}

function updateConsumableDisplay(): void {
  for (let i=0; i<3; i++) {
    const slotId = dailyConsumableSlots.value[i]; const iconEl = el(`gazeConsumableIcon${i}`); const countEl = el(`gazeConsumableCount${i}`);
    if (!slotId) { if (iconEl) iconEl.textContent = '⬤'; if (countEl) countEl.textContent = 'Empty'; }
    else { let icon='🧪'; let count=0; if (slotId==='restorativeDraught') { icon='🧃'; count=crafted.value.restorativeDraught; } else if (slotId==='powderOfWarding') { icon='🧴'; count=crafted.value.powderOfWarding; } else if (slotId==='phialOfSubjugation') { icon='⚗️'; count=crafted.value.phialOfSubjugation; } if (iconEl) iconEl.textContent=icon; if (countEl) countEl.textContent=count.toString(); }
    const consumable = consumableElements[i]; if (consumable) { const count = slotId==='restorativeDraught'?crafted.value.restorativeDraught:slotId==='powderOfWarding'?crafted.value.powderOfWarding:slotId==='phialOfSubjugation'?crafted.value.phialOfSubjugation:0; consumable.style.opacity = count>0?'1':'0.4'; consumable.style.cursor = count>0?'pointer':'not-allowed'; }
  }
}

export function hideGazeUI(): void { if (gazeOverlay) { gazeOverlay.remove(); gazeOverlay=null; } willBar=null; timerDisplay=null; drainRateDisplay=null; wardElements=[]; consumableElements=[]; }