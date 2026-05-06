// js/ui/tome.ts
import { state, knownRunes, ingredients } from '../core/state-signals.js';
import { el } from '../core/dom-helper.js';
import { playSfx } from '../audio/sfx.js';
import { runeData } from '../data/runes.js';
import { relics } from '../data/relics.js';
// Settings UI functions (imported from main or redefined)
let sfxEnabled = true;
let musicEnabled = true;
let masterVol = 0.7;
let sfxVol = 0.7;
let musicVol = 0.4;
export function openTome() {
    const manager = window.modalManager;
    const modal = el('tomeModal');
    if (!modal)
        return;
    renderTome('guidance');
    manager.open(modal);
    playSfx('tomeOpen');
    document.querySelectorAll('.tome-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            if (tabName)
                renderTome(tabName);
        });
    });
}
function renderTome(tab) {
    const content = el('tomeContent');
    if (!content)
        return;
    document.querySelectorAll('.tome-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tome-tab[data-tab="${tab}"]`)?.classList.add('active');
    let html = '';
    switch (tab) {
        case 'guidance':
            html = renderGuidanceTab();
            break;
        case 'patterns':
            html = renderPatternsTab();
            break;
        case 'entities':
            html = renderEntitiesTab();
            break;
        case 'ingredients':
            html = renderIngredientsTab();
            break;
        case 'rituals':
            html = renderRitualsTab();
            break;
        case 'lore':
            html = renderLoreTab();
            break;
        case 'relics':
            html = renderRelicsTab();
            break;
        case 'settings':
            html = renderSettingsTab();
            break;
        default:
            html = '<p>Select a tab.</p>';
    }
    content.innerHTML = html;
    if (tab === 'settings') {
        attachSettingsEvents();
    }
}
function renderGuidanceTab() {
    return `
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
}
function renderPatternsTab() {
    const known = knownRunes.value;
    let html = `<h4>ᚠ Known Patterns (${known.length}/${runeData.length})</h4>`;
    runeData.forEach(rune => {
        const unlocked = known.includes(rune.name);
        html += `<div class="tome-entry ${unlocked ? 'unlocked' : 'locked'}">`;
        html += `<strong>${rune.name}</strong> — ${rune.meaning}`;
        html += unlocked ? `<p>${rune.effect}</p>` : `<p>??? — Discover this pattern.</p>`;
        html += `</div>`;
    });
    return html;
}
function renderEntitiesTab() {
    return `
    <h4>👹 Entity Bestiary</h4>
    <p>Summon entities from the void. Each has unique stats and abilities.</p>
    <p><em>Discover more by summoning and exploring.</em></p>
  `;
}
function renderIngredientsTab() {
    const ings = ingredients.value;
    return `
    <h4>🌿 Ingredients</h4>
    ${Object.entries(ings).map(([k, v]) => `<div class="stat-row"><span>${k}</span><span>${v}</span></div>`).join('')}
  `;
}
function renderRitualsTab() {
    return `
    <h4>🔮 Rituals</h4>
    <p><strong>Summon Entity:</strong> Requires Powder of Warding, Phial of Subjugation, and an active pattern.</p>
    <p><strong>Trace Circle:</strong> Restores Circle Power. Click sparks in sequence.</p>
    <p><strong>Pay Tithe:</strong> Spend 5 Ichor daily to reduce Kalgoth's Noose.</p>
  `;
}
function renderLoreTab() {
    return `
    <h4>📜 Lore</h4>
    <p>Orbex, the seed of balance, was shattered by Kalgoth's betrayal. The world inverted into the Undercrypt. You, the Void Acolyte, survived with a fragment of Orbex embedded in your soul. Reclaim the six fragments, purify the Hollow Acolytes, and banish Kalgoth.</p>
  `;
}
function renderRelicsTab() {
    const owned = state.ownedRelics || [];
    return `
    <h4>💎 Relics</h4>
    <div class="relics-grid">
      ${relics.map(r => {
        const unlocked = owned.includes(r.id);
        return `
          <div class="relic-card ${unlocked ? '' : 'locked'}">
            <img src="${r.image}" alt="${r.name}">
            <div class="relic-info">
              <strong>${unlocked ? r.name : '???'}</strong>
              <p>${unlocked ? r.description : 'Undiscovered'}</p>
              <p style="font-size:0.65rem;">${unlocked ? r.lore : ''}</p>
            </div>
          </div>
        `;
    }).join('')}
    </div>
  `;
}
function renderSettingsTab() {
    return `
    <h3>⚙️ SETTINGS</h3>
    <div style="margin:15px 0;">
      <label>Master Volume <span id="masterVolLabel">70%</span></label>
      <input type="range" id="masterVolumeSlider" min="0" max="1" step="0.01" value="0.7">
    </div>
    <div style="margin:15px 0;">
      <label>SFX Volume <span id="sfxVolLabel">70%</span></label>
      <input type="range" id="sfxVolumeSlider" min="0" max="1" step="0.01" value="0.7">
    </div>
    <div style="margin:15px 0;">
      <label>Music Volume <span id="musicVolLabel">40%</span></label>
      <input type="range" id="musicVolumeSlider" min="0" max="1" step="0.01" value="0.4">
    </div>
    <div style="display:flex; gap:10px; justify-content:center;">
      <button class="craft-btn" id="muteSfxBtn">🔊 SFX ON</button>
      <button class="craft-btn" id="muteMusicBtn">🎵 MUSIC ON</button>
    </div>
    <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
      <button class="craft-btn" id="toggleWhispBtn">👁️ Whisp ON</button>
      <button class="craft-btn" id="toggleTutorialBtn">📖 Tutorial ON</button>
    </div>
    <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
      <button class="craft-btn" id="settingsSaveBtn">💾 Save</button>
      <button class="craft-btn" id="settingsLoadBtn">📂 Load</button>
    </div>
  `;
}
function attachSettingsEvents() {
    // These functions should be defined globally or imported
    const masterSlider = el('masterVolumeSlider');
    const sfxSlider = el('sfxVolumeSlider');
    const musicSlider = el('musicVolumeSlider');
    // ... attach event listeners matching existing settings logic
    // For brevity, assuming these are wired in main.ts; this tab reuses the same IDs
}
