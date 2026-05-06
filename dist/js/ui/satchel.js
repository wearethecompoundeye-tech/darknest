// js/ui/satchel.ts
import { state, ingredients, crafted, ownedRelics, equippedRelics, equipRelic, unequipRelic, relicBonuses } from '../core/state-signals.js';
import { relicSlots, getRelicById } from '../data/relics.js';
import { el } from '../core/dom-helper.js';
import { playSfx } from '../audio/sfx.js';
import { addLog } from './log-manager.js';
let currentTab = 'inventory';
export function openSatchel() {
    const manager = window.modalManager;
    const modal = el('satchelModal');
    if (!modal)
        return;
    renderSatchelContent();
    manager.open(modal);
    playSfx('satchelOpen');
}
function renderSatchelContent() {
    const content = el('satchelContent');
    if (!content)
        return;
    const html = `
    <div class="satchel-container">
      <div class="satchel-player-section">
        <img src="/Images/Player Icon.png" class="satchel-player-img" alt="Player">
        <div class="satchel-player-stats">
          <h3>${state.playerName}</h3>
          <div class="stat-row"><span>❤️ Health</span><span>${state.health}/${100 + (relicBonuses.value.health || 0)}</span></div>
          <div class="stat-row"><span>🌀 Will</span><span>${state.will}/${state.maxWill}</span></div>
          <div class="stat-row"><span>⚔️ Relic Bonuses</span><span>+${relicBonuses.value.summonChance || 0}% Summon</span></div>
        </div>
      </div>
      <div class="satchel-tabs">
        <button class="satchel-tab ${currentTab === 'inventory' ? 'active' : ''}" data-tab="inventory">🎒 Inventory</button>
        <button class="satchel-tab ${currentTab === 'relics' ? 'active' : ''}" data-tab="relics">💎 Relics</button>
      </div>
      <div id="satchelTabContent" class="satchel-tab-content"></div>
    </div>
  `;
    content.innerHTML = html;
    content.querySelectorAll('.satchel-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            currentTab = e.target.dataset.tab;
            renderSatchelContent();
        });
    });
    renderTabContent();
}
function renderTabContent() {
    const container = el('satchelTabContent');
    if (!container)
        return;
    if (currentTab === 'inventory') {
        const ings = ingredients.value;
        const craft = crafted.value;
        container.innerHTML = `
      <div class="inventory-grid">
        <div class="inventory-section">
          <h4>🌿 Ingredients</h4>
          ${Object.entries(ings).map(([k, v]) => `<div class="inventory-item"><span>${formatName(k)}</span><span>${v}</span></div>`).join('')}
        </div>
        <div class="inventory-section">
          <h4>⚗️ Crafted</h4>
          ${Object.entries(craft).map(([k, v]) => `<div class="inventory-item"><span>${formatName(k)}</span><span>${v}</span></div>`).join('')}
        </div>
      </div>
    `;
    }
    else {
        const owned = ownedRelics.value;
        const equipped = equippedRelics.value;
        container.innerHTML = `
      <div class="relics-container">
        <div class="relics-equipped">
          <h4>Equipped Relics (${equipped.filter(r => r).length}/${relicSlots})</h4>
          <div class="relic-slots">
            ${equipped.map((id, idx) => `
              <div class="relic-slot ${id ? 'filled' : ''}" data-slot="${idx}">
                ${id ? `<img src="${getRelicById(id)?.image}" alt="${getRelicById(id)?.name}">` : '<span>Empty</span>'}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="relics-owned">
          <h4>Owned Relics</h4>
          <div class="relics-grid">
            ${owned.map(id => {
            const relic = getRelicById(id);
            return relic ? `
                <div class="relic-card" data-relic-id="${id}">
                  <img src="${relic.image}" alt="${relic.name}">
                  <div class="relic-info">
                    <strong>${relic.name}</strong>
                    <p>${relic.description}</p>
                    <p style="font-size:0.65rem; opacity:0.8;">${relic.lore}</p>
                    <button class="craft-btn equip-relic-btn" data-id="${id}">Equip</button>
                  </div>
                </div>
              ` : '';
        }).join('')}
            ${owned.length === 0 ? '<p style="color:#a09080; padding:20px; text-align:center;">No relics found. Explore the Undercrypt to discover them.</p>' : ''}
          </div>
        </div>
      </div>
    `;
        container.querySelectorAll('.relic-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const slotIdx = parseInt(slot.dataset.slot);
                if (equippedRelics.value[slotIdx]) {
                    unequipRelic(slotIdx);
                    addLog('Relic unequipped.', false, 'player');
                    renderTabContent();
                }
            });
        });
        container.querySelectorAll('.equip-relic-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const relicId = btn.dataset.id;
                for (let i = 0; i < relicSlots; i++) {
                    if (!equippedRelics.value[i]) {
                        equipRelic(relicId, i);
                        addLog(`${getRelicById(relicId)?.name} equipped.`, false, 'player');
                        renderTabContent();
                        return;
                    }
                }
                addLog('No empty relic slots.', true);
            });
        });
    }
}
function formatName(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}
