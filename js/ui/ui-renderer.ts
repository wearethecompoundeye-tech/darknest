// js/ui/ui-renderer.ts – Main UI rendering, demon‑free.
// Removed all demon panels; now shows equipped entity and dynamic bandolier.

import { effect } from '@preact/signals-core';
import {
  will, health, maxWill, circleIntegrity,
  masteryLevel, masteryXP, masteryNeeded,
  seedResonance, maxSeedResonance,
  familiar, crafted, ingredients,
  orbexFragments, maxOrbexFragments, orbexBoons,
  runeSlots, selectedRunes, knownRunes,
  circleQuality, quotaRemaining, timerSeconds,
  hasSpecialIngredient, discoveries, tutorial,
  state, legacyState, updateState, CONSTANTS,
  kalgothsNoose, circlePower, circleMastery,
  ownedCards, equippedEntitySlots, equippedSpellSlots,
  equippedEnhancementSlots, equippedLandSlots,
  maxEntitySlots, maxSpellSlots, maxEnhancementSlots, maxLandSlots,
  getEquippedCards, getActiveEntity, empoweredCircle
} from '../core/state-signals.js';
import { runeData } from '../data/runes.js';
import { el } from '../core/dom-helper.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import { addLog } from './log-manager.js';
import { openGrimoire } from './grimoire.js';
import { getCardById, type Card } from '../data/cards.js';
import { renderBandolierSlots } from './bandolier.js';

// Cache elements
const elements: Record<string, HTMLElement | null> = {};
function getEl(id: string): HTMLElement | null {
  if (!(id in elements)) elements[id] = el(id);
  return elements[id];
}

// Rune slot orbit animation
let orbitAngle = 0;
let animationFrame: number | null = null;
const ORBIT_RADIUS = 200;
let CENTER_X = 220, CENTER_Y = 220;
const SLOT_ANGLES = [0, 120, 240].map(deg => deg * Math.PI / 180);
let currentOrbitSpeed = 0.01;

function updateOrbitSpeed(): void {
  let multiplier = 1.0;
  if (circleQuality.value > 0) multiplier += 0.3;
  const etchedCount = runeSlots.value.filter(r => r).length;
  multiplier += etchedCount * 0.2;
  currentOrbitSpeed = 0.01 * multiplier;
}

function startOrbitAnimation(): void {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  function animate(): void {
    updateOrbitSpeed();
    orbitAngle = (orbitAngle + currentOrbitSpeed) % (2 * Math.PI);
    updateRuneSlotPositions();
    animationFrame = requestAnimationFrame(animate);
  }
  animate();
}

function updateRuneSlotPositions(): void {
  const circleCanvas = getEl("circleCanvas") as HTMLCanvasElement | null;
  if (circleCanvas) { CENTER_X = circleCanvas.width / 2; CENTER_Y = circleCanvas.height / 2; }
  const slots = ["slot1", "slot2", "slot3"];
  slots.forEach((id, i) => {
    const slotDiv = getEl(id);
    if (!slotDiv) return;
    const angle = SLOT_ANGLES[i] + orbitAngle;
    const x = CENTER_X + Math.cos(angle) * ORBIT_RADIUS;
    const y = CENTER_Y + Math.sin(angle) * ORBIT_RADIUS;
    slotDiv.style.transform = `translate(${x - CENTER_X}px, ${y - CENTER_Y}px) rotate(${angle}rad)`;
  });
}

