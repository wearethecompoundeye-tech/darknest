// js/ui/grimoire.ts – Modern card collection & loadout management
// Improvements: rarity/aspect filtering, clear stats layout, responsive grid, keyboard nav

import { effect } from '@preact/signals-core';
import {
  ownedCards, equippedEntitySlots, equippedSpellSlots, equippedEnhancementSlots, equippedLandSlots,
  maxEntitySlots, maxSpellSlots, maxEnhancementSlots, maxLandSlots,
  equipCard, unequipCard, getEquippedCards, getCardQuantity, getCardEnhancementLevel,
  mergeDuplicate, hasCard, getEntityCombatStats, getEquippedEntitiesEnhanced
} from '../core/state-signals.js';
import { allCards, getCardById, type Card, type CardType, type CardRarity, type EntityStats, type SpellStats } from '../data/cards.js';
import { el } from '../core/dom-helper.js';
import { playSfx } from '../audio/sfx.js';
import { addLog } from './log-manager.js';
import { getEnhancedStats, checkForCombos, getAspectSynergyBonus } from '../systems/card-progression.js';

// ---------- State ----------
let modal: HTMLDivElement | null = null;
let selectedCardId: string | null = null;
let currentTypeFilter: CardType | 'all' = 'all';
let currentRarityFilter: CardRarity | 'all' = 'all';
let currentAspectFilter: string | 'all' = 'all';

// ---------- Public API ----------
export function openGrimoire(): void {
  if (modal) return;
  modal = buildModal();
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  renderContent();
  playSfx('tomeOpen');
  // Focus trap
  (modal.querySelector('.grimoire-body') as HTMLElement)?.focus();
}

