// js/ui/satchel.ts – Fully integrated, production‑ready satchel UI

import {
  state, ingredients, crafted, ownedRelics, equippedRelics,
  equipRelic, unequipRelic, relicBonuses
} from '../core/state-signals.js';
import { relics, relicSlots, getRelicById } from '../data/relics.js';
import { el } from '../core/dom-helper.js';
import { playSfx } from '../audio/sfx.js';
import { addLog } from './log-manager.js';

let currentTab: 'inventory' | 'relics' = 'inventory';
let searchQuery = '';
let activeFilter = 'all';
let filteredRelics = [...relics];

// ── Inject production UI styles once ──────────────────────────
let stylesInjected = false;
function injectSatchelStyles(): void {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.id = 'satchel-ui-styles';
  style.textContent = `
    .satchel-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .satchel-player-section {
      display: flex;
      padding: 20px;
      background: var(--primary-dark);
      border-bottom: 1px solid var(--border-color);
    }
    .satchel-player-img {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 2px solid var(--accent-gold);
      margin-right: 20px;
      background: var(--primary-medium);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
    }
    .satchel-player-stats {
      flex: 1;
    }
    .satchel-player-stats h3 {
      color: var(--accent-gold);
      margin-bottom: 15px;
      font-size: 22px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(100, 100, 150, 0.2);
    }
    .stat-row:last-child {
      border-bottom: none;
    }
    .stat-row span:first-child {
      color: var(--text-secondary);
    }
    .stat-row span:last-child {
      color: var(--accent-gold);
      font-weight: 600;
    }
    .satchel-tabs {
      display: flex;
      background: var(--primary-dark);
      border-bottom: 1px solid var(--border-color);
    }
    .satchel-tab {
      flex: 1;
      padding: 15px;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      text-align: center;
    }
    .satchel-tab.active {
      color: var(--accent-gold);
    }
    .satchel-tab.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: var(--accent-gold);
    }
    .satchel-tab:hover:not(.active) {
      background: var(--hover-bg);
    }
    .satchel-tab-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    .inventory-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .inventory-section {
      background: var(--card-bg);
      border-radius: 10px;
      padding: 15px;
      border: 1px solid var(--border-color);
    }
    .inventory-section h4 {
      color: var(--accent-gold);
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-color);
    }
    .inventory-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(100, 100, 150, 0.1);
    }
    .inventory-item:last-child {
      border-bottom: none;
    }
    .relics-container {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 20px;
      height: 100%;
    }
    .relics-equipped {
      display: flex;
      flex-direction: column;
    }
    .relics-equipped h4 {
      color: var(--accent-gold);
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-color);
    }
    .relic-slots {
      display: grid;
      grid-template-columns: repeat(${relicSlots}, 1fr);
      gap: 10px;
      flex: 1;
    }
    .relic-slot {
      aspect-ratio: 1/1;
      background: var(--card-bg);
      border: 2px dashed var(--border-color);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }
    .relic-slot.filled {
      border: 2px solid var(--accent-gold);
      background: rgba(255, 215, 0, 0.1);
    }
    .relic-slot img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .relic-slot span {
      color: var(--text-secondary);
      font-size: 12px;
      text-align: center;
      padding: 5px;
    }
    .relic-slot:hover {
      background: var(--hover-bg);
      transform: translateY(-3px);
    }
    .relics-owned {
      display: flex;
      flex-direction: column;
    }
    .relics-owned h4 {
      color: var(--accent-gold);
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-color);
    }
    .relics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    }
    .relic-card {
      background: var(--card-bg);
      border-radius: 10px;
      border: 1px solid var(--border-color);
      overflow: hidden;
      transition: all 0.3s;
      cursor: pointer;
    }
    .relic-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      border-color: var(--accent-gold);
    }
    .relic-card img {
      width: 100%;
      height: 150px;
      object-fit: cover;
      border-bottom: 1px solid var(--border-color);
    }
    .relic-info {
      padding: 15px;
    }
    .relic-info strong {
      color: var(--accent-gold);
      display: block;
      margin-bottom: 8px;
    }
    .relic-info p {
      font-size: 13px;
      line-height: 1.4;
      margin-bottom: 10px;
      color: var(--text-secondary);
    }
    .relic-info p:last-child {
      margin-bottom: 0;
    }
    .craft-btn {
      width: 100%;
      padding: 8px;
      background: var(--primary-dark);
      border: 1px solid var(--border-color);
      border-radius: 5px;
      color: var(--accent-gold);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .craft-btn:hover {
      background: var(--accent-gold);
      color: var(--primary-dark);
    }
    .search-bar {
      display: flex;
      margin-bottom: 20px;
      background: var(--primary-dark);
      border-radius: 30px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    .search-bar input {
      flex: 1;
      padding: 12px 20px;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 16px;
    }
    .search-bar input:focus {
      outline: none;
    }
    .search-bar button {
      background: var(--primary-dark);
      border: none;
      color: var(--text-secondary);
      padding: 0 20px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .search-bar button:hover {
      color: var(--accent-gold);
    }
    .filter-buttons {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 8px 15px;
      background: var(--primary-dark);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-btn.active, .filter-btn:hover {
      background: var(--accent-gold);
      color: var(--primary-dark);
      border-color: var(--accent-gold);
    }
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    }
    .inventory-summary {
      display: flex;
      justify-content: space-between;
      padding: 15px;
      background: var(--primary-dark);
      border-radius: 10px;
      margin-bottom: 20px;
      border: 1px solid var(--border-color);
    }
    .summary-item {
      text-align: center;
    }
    .summary-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--accent-gold);
    }
    .summary-label {
      font-size: 12px;
      color: var(--text-secondary);
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// ── Public API ────────────────────────────────────────────────
export function openSatchel(): void {
  const manager = (window as any).modalManager;
  const modal = el('satchelModal');
  if (!modal) return;

  injectSatchelStyles();
  renderSatchelContent();

  // Ensure the close button works
  const closeBtn = modal.querySelector('#closeSatchel');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => manager.close(modal), { once: true });
  }

  manager.open(modal);
  playSfx('satchelOpen');
}

// ── Content rendering ──────────────────────────────────────────
function renderSatchelContent(): void {
  const content = el('satchelContent');
  if (!content) return;

  const playerName = state.playerName || 'Survivor';
  const playerHealth = state.health;
  const playerMaxHealth = 100 + (relicBonuses.value.health || 0);
  const playerWill = state.will;
  const maxWill = state.maxWill;
  const summonBonus = relicBonuses.value.summonChance || 0;
  const playerIconUrl = `${import.meta.env.BASE_URL}Images/Player Icon.png`;

  const html = `
    <div class="satchel-container">
      <div class="satchel-player-section">
        <img src="${playerIconUrl}" class="satchel-player-img" alt="Player">
        <div class="satchel-player-stats">
          <h3>${playerName}</h3>
          <div class="stat-row"><span>❤️ Health</span><span>${playerHealth}/${playerMaxHealth}</span></div>
          <div class="stat-row"><span>🌀 Will</span><span>${playerWill}/${maxWill}</span></div>
          <div class="stat-row"><span>⚔️ Relic Bonuses</span><span>+${summonBonus}% Summon</span></div>
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

  // Tab switching
  content.querySelectorAll('.satchel-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      currentTab = (e.target as HTMLElement).dataset.tab as 'inventory' | 'relics';
      renderSatchelContent();
    });
  });

  renderTabContent();
}