// Tooltips
let tooltipContainer: HTMLDivElement | null = null;
let activeTooltip: HTMLDivElement | null = null;
function initTooltips(): void {
  if (tooltipContainer) return;
  tooltipContainer = document.createElement('div'); tooltipContainer.id = 'tooltipContainer';
  document.body.appendChild(tooltipContainer);
  document.querySelectorAll('[title]').forEach(el => {
    if (el.hasAttribute('data-tooltip')) return;
    const htmlEl = el as HTMLElement;
    const title = htmlEl.getAttribute('title');
    if (title) {
      htmlEl.setAttribute('data-tooltip', title); htmlEl.removeAttribute('title');
      htmlEl.addEventListener('mouseenter', showTooltip);
      htmlEl.addEventListener('mouseleave', hideTooltip);
      htmlEl.addEventListener('mousemove', moveTooltip);
    }
  });
}
function showTooltip(e: MouseEvent): void {
  const target = e.currentTarget as HTMLElement;
  const tip = target.dataset.tooltip; if (!tip) return;
  if (activeTooltip) activeTooltip.remove();
  activeTooltip = document.createElement('div'); activeTooltip.className = 'tooltip-content'; activeTooltip.textContent = tip;
  tooltipContainer?.appendChild(activeTooltip);
  moveTooltip(e);
}
function moveTooltip(e: MouseEvent): void {
  if (!activeTooltip) return;
  activeTooltip.style.left = (e.clientX + 15) + 'px'; activeTooltip.style.top = (e.clientY + 15) + 'px';
}
function hideTooltip(): void { if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; } }

export function triggerScreenPulse(color: string = '#d4af37'): void {
  const pulse = document.createElement('div'); pulse.className = 'screen-pulse';
  pulse.style.cssText = `position:fixed; inset:0; pointer-events:none; z-index:9999; animation:pulseFade 2s ease-out forwards; box-shadow:inset 0 0 80px ${color};`;
  document.body.appendChild(pulse); setTimeout(() => pulse.remove(), 2000);
}
if (!document.querySelector('#pulseKeyframes')) {
  const s = document.createElement('style'); s.id = 'pulseKeyframes';
  s.textContent = '@keyframes pulseFade{0%{opacity:1}100%{opacity:0}}'; document.head.appendChild(s);
}

export function drawRuneOnCanvas(canvas: HTMLCanvasElement, runeName: string): void {
  const rune = runeData.find(r => r.name === runeName);
  const shape = rune?.shape || [[100, 40], [160, 100], [100, 160], [40, 100]];
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  const w = canvas.width, h = canvas.height; ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "#f0a85a"; ctx.lineWidth = 2.5; const scale = w / 200;
  for (let i = 0; i < shape.length; i++) {
    let [x, y] = shape[i]; x *= scale; y *= scale;
    if (i < shape.length - 1) {
      let [x2, y2] = shape[i + 1]; x2 *= scale; y2 *= scale;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
    }
  }
}

export function updateRuneSlots(): void {
  const slots = ["slot1", "slot2", "slot3"];
  slots.forEach((id, i) => {
    const slotDiv = getEl(id); if (!slotDiv) return;
    const canvas = slotDiv.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    if (runeSlots.value[i]) {
      slotDiv.classList.add("filled"); drawRuneOnCanvas(canvas, runeSlots.value[i]);
      slotDiv.style.boxShadow = "0 0 20px #f0a85a";
    } else {
      slotDiv.classList.remove("filled");
      const ctx = canvas.getContext("2d"); if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      slotDiv.style.boxShadow = "none";
    }
  });
}

export function addRuneToSlot(runeName: string): void {
  const newSlots: [string, string, string] = [...runeSlots.value];
  for (let i = 0; i < 3; i++) {
    if (newSlots[i] === "") { newSlots[i] = runeName; runeSlots.value = newSlots; playSfx('runeApply'); updateRuneSlots(); updateUI(); return; }
  }
  newSlots[0] = newSlots[1]; newSlots[1] = newSlots[2]; newSlots[2] = runeName;
  runeSlots.value = newSlots; playSfx('runeApply'); updateRuneSlots(); updateUI();
}