// ---------- Modal structure ----------
function buildModal(): HTMLDivElement {
  const m = document.createElement('div');
  m.className = 'modal';
  m.id = 'grimoireModal';
  m.setAttribute('role', 'dialog');
  m.setAttribute('aria-label', 'Grimoire – Card Collection');
  m.style.cssText = 'display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:5000; justify-content:center; align-items:center;';
  m.innerHTML = `
    <div class="grimoire-body" tabindex="0" style="max-width:1300px; width:95%; max-height:90vh; background:#0a0508; border:1px solid #c8b890; border-radius:28px; padding:24px; display:flex; flex-direction:column; outline:none; box-shadow:0 0 40px rgba(200,180,120,0.3);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="color:#e0d0b0; margin:0; font-family:'Cinzel',serif;">📖 GRIMOIRE</h2>
        <button class="close-modal craft-btn" style="padding:8px 24px; background:#3a2a1a; border:1px solid #d4af37; color:#e0d8cc; border-radius:20px; cursor:pointer;">✕ Close</button>
      </div>
      <div style="display:flex; gap:20px; flex:1; overflow:hidden;">
        <!-- Card Collection Panel -->
        <div style="flex:3; display:flex; flex-direction:column; overflow:hidden;">
          <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; align-items:center;">
            <select id="grimFilterType" class="grim-filter" style="background:#1c120c; border:1px solid #b8a070; color:#f0e8e0; padding:8px 16px; border-radius:24px;">
              <option value="all">All Types</option>
              <option value="entity">Entities</option>
              <option value="spell">Spells</option>
              <option value="enhancement">Enhancements</option>
              <option value="land">Lands</option>
            </select>
            <select id="grimFilterRarity" class="grim-filter" style="background:#1c120c; border:1px solid #b8a070; color:#f0e8e0; padding:8px 16px; border-radius:24px;">
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
            <select id="grimFilterAspect" class="grim-filter" style="background:#1c120c; border:1px solid #b8a070; color:#f0e8e0; padding:8px 16px; border-radius:24px;">
              <option value="all">All Aspects</option>
              <option value="Void">Void</option>
              <option value="Fire">Fire</option>
              <option value="Earth">Earth</option>
              <option value="Air">Air</option>
              <option value="Water">Water</option>
              <option value="Life">Life</option>
              <option value="Death">Death</option>
            </select>
            <span id="cardCount" style="color:#d0c0a0; font-size:0.85rem; margin-left:auto;"></span>
          </div>
          <div id="grimoireGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); gap:16px; overflow-y:auto; padding-right:4px;"></div>
        </div>
        <!-- Loadout & Selected Card Panel -->
        <div style="flex:1.5; display:flex; flex-direction:column; gap:20px; overflow-y:auto;">
          <div style="background:rgba(12,6,18,0.6); border:1px solid #b8a070; border-radius:20px; padding:16px;">
            <h4 style="color:#e0d0b0; margin:0 0 12px;">Loadout</h4>
            <div id="loadoutPanel"></div>
          </div>
          <div style="background:rgba(12,6,18,0.6); border:1px solid #b8a070; border-radius:20px; padding:16px;">
            <h4 style="color:#e0d0b0; margin:0 0 12px;">Selected Card</h4>
            <div id="selectedCardPanel" style="min-height:200px; max-height:360px; overflow-y:auto;"></div>
          </div>
          <div style="background:rgba(12,6,18,0.6); border:1px solid #b8a070; border-radius:20px; padding:16px;">
            <h4 style="color:#e0d0b0; margin:0 0 12px;">Active Combos</h4>
            <div id="activeCombosPanel"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  // Event listeners
  m.querySelector('.close-modal')!.addEventListener('click', closeGrimoire);
  m.addEventListener('click', (e) => { if (e.target === m) closeGrimoire(); });
  document.addEventListener('keydown', handleKeydown);
  return m;
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && modal) { closeGrimoire(); }
}

function closeGrimoire(): void {
  if (modal) { modal.remove(); modal = null; selectedCardId = null; playSfx('tomeClose'); document.removeEventListener('keydown', handleKeydown); }
}

// ---------- Render ----------
function renderContent(): void {
  const grid = document.getElementById('grimoireGrid');
  if (!grid) return;

  currentTypeFilter = (document.getElementById('grimFilterType') as HTMLSelectElement).value as CardType | 'all';
  currentRarityFilter = (document.getElementById('grimFilterRarity') as HTMLSelectElement).value as CardRarity | 'all';
  currentAspectFilter = (document.getElementById('grimFilterAspect') as HTMLSelectElement).value as string | 'all';

  let filtered: (Card & {quantity:number; enhancementLevel:number})[] = [];
  ownedCards.value.forEach(oc => {
    const card = getCardById(oc.cardId);
    if (!card) return;
    if (currentTypeFilter !== 'all' && card.type !== currentTypeFilter) return;
    if (currentRarityFilter !== 'all' && card.rarity !== currentRarityFilter) return;
    if (currentAspectFilter !== 'all' && card.aspect !== currentAspectFilter) return;
    filtered.push({ ...card, quantity: oc.quantity, enhancementLevel: oc.enhancementLevel });
  });

  (document.getElementById('cardCount') as HTMLElement).textContent = `${filtered.length} cards`;
  grid.innerHTML = '';
  filtered.forEach(card => grid.appendChild(createCardElement(card)));

  renderLoadoutPanel();
  renderSelectedPanel();
  renderComboPanel();

  // Filter change listeners
  ['grimFilterType','grimFilterRarity','grimFilterAspect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onchange = () => { selectedCardId = null; renderContent(); };
  });
}

// ---------- Card Element ----------
function createCardElement(card: Card & {quantity:number; enhancementLevel:number}): HTMLElement {
  const div = document.createElement('div');
  div.className = `grimoire-card card-${card.rarity}`;
  div.style.cssText = 'position:relative; cursor:pointer; border-radius:12px; overflow:visible; aspect-ratio:3/4; background:#1c120c; transition:transform 0.15s, box-shadow 0.15s;';
  div.setAttribute('role', 'button');
  div.setAttribute('aria-label', `${card.name} (${card.quantity}x)`);

  // Art + frame
  const inner = document.createElement('div');
  inner.style.cssText = 'position:relative; width:100%; height:100%; border-radius:10px; overflow:hidden;';
  inner.innerHTML = `<img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:1;"><img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:2; pointer-events:none;">`;
  div.appendChild(inner);

  // Quantity badge
  const qty = document.createElement('div');
  qty.style.cssText = 'position:absolute; top:4px; left:4px; background:rgba(0,0,0,0.75); padding:2px 8px; border-radius:20px; font-size:0.7rem; color:#f0e8e0; z-index:3;';
  qty.textContent = `${card.quantity}x`;
  div.appendChild(qty);

  // Enhancement badge
  if (card.enhancementLevel > 0) {
    const enh = document.createElement('div');
    enh.style.cssText = 'position:absolute; top:4px; right:4px; background:rgba(212,175,55,0.9); padding:2px 6px; border-radius:20px; font-size:0.6rem; color:#000; font-weight:bold; z-index:3;';
    enh.textContent = `+${card.enhancementLevel}`;
    div.appendChild(enh);
  }

  // Stats overlay for entities
  if (card.type === 'entity') {
    const stats = getEntityCombatStats(card.id) || card.stats as EntityStats;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute; bottom:4px; left:4px; right:4px; background:rgba(0,0,0,0.8); padding:4px; border-radius:8px; text-align:center; font-size:0.65rem; color:#e0d8cc; z-index:3;';
    overlay.innerHTML = `❤️${stats.hp} ⚔️${stats.atk} 🛡️${stats.def} ⚡${stats.init}`;
    div.appendChild(overlay);
  }

  div.addEventListener('click', () => { selectedCardId = card.id; renderContent(); playSfx('uiClick'); });
  div.addEventListener('dblclick', (e) => { e.stopPropagation(); showFullArt(card); });
  div.addEventListener('mouseenter', () => { div.style.transform = 'translateY(-2px)'; div.style.boxShadow = '0 6px 16px rgba(200,180,120,0.35)'; });
  div.addEventListener('mouseleave', () => { div.style.transform = ''; div.style.boxShadow = ''; });
  return div;
}

function showFullArt(card: Card): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.9); backdrop-filter:blur(12px); z-index:6000; display:flex; align-items:center; justify-content:center; cursor:pointer;';
  overlay.innerHTML = `<img src="${card.image}" style="max-width:90vw; max-height:90vh; border-radius:20px; box-shadow:0 0 50px rgba(200,180,120,0.5); border:2px solid #c8b890;">`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

// ---------- Loadout Panel (corrected) ----------
function renderLoadoutPanel(): void {
  const panel = document.getElementById('loadoutPanel');
  if (!panel) return;

  const slotArrays: {label:string; slots: string[]; max:number; type:CardType}[] = [
    {label:'Entities', slots: equippedEntitySlots.value, max: maxEntitySlots.value, type:'entity'},
    {label:'Spells',   slots: equippedSpellSlots.value, max: maxSpellSlots.value, type:'spell'},
    {label:'Enhancements', slots: equippedEnhancementSlots.value, max: maxEnhancementSlots.value, type:'enhancement'},
    {label:'Lands',   slots: equippedLandSlots.value, max: maxLandSlots.value, type:'land'},
  ];
  let html = '';
  slotArrays.forEach(({label,slots,max,type}) => {
    const filled = slots.filter(id => id).length;
    html += `<div style="margin-bottom:12px;"><span style="color:#d0c0a0; font-size:0.75rem;">${label} (${filled}/${max})</span><div style="display:flex; gap:6px; margin-top:4px; flex-wrap:wrap;">`;
    for (let i=0; i<max; i++) {
      const id = slots[i] || '';
      const card = id ? getCardById(id) : null;
      html += `<div class="loadout-slot" data-type="${type}" data-index="${i}" style="width:52px; height:69px; background:#1c120c; border:1px solid ${card?'#c8b890':'#5a4a3a'}; border-radius:8px; cursor:pointer; overflow:hidden; position:relative;">`;
      if (card) {
        html += `<img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:1;"><img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:2; pointer-events:none;">`;
      } else {
        html += `<span style="display:flex; align-items:center; justify-content:center; height:100%; color:#5a4a3a; font-size:1.2rem;">+</span>`;
      }
      html += `</div>`;
    }
    html += `</div></div>`;
  });
  panel.innerHTML = html;
  panel.querySelectorAll('.loadout-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const type = slot.getAttribute('data-type') as CardType;
      const idx = parseInt(slot.getAttribute('data-index')!);
      if (selectedCardId) {
        const card = getCardById(selectedCardId);
        if (card && card.type === type) {
          equipCard(selectedCardId, type, idx);
          renderContent();
          playSfx('equipRelic');
        } else addLog(`Slot requires ${type} card.`, true);
      } else addLog('Select a card first.', true);
    });
  });
}

// ---------- Selected Card Panel ----------
function renderSelectedPanel(): void {
  const panel = document.getElementById('selectedCardPanel');
  if (!panel) return;
  if (!selectedCardId) {
    panel.innerHTML = '<p style="color:#d0c0a0; text-align:center;">Select a card.<br><small>Double-click for full art</small></p>';
    return;
  }
  const card = getCardById(selectedCardId);
  if (!card) return;
  const qty = getCardQuantity(selectedCardId);
  const enh = getCardEnhancementLevel(selectedCardId);
  const stats = card.type === 'entity' ? getEntityCombatStats(selectedCardId) : null;

  let statsHtml = '';
  if (stats) {
    statsHtml = `<div style="background:rgba(0,0,0,0.3); border-radius:8px; padding:8px; margin-top:8px;">`;
    statsHtml += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:0.75rem;">`;
    statsHtml += `<span>❤️ HP: ${stats.hp}</span><span>⚔️ ATK: ${stats.atk}</span>`;
    statsHtml += `<span>🛡️ DEF: ${stats.def}</span><span>✨ RES: ${stats.res}</span>`;
    statsHtml += `<span>👟 SPD: ${stats.spd}</span><span>🦊 CUN: ${stats.cun}</span>`;
    statsHtml += `<span>⚡ INIT: ${stats.init}</span><span>💚 Loyalty: ${stats.loyalty}</span>`;
    statsHtml += `</div></div>`;
  }

  const mergeBtn = (qty>=2 && enh<3) ? `<button id="mergeBtn" class="craft-btn" style="margin-top:8px; width:100%;">Merge (+1)</button>` : '';

  panel.innerHTML = `
    <div style="display:flex; gap:12px;">
      <div style="position:relative; width:90px; aspect-ratio:3/4; border-radius:10px; overflow:hidden; flex-shrink:0;">
        <img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:1;">
        <img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:2; pointer-events:none;">
      </div>
      <div style="flex:1;">
        <h4 style="margin:0; color:#e0d0b0;">${card.name}</h4>
        <p style="font-size:0.7rem; color:#d0c0a0; margin:4px 0;">${card.type} · ${card.rarity} · ${card.aspect}</p>
        <p style="margin:0;">Qty: ${qty} | Enhancement: +${enh}</p>
        ${statsHtml}
        ${mergeBtn}
      </div>
    </div>
  `;
  if (mergeBtn) panel.querySelector('#mergeBtn')!.addEventListener('click', () => { if (mergeDuplicate(selectedCardId!)) { playSfx('card_enhance'); renderContent(); } });
}