function renderTabContent(): void {
  const container = document.getElementById('satchelTabContent');
  if (!container) return;

  if (currentTab === 'inventory') {
    renderInventoryTab(container);
  } else {
    renderRelicsTab(container);
  }
}

// ── Inventory tab ──────────────────────────────────────────────
function renderInventoryTab(container: HTMLElement): void {
  const ings = ingredients.value;
  const craft = crafted.value;

  container.innerHTML = `
    <div class="inventory-summary">
      <div class="summary-item">
        <div class="summary-value">${Object.values(ings).reduce((a, b) => a + b, 0)}</div>
        <div class="summary-label">Ingredients</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${Object.values(craft).reduce((a, b) => a + b, 0)}</div>
        <div class="summary-label">Crafted</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${Object.keys(ings).length}</div>
        <div class="summary-label">Unique Types</div>
      </div>
    </div>
    <div class="search-bar">
      <input type="text" id="inventorySearch" placeholder="Search ingredients...">
      <button id="inventorySearchBtn"><span>🔍</span></button>
    </div>
    <div class="inventory-grid">
      <div class="inventory-section">
        <h4>🌿 Ingredients</h4>
        ${Object.entries(ings).map(([k, v]) => `
          <div class="inventory-item">
            <span>${formatName(k)}</span>
            <span>${v}</span>
          </div>
        `).join('') || '<p class="empty-state">No ingredients collected yet.</p>'}
      </div>
      <div class="inventory-section">
        <h4>⚗️ Crafted</h4>
        ${Object.entries(craft).map(([k, v]) => `
          <div class="inventory-item">
            <span>${formatName(k)}</span>
            <span>${v}</span>
          </div>
        `).join('') || '<p class="empty-state">Nothing crafted yet.</p>'}
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#inventorySearch') as HTMLInputElement;
  const searchBtn = container.querySelector('#inventorySearchBtn');
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      // Simple client‑side filter (highlight items containing the query)
      const query = searchInput.value.toLowerCase();
      container.querySelectorAll('.inventory-item').forEach(el => {
        const text = el.textContent?.toLowerCase() || '';
        (el as HTMLElement).style.display = text.includes(query) ? '' : 'none';
      });
    });
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') searchBtn.click();
    });
  }
}

// ── Relics tab ─────────────────────────────────────────────────
function renderRelicsTab(container: HTMLElement): void {
  const owned = ownedRelics.value;
  const equipped = equippedRelics.value;

  // Apply filters
  filteredRelics = relics.filter(relic => {
    if (activeFilter === 'equipped') return equipped.includes(relic.id);
    if (activeFilter === 'unequipped') return owned.includes(relic.id) && !equipped.includes(relic.id);
    return owned.includes(relic.id); // default: show owned
  });
  // Apply search
  if (searchQuery) {
    filteredRelics = filteredRelics.filter(relic =>
      relic.name.toLowerCase().includes(searchQuery) ||
      relic.description.toLowerCase().includes(searchQuery)
    );
  }

  container.innerHTML = `
    <div class="filter-buttons">
      <button class="filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">All Owned</button>
      <button class="filter-btn ${activeFilter === 'equipped' ? 'active' : ''}" data-filter="equipped">Equipped</button>
      <button class="filter-btn ${activeFilter === 'unequipped' ? 'active' : ''}" data-filter="unequipped">Unequipped</button>
    </div>
    <div class="search-bar">
      <input type="text" id="relicSearch" placeholder="Search relics...">
      <button id="relicSearchBtn"><span>🔍</span></button>
    </div>
    <div class="relics-container">
      <div class="relics-equipped">
        <h4>Equipped Relics (${equipped.filter(r => r).length}/${relicSlots})</h4>
        <div class="relic-slots">
          ${Array.from({ length: relicSlots }, (_, idx) => {
            const relicId = equipped[idx] || null;
            const relic = relicId ? getRelicById(relicId) : null;
            return `
              <div class="relic-slot ${relic ? 'filled' : ''}" data-slot="${idx}">
                ${relic
                  ? `<img src="${relic.image}" alt="${relic.name}">`
                  : '<span>Empty</span>'}
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="relics-owned">
        <h4>Owned Relics</h4>
        <div class="relics-grid">
          ${filteredRelics.map(relic => `
            <div class="relic-card">
              <img src="${relic.image}" alt="${relic.name}">
              <div class="relic-info">
                <strong>${relic.name}</strong>
                <p>${relic.description}</p>
                <p style="font-size:0.65rem; opacity:0.8;">${relic.lore}</p>
                <button class="craft-btn equip-relic-btn" data-relic-id="${relic.id}">Equip</button>
              </div>
            </div>
          `).join('')}
          ${filteredRelics.length === 0 ? '<p class="empty-state">No relics match your criteria.</p>' : ''}
        </div>
      </div>
    </div>
  `;

  // Filter buttons
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeFilter = (e.target as HTMLElement).dataset.filter!;
      renderTabContent();
    });
  });

  // Search
  const searchInput = container.querySelector('#relicSearch') as HTMLInputElement;
  const searchBtn = container.querySelector('#relicSearchBtn');
  if (searchBtn && searchInput) {
    const applySearch = () => {
      searchQuery = searchInput.value.toLowerCase();
      renderTabContent();
    };
    searchBtn.addEventListener('click', applySearch);
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') applySearch();
    });
  }

  // Equip button
  container.querySelectorAll('.equip-relic-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const relicId = (btn as HTMLElement).dataset.relicId!;
      // Find first empty slot
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

  // Slot click to unequip
  container.querySelectorAll('.relic-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const slotIdx = parseInt((slot as HTMLElement).dataset.slot!);
      if (equippedRelics.value[slotIdx]) {
        unequipRelic(slotIdx);
        addLog('Relic unequipped.', false, 'player');
        renderTabContent();
      }
    });
  });
}

// ── Helper ─────────────────────────────────────────────────────
function formatName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase());
}