function renderConsoleRuneSlots(): void {
  const container = getEl("consoleRuneSlots"); if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const slotDiv = document.createElement("div"); slotDiv.className = "console-rune-slot";
    if (runeSlots.value[i]) slotDiv.classList.add("filled");
    const canvas = document.createElement("canvas"); canvas.width = 48; canvas.height = 48;
    if (runeSlots.value[i]) drawRuneOnCanvas(canvas, runeSlots.value[i]);
    else { const ctx = canvas.getContext("2d"); if (ctx) ctx.clearRect(0, 0, 48, 48); }
    slotDiv.appendChild(canvas);
    slotDiv.onclick = () => {
      if (selectedRunes.value.length === 0) { addLog("Select a pattern from the grid first.", true); return; }
      const ns: [string, string, string] = [...runeSlots.value]; ns[i] = selectedRunes.value[0];
      runeSlots.value = ns; playSfx('runeApply'); addLog(`Pattern ${selectedRunes.value[0]} placed.`, false); renderConsoleRuneSlots();
    };
    container.appendChild(slotDiv);
  }
}
function renderConsoleRuneGrid(): void {
  const grid = getEl("consoleRuneGrid"); if (!grid) return;
  grid.innerHTML = "";
  if (knownRunes.value.length === 0) { grid.innerHTML = '<span style="opacity:0.6; padding:8px;">No patterns known</span>'; return; }
  const maxPatterns = 3 + Math.floor(circleMastery.value / 2);
  knownRunes.value.forEach(runeName => {
    const rune = runeData.find(r => r.name === runeName); if (!rune) return;
    const badge = document.createElement("div"); badge.className = "console-rune-badge";
    if (selectedRunes.value.includes(runeName)) badge.classList.add("selected");
    badge.textContent = runeName; badge.title = `${rune.meaning}: ${rune.effect}`;
    badge.onclick = () => {
      if (selectedRunes.value.includes(runeName)) selectedRunes.value = selectedRunes.value.filter(r => r !== runeName);
      else { if (selectedRunes.value.length >= maxPatterns) { addLog(`Maximum ${maxPatterns} patterns selected.`, true); return; } selectedRunes.value = [...selectedRunes.value, runeName]; }
      renderConsoleRuneGrid();
    };
    grid.appendChild(badge);
  });
}

function updateOrbexPanel(): void {
  const panel = getEl('orbexPanel'); if (!panel) return;
  const fc = orbexFragments.value, max = maxOrbexFragments.value;
  let fragsHtml = '';
  const orbexBase = `${import.meta.env.BASE_URL}Images/Orbex_Fragment`;
  for (let i = 0; i < max; i++) fragsHtml += `<img src="${orbexBase}${i < fc ? '' : '_Corrupted'}.png" style="width:24px;height:24px;margin:2px;">`;
  let boonsHtml = ''; orbexBoons.value.forEach(b => boonsHtml += `<span style="background:#1a0a0a;padding:2px 6px;border-radius:12px;font-size:0.7rem;">${b}</span>`);
  let next = fc===0?'Seek the first Acolyte alcove.':fc===1?'One fragment reclaimed.':fc===2?'Two fragments.':fc===3?'Three fragments. Halfway there.':fc===4?'Four fragments.':fc===5?'Five fragments. One remains.':'Orbex is whole. Confront Kalgoth.';
  panel.innerHTML = `
    <div style="background:rgba(5,2,8,0.8); border:1px solid #5a4a3a; border-radius:12px; padding:10px; margin-top:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#d4af37;">🌑 Orbex Fragments</span><span>${fc}/${max}</span></div>
      <div style="display:flex;justify-content:center;margin-bottom:8px;">${fragsHtml}</div>
      <div style="margin-bottom:8px;"><span style="color:#bc633a;">🌀 Circle Mastery</span><div class="progress-bar"><div id="masteryFill" class="progress-fill" style="width:0%; background:#8a7a5a;"></div></div><span style="font-size:0.7rem;">Level ${circleMastery.value}</span></div>
      <div><span style="color:#7ea04b;">✨ Boons</span><div style="display:flex;gap:4px;margin-top:4px;">${boonsHtml||'<span style="opacity:0.6;">None yet</span>'}</div></div>
      <div style="margin-top:8px;font-size:0.7rem;color:#bc9a6a;">${next}</div>
    </div>`;
}