// ---------- Combo Panel ----------
function renderComboPanel(): void {
  const panel = document.getElementById('activeCombosPanel');
  if (!panel) return;
  const combos = checkForCombos();
  const synergy = getAspectSynergyBonus();
  let html = '';
  if (combos.length > 0) {
    html += '<div style="margin-bottom:8px;"><span style="color:#d4af37;">✨ Combos</span>';
    combos.forEach(c => {
      const names = c.cardIds.map(id => getCardById(id)?.name || id).join(' + ');
      html += `<p style="font-size:0.7rem; margin:2px 0; color:#c8b890;">${names}: ${c.effect}</p>`;
    });
    html += '</div>';
  }
  if (Object.keys(synergy).length > 0) {
    html += '<div><span style="color:#7ea04b;">🌀 Synergy</span>';
    if (synergy.hp) html += `<p style="font-size:0.7rem; margin:2px 0;">+${synergy.hp} HP</p>`;
    if (synergy.atk) html += `<p style="font-size:0.7rem; margin:2px 0;">+${synergy.atk} ATK</p>`;
    if (synergy.def) html += `<p style="font-size:0.7rem; margin:2px 0;">+${synergy.def} DEF</p>`;
    if (synergy.spd) html += `<p style="font-size:0.7rem; margin:2px 0;">+${synergy.spd} SPD</p>`;
    if (synergy.cun) html += `<p style="font-size:0.7rem; margin:2px 0;">+${synergy.cun} CUN</p>`;
    html += '</div>';
  }
  panel.innerHTML = html || '<p style="color:#a09080; font-size:0.8rem;">No active combos or synergies.</p>';
}
