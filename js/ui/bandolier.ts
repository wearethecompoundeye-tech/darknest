// js/ui/bandolier.ts – Bandolier slots rendering and interaction

import {
  dailyConsumableSlots,
  crafted,
  ingredients,
  will,
  maxWill,
  health
} from '../core/state-signals.js';
import { useConsumable } from '../systems/gaze-event.js';
import { el } from '../core/dom-helper.js';
import { playSfx } from '../audio/sfx.js';
import { addLog } from './log-manager.js';

export function renderBandolierSlots(): void {
  const container = el('bandolierSlots');
  if (!container) return;

  let html = '';
  for (let i = 0; i < 3; i++) {
    const slotId = dailyConsumableSlots.value[i];
    let icon = '';
    let count = 0;
    let itemName = 'Empty';

    if (slotId === 'restorativeDraught') {
      icon = `${import.meta.env.BASE_URL}Images/Restorative.png`;
      count = crafted.value.restorativeDraught;
      itemName = 'Restorative Draught';
    } else if (slotId === 'powderOfWarding') {
      icon = '🧴';
      count = crafted.value.powderOfWarding;
      itemName = 'Powder of Warding';
    } else if (slotId === 'phialOfSubjugation') {
      icon = '⚗️';
      count = crafted.value.phialOfSubjugation;
      itemName = 'Phial of Subjugation';
    }

    html += `
      <div class="bandolier-slot" data-slot="${i}" title="${itemName} (${count})">
        ${slotId === 'restorativeDraught'
          ? `<img src="${icon}" style="width:32px; height:32px; object-fit:contain;">`
          : `<span style="font-size:1.5rem;">${icon}</span>`
        }
        <span style="font-size:0.65rem;">${count}</span>
      </div>
    `;
  }

  container.innerHTML = html;

  // Attach click handlers
  container.querySelectorAll('.bandolier-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const idx = parseInt((slot as HTMLElement).dataset.slot!);
      const used = useConsumable(idx);
      if (!used) {
        addLog('Cannot use that right now.', true);
      }
    });
  });
}