function updateResourceSummary(): void {
  const summary = getEl("resourceSummary"); if (!summary) return;
  const icons: Record<string, string> = { nightshadeMoss:"🌿", cryptPhlegm:"💧", bansheeSalts:"🧂", wyrmEye:"👁️", demonIchor:"🩸", boneDust:"🦴", shadowResin:"🌑" };
  let html = "";
  for (const ing in ingredients.value) { const qty = ingredients.value[ing as keyof typeof ingredients.value]; if (qty > 0) html += `<span>${icons[ing]||"?"} ${qty}</span>`; }
  summary.innerHTML = html || "<span>No resources</span>";
}

// Card slot rendering
function renderCardSlots(): void {
  const container = getEl('cardSlotsContainer'); if (!container) return;
  const ent = equippedEntitySlots.value, spl = equippedSpellSlots.value, enh = equippedEnhancementSlots.value, lnd = equippedLandSlots.value;
  const maxE = maxEntitySlots.value, maxS = maxSpellSlots.value, maxEn = maxEnhancementSlots.value, maxL = maxLandSlots.value;
  let h = `<div style="display:flex; gap:8px; justify-content:center; padding:8px; background:rgba(10,6,14,0.6); border-top:1px solid #5a4a3a;">`;
  const slotHtml = (max: number, slots: string[]) => {
    let s = '';
    for (let i = 0; i < max; i++) {
      const id = slots[i] || '', card = id ? getCardById(id) : null;
      s += `<div class="card-slot ${card?'filled':'empty'}" style="width:48px;height:64px;background:#1a100a;border:1px solid ${card?'#8a7a5a':'#4a3a2a'};border-radius:6px;cursor:pointer;overflow:hidden;position:relative;">`;
      if (card) s += `<img src="${card.image}" style="width:100%;height:100%;object-fit:cover;position:relative;z-index:1;"><img src="${card.frame}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:2;pointer-events:none;">`;
      else s += `<span style="color:#5a4a3a;font-size:1.2rem;display:flex;align-items:center;justify-content:center;height:100%;">+</span>`;
      s += `</div>`;
    }
    return s;
  };
  h += `<div style="display:flex;gap:4px;border-right:1px solid #5a4a3a;padding-right:12px;"><span style="color:#a09080;font-size:0.7rem;align-self:center;">🜁</span>${slotHtml(maxE, ent)}</div>`;
  h += `<div style="display:flex;gap:4px;border-right:1px solid #5a4a3a;padding-right:12px;">${slotHtml(maxS, spl)}</div>`;
  h += `<div style="display:flex;gap:4px;border-right:1px solid #5a4a3a;padding-right:12px;">${slotHtml(maxEn, enh)}</div>`;
  h += `<div style="display:flex;gap:4px;">${slotHtml(maxL, lnd)}</div>`;
  h += `</div>`;
  container.innerHTML = h;
  container.querySelectorAll('.card-slot').forEach(el => el.addEventListener('click', () => openGrimoire()));
}

