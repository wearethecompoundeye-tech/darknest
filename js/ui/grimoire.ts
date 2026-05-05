// js/ui/grimoire.ts – Neatly fitted layout, no internal scroll bars on panels

import { effect } from '@preact/signals-core';
import {
  ownedCards, equippedEntitySlots, equippedSpellSlots, equippedEnhancementSlots, equippedLandSlots,
  maxEntitySlots, maxSpellSlots, maxEnhancementSlots, maxLandSlots,
  equipCard, unequipCard, getEquippedCards, getCardQuantity, getCardEnhancementLevel,
  mergeDuplicate, hasCard, getEntityCombatStats, getEquippedEntitiesEnhanced
} from '../core/state-signals.js';
import { allCards, getCardById, type Card, type CardType, type CardRarity, type EntityStats, type SpellStats, type EnhancementStats, type LandStats } from '../data/cards.js';
import { el } from '../core/dom-helper.js';
import { playSfx } from '../audio/sfx.js';
import { addLog } from './log-manager.js';
import { getEnhancedStats, checkForCombos, getAspectSynergyBonus } from '../systems/card-progression.js';

let modal: HTMLDivElement | null = null;
let selectedCardId: string | null = null;
let currentTypeFilter: CardType | 'all' = 'all';
let currentRarityFilter: CardRarity | 'all' = 'all';
let currentAspectFilter: string | 'all' = 'all';

export function openGrimoire(): void {
  if (modal) return;
  modal = buildModal();
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  renderContent();
  playSfx('tomeOpen');
  (modal.querySelector('.grimoire-body') as HTMLElement)?.focus();
}

function buildModal(): HTMLDivElement {
  const m = document.createElement('div');
  m.className = 'modal';
  m.id = 'grimoireModal';
  m.setAttribute('role', 'dialog');
  m.style.cssText = 'display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:5000; justify-content:center; align-items:center;';
  m.innerHTML = `
    <div class="grimoire-body" tabindex="0" style="max-width:1300px; width:95%; height:90vh; background:#0a0508; border:1px solid #c8b890; border-radius:28px; padding:20px 24px; display:flex; flex-direction:column; outline:none; box-shadow:0 0 40px rgba(200,180,120,0.3);">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-shrink:0;">
        <h2 style="color:#e0d0b0; margin:0; font-size:1.4rem;">📖 GRIMOIRE</h2>
        <button class="close-modal craft-btn" style="padding:6px 20px; background:#3a2a1a; border:1px solid #d4af37; color:#e0d8cc; border-radius:20px; cursor:pointer;">✕ Close</button>
      </div>

      <!-- TOP ROW: Large Selected Card (fixed height, no scroll) -->
      <div id="selectedCardContainer" style="margin-bottom:10px; background:rgba(12,6,18,0.6); border:1px solid #b8a070; border-radius:16px; padding:12px 16px; min-height:140px; max-height:200px; flex-shrink:0; overflow:hidden;"></div>

      <!-- BOTTOM ROW: Deck (left) + Loadout/Combos (right) -->
      <div style="display:flex; gap:16px; flex:1; overflow:hidden;">
        <!-- Left: Card Grid -->
        <div style="flex:3; display:flex; flex-direction:column; overflow:hidden;">
          <!-- Filters -->
          <div style="display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap; align-items:center; flex-shrink:0;">
            <select id="grimFilterType" style="background:#1c120c; border:1px solid #b8a070; color:#f0e8e0; padding:5px 12px; border-radius:16px; font-size:0.8rem;">
              <option value="all">All Types</option>
              <option value="entity">Entities</option>
              <option value="spell">Spells</option>
              <option value="enhancement">Enhancements</option>
              <option value="land">Lands</option>
            </select>
            <select id="grimFilterRarity" style="background:#1c120c; border:1px solid #b8a070; color:#f0e8e0; padding:5px 12px; border-radius:16px; font-size:0.8rem;">
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
            <select id="grimFilterAspect" style="background:#1c120c; border:1px solid #b8a070; color:#f0e8e0; padding:5px 12px; border-radius:16px; font-size:0.8rem;">
              <option value="all">All Aspects</option>
              <option value="Void">Void</option>
              <option value="Fire">Fire</option>
              <option value="Earth">Earth</option>
              <option value="Air">Air</option>
              <option value="Water">Water</option>
              <option value="Life">Life</option>
              <option value="Death">Death</option>
            </select>
            <span id="cardCount" style="color:#d0c0a0; font-size:0.8rem; margin-left:auto;"></span>
          </div>
          <!-- Grid (scrollable) -->
          <div id="grimoireGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px,1fr)); gap:12px; overflow-y:auto; flex:1; padding-right:2px;"></div>
        </div>

        <!-- Right: Loadout + Combos -->
        <div style="flex:1.5; display:flex; flex-direction:column; gap:12px; overflow-y:auto;">
          <div style="background:rgba(12,6,18,0.6); border:1px solid #b8a070; border-radius:16px; padding:10px 14px; flex-shrink:0;">
            <h4 style="color:#e0d0b0; margin:0 0 8px; font-size:0.9rem;">Loadout</h4>
            <div id="loadoutPanel"></div>
          </div>
          <div style="background:rgba(12,6,18,0.6); border:1px solid #b8a070; border-radius:16px; padding:10px 14px; flex-shrink:0;">
            <h4 style="color:#e0d0b0; margin:0 0 8px; font-size:0.9rem;">Active Combos</h4>
            <div id="activeCombosPanel"></div>
          </div>
        </div>
      </div>
    </div>
  `;
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

  renderSelectedPanel();
  renderLoadoutPanel();
  renderComboPanel();

  ['grimFilterType','grimFilterRarity','grimFilterAspect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onchange = () => { selectedCardId = null; renderContent(); };
  });
}

