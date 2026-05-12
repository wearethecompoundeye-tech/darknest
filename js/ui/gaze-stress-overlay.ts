// js/ui/gaze-stress-overlay.ts – Biomechanical stress visuals with dynamic fractures
import { isGazeActive, will, maxWill } from '../core/state-signals.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents } from '../core/events.js';
import { playSfx } from '../audio/sfx.js';

let stressOverlay: HTMLDivElement | null = null;
let fractureContainer: HTMLDivElement | null = null;
let veinContainer: HTMLDivElement | null = null;
let audioContext: AudioContext | null = null;
let desyncOscillator: OscillatorNode | null = null;
let desyncGain: GainNode | null = null;

export function initStressOverlay(): void {
  if (stressOverlay) return;
  stressOverlay = document.createElement('div');
  stressOverlay.id = 'gazeStressOverlay';
  stressOverlay.style.cssText = `
    position:fixed; inset:0; z-index:4000; pointer-events:none; overflow:hidden;
    background: radial-gradient(circle at center, transparent 0%, rgba(255,0,0,0.02) 50%, rgba(0,0,0,0.8) 100%);
  `;
  fractureContainer = document.createElement('div');
  fractureContainer.id = 'gazeFractures';
  fractureContainer.style.cssText = `
    position:absolute; inset:0; pointer-events:none;
    background:
      repeating-linear-gradient(45deg, transparent 0, transparent 10px, rgba(255,0,0,0.1) 10px, rgba(255,0,0,0.1) 11px),
      repeating-linear-gradient(-45deg, transparent 0, transparent 10px, rgba(0,0,255,0.1) 10px, rgba(0,0,255,0.1) 11px);
    opacity:0; transition: opacity 0.3s;
    mix-blend-mode: exclusion;
  `;
  veinContainer = document.createElement('div');
  veinContainer.id = 'gazeVeins';
  veinContainer.style.cssText = `
    position:absolute; inset:0; pointer-events:none; overflow:hidden;
  `;
  for (let i = 0; i < 3; i++) {
    const vein = document.createElement('div');
    vein.style.cssText = `
      position:absolute; width: ${5 + i*5}px; height: ${100 + i*20}px;
      left: ${50 + (i-1)*15}%; top: 50%; background: #ff4444;
      border-radius: 2px; transform-origin: top center;
      opacity:0; box-shadow: 0 0 8px #ff0000;
    `;
    veinContainer.appendChild(vein);
  }
  stressOverlay.appendChild(fractureContainer);
  stressOverlay.appendChild(veinContainer);
  document.body.appendChild(stressOverlay);

  try {
    audioContext = new AudioContext();
    desyncOscillator = audioContext.createOscillator();
    desyncGain = audioContext.createGain();
    desyncOscillator.type = 'sawtooth';
    desyncOscillator.frequency.value = 10;
    desyncGain.gain.value = 0;
    desyncOscillator.connect(desyncGain);
    desyncGain.connect(audioContext.destination);
    desyncOscillator.start();
  } catch (e) {
    console.warn('AudioContext not available');
  }

  gameBus.on(GameEvents.GAZE_UPDATE, (data: { stressLevel: number }) => updateStressVisuals(data.stressLevel));
}

export function updateStressVisuals(stressLevel: number): void {
  if (!stressOverlay) return;
  // Guard against NaN
  const level = isFinite(stressLevel) ? stressLevel : 0;
  const stressPct = Math.min(1, Math.max(0, level / 100));
  
  if (stressPct > 0.3) {
    const shakeX = Math.sin(Date.now() * 0.02) * (stressPct * 4);
    const shakeY = Math.cos(Date.now() * 0.02) * (stressPct * 4);
    document.body.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
  } else {
    document.body.style.transform = '';
  }

  if (fractureContainer) {
    fractureContainer.style.opacity = String(Math.min(0.3, stressPct * 1.2));
    if (stressPct > 0.5 && Math.random() < stressPct * 0.1) {
      createFracture();
    }
  }

  if (veinContainer) {
    const veins = veinContainer.children;
    for (let i = 0; i < veins.length; i++) {
      const vein = veins[i] as HTMLElement;
      const scale = 1 + (stressPct * (1 + Math.sin(Date.now() * 0.03 + i * 0.5)));
      vein.style.transform = `scaleY(${scale})`;
      vein.style.opacity = String(stressPct);
    }
  }

  if (desyncOscillator && audioContext) {
    const targetFreq = isFinite(5 + stressPct * 15) ? 5 + stressPct * 15 : 5;
    desyncOscillator.frequency.setTargetAtTime(targetFreq, audioContext.currentTime, 0.1);
    const targetGain = isFinite(stressPct * 0.05) ? stressPct * 0.05 : 0;
    desyncGain!.gain.setTargetAtTime(targetGain, audioContext.currentTime, 0.1);
  }

  document.body.style.filter = `hue-rotate(${isFinite(stressPct * 180) ? stressPct * 180 : 0}deg) brightness(${1 - stressPct * 0.2})`;
}

function createFracture(): void {
  if (!fractureContainer) return;
  const fracture = document.createElement('div');
  fracture.style.cssText = `
    position:absolute; width:${Math.random()*50+20}px; height:${Math.random()*20+2}px;
    left:${Math.random()*90}%; top:${Math.random()*80+10}%;
    background: rgba(255,0,0,0.2);
    transform: rotate(${Math.random()*360}deg);
    opacity:0.8; box-shadow: 0 0 4px rgba(255,0,0,0.5);
  `;
  fractureContainer.appendChild(fracture);
  setTimeout(() => {
    if (fracture) fracture.style.transform = `rotate(${Math.random()*360}deg) scale(1.5)`;
    playSfx('fracture');
  }, 100);
  setTimeout(() => {
    if (fracture) {
      fracture.style.opacity = '0';
      setTimeout(() => fracture.remove(), 300);
    }
  }, 2000);
}

export function clearStressOverlay(): void {
  if (stressOverlay) {
    stressOverlay.remove();
    stressOverlay = null;
    fractureContainer = null;
    veinContainer = null;
  }
  if (desyncOscillator) desyncOscillator.stop();
  document.body.style.filter = '';
  document.body.style.transform = '';
}