// Empowered circle visual
let empoweredHaloCanvas: HTMLCanvasElement | null = null;
let empoweredAnimFrame: number | null = null;
export function startEmpoweredEffects(): void {
  const ritualCircle = getEl('ritualCircle'); if (!ritualCircle) return;
  if (!empoweredHaloCanvas) {
    empoweredHaloCanvas = document.createElement('canvas'); empoweredHaloCanvas.id = 'empoweredHaloCanvas';
    empoweredHaloCanvas.width = 440; empoweredHaloCanvas.height = 440;
    empoweredHaloCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:5;';
    ritualCircle.appendChild(empoweredHaloCanvas);
  }
  const ctx = empoweredHaloCanvas.getContext('2d')!; let frame = 0;
  function animate() {
    if (!empoweredCircle.value) { ctx.clearRect(0,0,440,440); empoweredAnimFrame = requestAnimationFrame(animate); return; }
    frame++; ctx.clearRect(0,0,440,440); ctx.save();
    const haloRadius = 160 + Math.sin(frame*0.02)*10;
    ctx.beginPath(); ctx.arc(220,220,haloRadius,0,Math.PI*2);
    ctx.strokeStyle='#ff2020';ctx.lineWidth=2.5;ctx.shadowColor='#ff0000';ctx.shadowBlur=25+Math.sin(frame*0.05)*10;
    ctx.globalAlpha=0.5+Math.sin(frame*0.03)*0.15;ctx.stroke();
    for(let i=0;i<12;i++) {
      const angle=(i/12)*Math.PI*2+frame*0.002;
      ctx.beginPath();ctx.moveTo(220+Math.cos(angle)*170,220+Math.sin(angle)*170);
      ctx.lineTo(220+Math.cos(angle)*(210+Math.sin(frame*0.1+i)*30),220+Math.sin(angle)*(210+Math.sin(frame*0.1+i)*30));
      ctx.strokeStyle='rgba(255,40,40,0.3)';ctx.lineWidth=1.2;ctx.stroke();
    }
    const runeEls = ['slot1','slot2','slot3'].map(id=>getEl(id)).filter(Boolean);
    if(runeEls.length===3) {
      const positions = runeEls.map(slot=>{
        const rect=(slot as HTMLElement).getBoundingClientRect(), circleRect=ritualCircle.getBoundingClientRect();
        return {x:rect.left+rect.width/2-circleRect.left,y:rect.top+rect.height/2-circleRect.top};
      });
      ctx.beginPath();ctx.moveTo(positions[0].x,positions[0].y);ctx.lineTo(positions[1].x,positions[1].y);ctx.lineTo(positions[2].x,positions[2].y);ctx.closePath();
      ctx.strokeStyle='#ff4040';ctx.lineWidth=3;ctx.shadowColor='#ff0000';ctx.shadowBlur=15+Math.sin(frame*0.08)*8;
      ctx.setLineDash([10,5]);ctx.stroke();ctx.setLineDash([]);
    }
    ctx.restore(); empoweredAnimFrame = requestAnimationFrame(animate);
  }
  empoweredAnimFrame = requestAnimationFrame(animate);
}
export function stopEmpoweredEffects() { if(empoweredAnimFrame) cancelAnimationFrame(empoweredAnimFrame); }