function createCardElement(card: Card & {quantity:number; enhancementLevel:number}): HTMLElement {
  const div = document.createElement('div');
  div.className = `grimoire-card card-${card.rarity}`;
  div.style.cssText = 'position:relative; cursor:pointer; border-radius:10px; overflow:visible; aspect-ratio:3/4; background:#1c120c; transition:transform 0.15s, box-shadow 0.15s;';
  div.setAttribute('role', 'button');
  div.setAttribute('aria-label', `${card.name} (${card.quantity}x)`);

  const inner = document.createElement('div');
  inner.style.cssText = 'position:relative; width:100%; height:100%; border-radius:10px; overflow:hidden;';
  inner.innerHTML = `<img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; z-index:1; border-radius:10px;"><img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; z-index:2; pointer-events:none;">`;
  div.appendChild(inner);

  const qty = document.createElement('div');
  qty.style.cssText = 'position:absolute; top:4px; left:4px; background:rgba(0,0,0,0.75); padding:2px 8px; border-radius:20px; font-size:0.7rem; color:#f0e8e0; z-index:3;';
  qty.textContent = `${card.quantity}x`;
  div.appendChild(qty);

  if (card.enhancementLevel > 0) {
    const enh = document.createElement('div');
    enh.style.cssText = 'position:absolute; top:4px; right:4px; background:rgba(212,175,55,0.9); padding:2px 6px; border-radius:20px; font-size:0.6rem; color:#000; font-weight:bold; z-index:3;';
    enh.textContent = `+${card.enhancementLevel}`;
    div.appendChild(enh);
  }

  if (card.type === 'entity') {
    const stats = getEntityCombatStats(card.id) || card.stats as EntityStats;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute; bottom:4px; left:4px; right:4px; background:rgba(0,0,0,0.8); padding:3px; border-radius:6px; text-align:center; font-size:0.6rem; color:#e0d8cc; z-index:3;';
    overlay.innerHTML = `❤️${stats.hp} ⚔️${stats.atk} 🛡️${stats.def} ⚡${stats.init}`;
    div.appendChild(overlay);
  }

  div.addEventListener('click', () => { selectedCardId = card.id; renderContent(); playSfx('uiClick'); });
  div.addEventListener('dblclick', (e) => { e.stopPropagation(); e.preventDefault(); showFullArt(card); });
  div.addEventListener('mouseenter', () => { div.style.transform = 'translateY(-2px)'; div.style.boxShadow = '0 4px 12px rgba(200,180,120,0.3)'; });
  div.addEventListener('mouseleave', () => { div.style.transform = ''; div.style.boxShadow = ''; });
  return div;
}

