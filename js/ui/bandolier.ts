// js/ui/bandolier.ts
// Dynamic bandolier UI – displays dailyConsumableSlots and allows assignment of Restorative Draughts.

import {
  dailyConsumableSlots,
  crafted,
  isGazeActive,
  gazePhase,
} from '../core/state-signals.js';
import { addLog } from './log-manager.js';
import { useConsumable } from '../systems/gaze-event.js';

const SLOT_COUNT = 3;

export function renderBandolierSlots(): void {
  const container = document.getElementById('bandolierSlots');
  if (!container) return;

  container.innerHTML = '';

  for (let i = 0; i < SLOT_COUNT; i++) {
    const slotId = dailyConsumableSlots.value[i] || '';
    const slotDiv = document.createElement('div');
    slotDiv.className = 'bandolier-slot';
    slotDiv.dataset.slot = String(i);

    slotDiv.style.cssText = `
      width: 60px; height: 60px;
      background: ${slotId ? '#2a1a0a' : '#1c120c'};
      border: 2px solid ${slotId ? '#ffd700' : '#c8b890'};
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.65rem;
      color: #f0e8d8;
      transition: 0.2s;
    `;

    if (slotId === 'restorativeDraught') {
      slotDiv.innerHTML = `
        <img src="/Images/Restorative.png" style="width:32px; height:32px; object-fit:contain;">
        <span style="margin-top:2px;">Draught</span>
      `;
      slotDiv.addEventListener('click', () => {
        if (isGazeActive.value && gazePhase.value === 'active') {
          const used = useConsumable(i);
          if (used) renderBandolierSlots();
        } else {
          unequipSlot(i);
        }
      });
    } else {
      slotDiv.innerHTML = `<span style="font-size:1.2rem;">+</span><span style="margin-top:2px;">Empty</span>`;
      slotDiv.addEventListener('click', () => {
        equipRestorativeDraught(i);
      });
    }

    container.appendChild(slotDiv);
  }
}

function equipRestorativeDraught(slotIndex: number): void {
  if (dailyConsumableSlots.value.includes('restorativeDraught')) {
    addLog('You already have a Draught equipped.', true);
    return;
  }
  if (crafted.value.restorativeDraught < 1) {
    addLog('You need a Restorative Draught. Craft one first!', true);
    return;
  }

  const newSlots = [...dailyConsumableSlots.value];
  newSlots[slotIndex] = 'restorativeDraught';
  dailyConsumableSlots.value = newSlots;
  addLog('Restorative Draught equipped to bandolier.', false, 'player');
  renderBandolierSlots();
}

function unequipSlot(slotIndex: number): void {
  const newSlots = [...dailyConsumableSlots.value];
  newSlots[slotIndex] = '';
  dailyConsumableSlots.value = newSlots;
  addLog('Draught removed from bandolier.', false, 'player');
  renderBandolierSlots();
}