// Main UI effects
export function setupUIEffects(): void {
  effect(() => { const el = getEl("willValue"); if(el) el.innerText = Math.floor(will.value).toString(); });
  effect(() => { const el = getEl("healthValue"); if(el) el.innerText = health.value.toString(); });
  effect(() => { const el = getEl("nooseValue"); const fill = getEl("nooseFill"); if(el) el.innerText = Math.floor(kalgothsNoose.value).toString(); if(fill) fill.style.width = kalgothsNoose.value + "%"; });
  effect(() => { const el = getEl("quotaRemaining"); if(el) el.innerText = quotaRemaining.value.toString(); });
  effect(() => { const el = getEl("circlePowerValue"); const fill = getEl("circlePowerFill"); if(el) el.innerText = circlePower.value.toString(); if(fill) fill.style.width = circlePower.value + "%"; });
  effect(() => { const el = getEl("masteryLevel"); if(el) el.innerText = masteryLevel.value.toString(); });
  effect(() => { const el = getEl("masteryXP"); if(el) el.innerText = masteryXP.value.toString(); });
  effect(() => { const el = getEl("masteryNeeded"); if(el) el.innerText = masteryNeeded.value.toString(); });
  effect(() => { const fill = getEl("masteryFill"); if(fill) fill.style.width = (masteryXP.value / masteryNeeded.value) * 100 + "%"; });
  effect(() => { const el = getEl("circleMasteryValue"); if(el) el.innerText = circleMastery.value.toString(); });
  effect(() => { const el = getEl("seedResonanceValue") || getEl("bloodResonanceValue"); if(el) el.innerText = `${seedResonance.value}/${maxSeedResonance.value}`; });
  effect(() => { const el = getEl("familiarLevel"); if(el) el.innerText = familiar.value.level.toString(); });
  effect(() => { const fill = getEl("xpFill"); if(fill) fill.style.width = (familiar.value.xp / familiar.value.nextXP) * 100 + "%"; });
  effect(() => { const el = getEl("familiarXP"); if(el) el.innerText = `XP: ${familiar.value.xp}/${familiar.value.nextXP}`; });
  effect(() => { const el = getEl("familiarMood"); if(el) el.innerText = `Mood: ${familiar.value.mood}%`; });
  effect(() => {
    const a = familiar.value.abilities, n: string[] = [];
    if(a.includes("scout")) n.push("Scout"); if(a.includes("ward")) n.push("Ward"); if(a.includes("guidance")) n.push("Guidance"); if(a.includes("presence")) n.push("Presence");
    const el = getEl("familiarAbilities"); if(el) el.innerHTML = n.join(" · ");
  });
  effect(() => { const el = getEl("simpleCraftedList"); if(el) el.innerHTML = `Powder:${crafted.value.powderOfWarding} | Phial:${crafted.value.phialOfSubjugation} | Restore:${crafted.value.restorativeDraught}`; });
  effect(() => { const el = getEl("consolePowder"); if(el) el.innerText = crafted.value.powderOfWarding.toString(); });
  effect(() => { const el = getEl("consolePhial"); if(el) el.innerText = crafted.value.phialOfSubjugation.toString(); });
  effect(() => { const el = getEl("consoleIchor"); if(el) el.innerText = (ingredients.value.demonIchor || 0).toString(); });
  effect(() => { const el = getEl("consoleIntegrity"); if(el) el.innerText = `Power: ${circlePower.value}%`; });
  effect(() => {
    const ritual = getEl("ritualCircle");
    if(ritual) { ritual.classList.remove("power-low","power-mid","power-high","power-full");
      if(circlePower.value>=90) ritual.classList.add("power-full"); else if(circlePower.value>=60) ritual.classList.add("power-high"); else if(circlePower.value>=30) ritual.classList.add("power-mid"); else if(circlePower.value>0) ritual.classList.add("power-low"); }
  });
  effect(() => { const halo = getEl('ritualHalo'); if(halo) halo.style.display = (circleQuality.value>0 && runeSlots.value.every(r=>r)) ? 'block' : 'none'; });

  // Right panel – shows equipped entity
  effect(() => {
    const entityCard = getActiveEntity();
    const demonArea = getEl("demonArea");
    if(demonArea) demonArea.innerHTML = entityCard ? `<strong>🜁 ${entityCard.name} (${entityCard.aspect})</strong>` : '🌀 No entity equipped';
    // Hide any leftover demon panels
    const actionPanel = getEl("demonActionPanel"); if(actionPanel) actionPanel.style.display = 'none';
    const demonOverlay = getEl("demonOverlay"); if(demonOverlay) demonOverlay.style.display = 'none';
  });

  effect(() => { const ash = getEl("ashPileArea"); if(ash) ash.style.display = 'none'; });

  effect(() => {
    const canEscape = circlePower.value >= 100 && hasSpecialIngredient.value && orbexFragments.value >= 6;
    const escapeArea = getEl("escapeArea"); if(escapeArea) escapeArea.style.display = canEscape ? 'block' : 'none';
    const consoleEscapeArea = getEl("consoleEscapeArea"); if(consoleEscapeArea) consoleEscapeArea.style.display = canEscape ? 'block' : 'none';
  });

  effect(() => {
    const mins = Math.floor(timerSeconds.value / 60), secs = timerSeconds.value % 60;
    const td = getEl("timerDisplay"); if(td) td.innerText = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    const dp = getEl("dayProgressFill"); if(dp) dp.style.width = (timerSeconds.value / 600) * 100 + "%";
  });

  effect(() => updateOrbexPanel());
  effect(() => renderConsoleRuneSlots());
  effect(() => renderConsoleRuneGrid());
  effect(() => updateResourceSummary());
  effect(() => updateRuneSlots());
  effect(() => renderCardSlots());

  // Bandolier
  effect(() => renderBandolierSlots());
}

export function updateUI(): void {
  initTooltips();
  renderCardSlots();
  renderBandolierSlots();
}

export function initOrbitAnimation(): void {
  startOrbitAnimation();
}