function showFullArt(card: Card): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.92); backdrop-filter:blur(12px); z-index:10000; display:flex; align-items:center; justify-content:center; cursor:pointer;';
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative; max-width:min(500px, 85vw); max-height:min(667px, 85vh); border-radius:24px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.8), 0 0 80px rgba(200,180,120,0.4);';
  const img = document.createElement('img');
  img.src = card.image;
  img.style.cssText = 'display:block; width:100%; height:auto; border-radius:24px; position:relative; z-index:1;';
  wrapper.appendChild(img);
  const frameImg = document.createElement('img');
  frameImg.src = card.frame;
  frameImg.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; z-index:2; pointer-events:none; border-radius:24px;';
  wrapper.appendChild(frameImg);
  const reflection = document.createElement('div');
  reflection.style.cssText = 'position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.05) 100%); z-index:3; border-radius:24px; pointer-events:none;';
  wrapper.appendChild(reflection);
  overlay.appendChild(wrapper);
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

function renderSelectedPanel(): void {
  const container = document.getElementById('selectedCardContainer');
  if (!container) return;
  if (!selectedCardId) {
    container.innerHTML = '<p style="color:#d0c0a0; text-align:center; padding:20px;">Select a card from the deck below.<br><small>Double-click any card for full‑size view.</small></p>';
    return;
  }
  const card = getCardById(selectedCardId);
  if (!card) return;
  const qty = getCardQuantity(selectedCardId);
  const enh = getCardEnhancementLevel(selectedCardId);

  let statsHtml = '';
  if (card.type === 'entity') {
    const stats = getEntityCombatStats(selectedCardId) || card.stats as EntityStats;
    statsHtml = `<div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:4px; font-size:0.8rem; margin-bottom:8px;">
      <span>❤️ HP: ${stats.hp}</span><span>⚔️ ATK: ${stats.atk}</span><span>🛡️ DEF: ${stats.def}</span><span>✨ RES: ${stats.res}</span>
      <span>👟 SPD: ${stats.spd}</span><span>🦊 CUN: ${stats.cun}</span><span>⚡ INIT: ${stats.init}</span><span>💚 Loyalty: ${stats.loyalty}</span>
    </div>`;
    if (card.abilities && card.abilities.length > 0) {
      statsHtml += `<div style="font-size:0.75rem; color:#c8b890; margin-bottom:8px;">`;
      card.abilities.forEach(a => statsHtml += `<p style="margin:0;"><i>${a.name}:</i> ${a.effect}</p>`);
      statsHtml += `</div>`;
    }
  } else if (card.type === 'spell') {
    const s = card.stats as SpellStats;
    statsHtml = `<div style="font-size:0.85rem; margin-bottom:8px;">
      <p style="margin:2px 0;"><strong>Cost:</strong> ${s.cost} Will</p>
      <p style="margin:2px 0;">${s.effect || ''}</p>
      ${s.damage ? `<p style="margin:2px 0;">💥 Damage: ${s.damage}</p>` : ''}
      ${s.healing ? `<p style="margin:2px 0;">💚 Healing: ${s.healing}</p>` : ''}
      ${s.keywords ? `<p style="margin:2px 0;">🏷️ ${s.keywords.join(', ')}</p>` : ''}
    </div>`;
  } else if (card.type === 'enhancement') {
    statsHtml = `<div style="font-size:0.85rem; margin-bottom:8px;">${(card.stats as EnhancementStats).effect || 'Passive enhancement.'}</div>`;
  } else if (card.type === 'land') {
    const l = card.stats as LandStats;
    statsHtml = `<div style="font-size:0.85rem; margin-bottom:8px;">
      ${l.generation ? `<p style="margin:2px 0;">+${l.generation.amount} ${l.generation.resource}/day</p>` : ''}
      ${l.effect ? `<p style="margin:2px 0;">${l.effect}</p>` : ''}
    </div>`;
  }

  const mergeBtn = (qty>=2 && enh<3) ? `<button id="mergeBtn" class="craft-btn" style="margin-top:8px; padding:4px 12px; font-size:0.8rem;">Merge (+1)</button>` : '';

  container.innerHTML = `
    <div style="display:flex; gap:16px; align-items:flex-start;">
      <div style="position:relative; width:130px; aspect-ratio:3/4; border-radius:12px; overflow:hidden; flex-shrink:0; box-shadow:0 6px 20px rgba(0,0,0,0.5); cursor:pointer;">
        <img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; z-index:1; border-radius:12px;">
        <img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; z-index:2; pointer-events:none;">
      </div>
      <div style="flex:1; min-width:200px;">
        <h3 style="margin:0 0 2px; color:#e0d0b0; font-size:1.2rem;">${card.name}</h3>
        <p style="font-size:0.7rem; color:#d0c0a0; margin:0 0 6px;">${card.type} · ${card.rarity} · ${card.aspect} | Qty: ${qty} | Enh: +${enh}</p>
        ${statsHtml}
        ${mergeBtn}
      </div>
    </div>
  `;

  if (mergeBtn) container.querySelector('#mergeBtn')!.addEventListener('click', () => { if (mergeDuplicate(selectedCardId!)) { playSfx('card_enhance'); renderContent(); } });
  // Double‑click on large image opens full‑art
  container.querySelector('div[style*="cursor:pointer"]')?.addEventListener('dblclick', () => {
    if (selectedCardId) showFullArt(card);
  });
}

