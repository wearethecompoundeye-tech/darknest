// js/ui/tome.ts – Complete Serpentongue Tome with all eight tabs.
// Works with the ModalManager; renders lore, runes, bestiary, etc.

import { state, knownRunes, discoveries, ingredients } from '../core/state-signals.js';
import { el } from '../core/dom-helper.js';
import { playSfx } from '../audio/sfx.js';
import { runeData } from '../data/runes.js';
import { relics, getRelicById } from '../data/relics.js';
import { renderSettingsContent } from './settings-panel.js';

export function openTome(): void {
  const manager = (window as any).modalManager;
  const modal = el('tomeModal');
  if (!modal) return;
  renderTome('guidance');
  manager.open(modal);
  playSfx('tomeOpen');

  document.querySelectorAll('.tome-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabName = (e.target as HTMLElement).dataset.tab;
      if (tabName) renderTome(tabName);
    });
  });
}

function renderTome(tab: string): void {
  const content = el('tomeContent');
  if (!content) return;

  document.querySelectorAll('.tome-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.tome-tab[data-tab="${tab}"]`);
  if (activeTab) activeTab.classList.add('active');

  let html = '';
  switch (tab) {
    case 'guidance':
      html = `
        <h4>🧭 Guidance</h4>
        <p>You are the Void Acolyte, the last hope of Orbex. Gather reagents, trace the circle, summon entities, and explore the Undercrypt to reclaim the six Orbex fragments. Beware Kalgoth's Noose—pay the tithe and succeed in your rituals to keep it loose.</p>
        <p><strong>Current Objectives:</strong></p>
        <ul>
          <li>Forage for Moss and Phlegm</li>
          <li>Craft Powder of Warding and Phial of Subjugation</li>
          <li>Trace the Circle to empower it</li>
          <li>Summon entities and equip them</li>
          <li>Enter the Undercrypt to find fragments</li>
        </ul>
      `;
      break;
    case 'patterns':
      {
        const known = knownRunes.value;
        html = `<h4>ᚠ Known Patterns (${known.length}/${runeData.length})</h4>`;
        runeData.forEach(rune => {
          const unlocked = known.includes(rune.name);
          html += `<div class="tome-entry ${unlocked ? 'unlocked' : 'locked'}">`;
          html += `<strong>${rune.name}</strong> — ${rune.meaning}`;
          html += unlocked ? `<p>${rune.effect}</p>` : `<p>??? — Discover this pattern.</p>`;
          html += `</div>`;
        });
      }
      break;
    case 'entities':
      html = `
        <h4>👹 Entity Bestiary</h4>
        <p>Summon entities from the void. Each has unique stats and abilities.</p>
        <p><em>Discover more by summoning and exploring.</em></p>
      `;
      break;
    case 'ingredients':
      {
        const ings = ingredients.value;
        html = `<h4>🌿 Ingredients</h4>`;
        Object.entries(ings).forEach(([k, v]) => {
          html += `<div class="stat-row"><span>${k}</span><span>${v}</span></div>`;
        });
      }
      break;
    case 'rituals':
      html = `
        <h4>🔮 Rituals</h4>
        <p><strong>Summon Entity:</strong> Requires Powder of Warding, Phial of Subjugation, and an active pattern.</p>
        <p><strong>Trace Circle:</strong> Restores Circle Power. Click sparks in sequence.</p>
        <p><strong>Pay Tithe:</strong> Spend 5 Ichor daily to reduce Kalgoth's Noose.</p>
      `;
      break;
    case 'lore':
      html = `
        <h4>📜 Lore</h4>
        <p>Orbex, the seed of balance, was shattered by Kalgoth's betrayal. The world inverted into the Undercrypt. You, the Void Acolyte, survived with a fragment of Orbex embedded in your soul. Reclaim the six fragments, purify the Hollow Acolytes, and banish Kalgoth.</p>
      `;
      break;
    case 'relics':
      {
        const owned = state.ownedRelics || [];
        html = `<h4>💎 Relics</h4><div class="relics-grid">`;
        relics.forEach(r => {
          const unlocked = owned.includes(r.id);
          html += `
            <div class="relic-card ${unlocked ? '' : 'locked'}">
              <img src="${r.image}" alt="${r.name}">
              <div class="relic-info">
                <strong>${unlocked ? r.name : '???'}</strong>
                <p>${unlocked ? r.description : 'Undiscovered'}</p>
                <p style="font-size:0.65rem;">${unlocked ? r.lore : ''}</p>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }
      break;
    case 'settings':
      html = `<div id="settingsContent"></div>`;
      setTimeout(() => renderSettingsContent(), 0);
      break;
    default:
      html = '<p>Select a tab.</p>';
  }
  content.innerHTML = html;
}