function renderLoadoutPanel(): void {
  const panel = document.getElementById('loadoutPanel');
  if (!panel) return;

  const slotArrays = [
    {label:'Entities', slots: equippedEntitySlots.value, max: maxEntitySlots.value, type:'entity' as CardType},
    {label:'Spells',   slots: equippedSpellSlots.value, max: maxSpellSlots.value, type:'spell' as CardType},
    {label:'Enhancements', slots: equippedEnhancementSlots.value, max: maxEnhancementSlots.value, type:'enhancement' as CardType},
    {label:'Lands',   slots: equippedLandSlots.value, max: maxLandSlots.value, type:'land' as CardType},
  ];

  let html = '';
  slotArrays.forEach(({label,slots,max,type}) => {
    const filled = slots.filter(id => id).length;
    html += `<div style="margin-bottom:8px;"><span style="color:#d0c0a0; font-size:0.7rem;">${label} (${filled}/${max})</span><div style="display:flex; gap:4px; margin-top:3px; flex-wrap:wrap;">`;
    for (let i=0; i<max; i++) {
      const id = slots[i] || '';
      const card = id ? getCardById(id) : null;
      html += `<div class="loadout-slot" data-type="${type}" data-index="${i}" style="width:48px; height:64px; background:#1c120c; border:1px solid ${card?'#c8b890':'#5a4a3a'}; border-radius:6px; cursor:pointer; overflow:hidden; position:relative;">`;
      if (card) {
        html += `<img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; z-index:1;"><img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; z-index:2; pointer-events:none;">`;
      } else {
        html += `<span style="display:flex; align-items:center; justify-content:center; height:100%; color:#5a4a3a; font-size:1rem;">+</span>`;
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

function renderComboPanel(): void {
  const panel = document.getElementById('activeCombosPanel');
  if (!panel) return;
  const combos = checkForCombos();
  const synergy = getAspectSynergyBonus();
  let html = '';
  if (combos.length > 0) {
    html += '<div style="margin-bottom:6px;"><span style="color:#d4af37; font-size:0.8rem;">✨ Combos</span>';
    combos.forEach(c => {
      const names = c.cardIds.map(id => getCardById(id)?.name || id).join(' + ');
      html += `<p style="font-size:0.7rem; margin:2px 0; color:#c8b890;">${names}: ${c.effect}</p>`;
    });
    html += '</div>';
  }
  if (Object.keys(synergy).length > 0) {
    html += '<div><span style="color:#7ea04b; font-size:0.8rem;">🌀 Synergy</span>';
    if (synergy.hp) html += `<p style="font-size:0.7rem; margin:2px 0;">+${synergy.hp} HP</p>`;
    if (synergy.atk) html += `<p style="font-size:0.7rem; margin:2px 0;">+${synergy.atk} ATK</p>`;
    if (synergy.def) html += `<p style="font-size:0.7rem; margin:2px 0;">+${synergy.def} DEF</p>`;
    if (synergy.spd) html += `<p style="font-size:0.7rem; margin:2px 0;">+${synergy.spd} SPD</p>`;
    if (synergy.cun) html += `<p style="font-size:0.7rem; margin:2px 0;">+${synergy.cun} CUN</p>`;
    html += '</div>';
  }
  panel.innerHTML = html || '<p style="color:#a09080; font-size:0.8rem;">No active combos or synergies.</p>';
}
