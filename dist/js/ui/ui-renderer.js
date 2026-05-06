// js/ui/ui-renderer.ts
// Main UI rendering with concentric rings and card slot bar
// Fixed: Demon overlay z-index, card frame alignment, Whisp cleanup
import { effect } from '@preact/signals-core';
import { will, health, banishPower, capturedDemons, masteryLevel, masteryXP, masteryNeeded, seedResonance, maxSeedResonance, familiar, crafted, ingredients, activeDemon, orbexFragments, maxOrbexFragments, orbexBoons, runeSlots, selectedRunes, knownRunes, circleQuality, ashAvailable, quotaRemaining, timerSeconds, hasSpecialIngredient, kalgothsNoose, circlePower, circleMastery, equippedEntitySlots, equippedSpellSlots, equippedEnhancementSlots, equippedLandSlots, maxEntitySlots, maxSpellSlots, maxEnhancementSlots, maxLandSlots } from '../core/state-signals.js';
import { runeData } from '../data/runes.js';
import { el } from '../core/dom-helper.js';
import { openWhispStats } from './tutorial.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import { whispSay } from './whisp-commentary.js';
import { addLog } from './log-manager.js';
import { openGrimoire } from './grimoire.js';
import { getCardById } from '../data/cards.js';
// Cache elements
const elements = {};
function getEl(id) {
    if (!(id in elements)) {
        elements[id] = el(id);
    }
    return elements[id];
}
// Animation state
let orbitAngle = 0;
let animationFrame = null;
const ORBIT_RADIUS = 200;
let CENTER_X = 220;
let CENTER_Y = 220;
const SLOT_ANGLES = [0, 120, 240].map(deg => deg * Math.PI / 180);
let currentOrbitSpeed = 0.01;
let lastFragmentCount = 0;
function updateOrbitSpeed() {
    let multiplier = 1.0;
    if (circleQuality.value > 0)
        multiplier += 0.3;
    const etchedCount = runeSlots.value.filter(r => r).length;
    multiplier += etchedCount * 0.2;
    currentOrbitSpeed = 0.01 * multiplier;
}
function startOrbitAnimation() {
    if (animationFrame)
        cancelAnimationFrame(animationFrame);
    function animate() {
        updateOrbitSpeed();
        orbitAngle = (orbitAngle + currentOrbitSpeed) % (2 * Math.PI);
        updateRuneSlotPositions();
        drawRuneTethers();
        animationFrame = requestAnimationFrame(animate);
    }
    animate();
}
function updateRuneSlotPositions() {
    const circleCanvas = getEl("circleCanvas");
    if (circleCanvas) {
        CENTER_X = circleCanvas.width / 2;
        CENTER_Y = circleCanvas.height / 2;
    }
    const slots = ["slot1", "slot2", "slot3"];
    slots.forEach((id, i) => {
        const slotDiv = getEl(id);
        if (!slotDiv)
            return;
        const angle = SLOT_ANGLES[i] + orbitAngle;
        const x = CENTER_X + Math.cos(angle) * ORBIT_RADIUS;
        const y = CENTER_Y + Math.sin(angle) * ORBIT_RADIUS;
        slotDiv.style.transform = `translate(${x - CENTER_X}px, ${y - CENTER_Y}px) rotate(${angle}rad)`;
    });
}
function drawRuneTethers() {
    const tetherCanvas = getEl("tetherCanvas");
    if (!tetherCanvas)
        return;
    const tCtx = tetherCanvas.getContext("2d");
    if (!tCtx)
        return;
    tCtx.clearRect(0, 0, tetherCanvas.width, tetherCanvas.height);
    const filledIndices = [];
    for (let i = 0; i < 3; i++) {
        if (runeSlots.value[i])
            filledIndices.push(i);
    }
    if (filledIndices.length >= 2) {
        startLoop('runeTetherAmbient');
    }
    else {
        stopLoop('runeTetherAmbient');
    }
    if (filledIndices.length < 2)
        return;
    const positions = SLOT_ANGLES.map((baseAngle, i) => {
        const angle = baseAngle + orbitAngle;
        return {
            x: CENTER_X + Math.cos(angle) * ORBIT_RADIUS,
            y: CENTER_Y + Math.sin(angle) * ORBIT_RADIUS
        };
    });
    tCtx.strokeStyle = "#f0a85a";
    tCtx.lineWidth = 3;
    tCtx.shadowColor = "#f0a85a";
    tCtx.shadowBlur = 15 + 5 * Math.sin(performance.now() / 200);
    tCtx.lineCap = "round";
    for (let i = 0; i < filledIndices.length; i++) {
        for (let j = i + 1; j < filledIndices.length; j++) {
            const p1 = positions[filledIndices[i]];
            const p2 = positions[filledIndices[j]];
            tCtx.beginPath();
            tCtx.moveTo(p1.x, p1.y);
            tCtx.lineTo(p2.x, p2.y);
            tCtx.stroke();
        }
    }
}
// Tooltip system
let tooltipContainer = null;
let activeTooltip = null;
function initTooltips() {
    if (tooltipContainer)
        return;
    tooltipContainer = document.createElement('div');
    tooltipContainer.id = 'tooltipContainer';
    document.body.appendChild(tooltipContainer);
    document.querySelectorAll('[title]').forEach(el => {
        if (el.hasAttribute('data-tooltip'))
            return;
        const htmlEl = el;
        const title = htmlEl.getAttribute('title');
        if (title) {
            htmlEl.setAttribute('data-tooltip', title);
            htmlEl.removeAttribute('title');
            htmlEl.addEventListener('mouseenter', showTooltip);
            htmlEl.addEventListener('mouseleave', hideTooltip);
            htmlEl.addEventListener('mousemove', moveTooltip);
        }
    });
}
function showTooltip(e) {
    const target = e.currentTarget;
    const tooltipText = target.dataset.tooltip;
    if (!tooltipText)
        return;
    if (activeTooltip) {
        activeTooltip.remove();
    }
    activeTooltip = document.createElement('div');
    activeTooltip.className = 'tooltip-content';
    activeTooltip.textContent = tooltipText;
    activeTooltip.id = 'activeTooltip';
    tooltipContainer?.appendChild(activeTooltip);
    moveTooltip(e);
}
function moveTooltip(e) {
    if (!activeTooltip)
        return;
    activeTooltip.style.left = (e.clientX + 15) + 'px';
    activeTooltip.style.top = (e.clientY + 15) + 'px';
}
function hideTooltip() {
    if (activeTooltip) {
        activeTooltip.remove();
        activeTooltip = null;
    }
}
export function triggerScreenPulse(color = '#d4af37') {
    const pulse = document.createElement('div');
    pulse.className = 'screen-pulse';
    pulse.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9999;
    animation: pulseFade 2s ease-out forwards;
    box-shadow: inset 0 0 80px ${color};
  `;
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 2000);
}
if (!document.querySelector('#pulseKeyframes')) {
    const style = document.createElement('style');
    style.id = 'pulseKeyframes';
    style.textContent = `
    @keyframes pulseFade {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }
  `;
    document.head.appendChild(style);
}
export function drawRuneOnCanvas(canvas, runeName) {
    const rune = runeData.find(r => r.name === runeName);
    const shape = rune?.shape || [[100, 40], [160, 100], [100, 160], [40, 100]];
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#f0a85a";
    ctx.lineWidth = 2.5;
    const scale = w / 200;
    for (let i = 0; i < shape.length; i++) {
        let [x, y] = shape[i];
        x *= scale;
        y *= scale;
        if (i < shape.length - 1) {
            let [x2, y2] = shape[i + 1];
            x2 *= scale;
            y2 *= scale;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
}
export function updateRuneSlots() {
    const slots = ["slot1", "slot2", "slot3"];
    slots.forEach((id, i) => {
        const slotDiv = getEl(id);
        if (!slotDiv)
            return;
        const canvas = slotDiv.querySelector("canvas");
        if (!canvas)
            return;
        if (runeSlots.value[i]) {
            slotDiv.classList.add("filled");
            drawRuneOnCanvas(canvas, runeSlots.value[i]);
            slotDiv.style.boxShadow = "0 0 20px #f0a85a";
        }
        else {
            slotDiv.classList.remove("filled");
            const ctx = canvas.getContext("2d");
            if (ctx)
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            slotDiv.style.boxShadow = "none";
        }
    });
    drawRuneTethers();
}
export function addRuneToSlot(runeName) {
    const newSlots = [...runeSlots.value];
    for (let i = 0; i < 3; i++) {
        if (newSlots[i] === "") {
            newSlots[i] = runeName;
            runeSlots.value = newSlots;
            playSfx('runeApply');
            updateRuneSlots();
            updateUI();
            return;
        }
    }
    newSlots[0] = newSlots[1];
    newSlots[1] = newSlots[2];
    newSlots[2] = runeName;
    runeSlots.value = newSlots;
    playSfx('runeApply');
    updateRuneSlots();
    updateUI();
}
function renderConsoleRuneSlots() {
    const container = getEl("consoleRuneSlots");
    if (!container)
        return;
    container.innerHTML = "";
    for (let i = 0; i < 3; i++) {
        const slotDiv = document.createElement("div");
        slotDiv.className = "console-rune-slot";
        if (runeSlots.value[i])
            slotDiv.classList.add("filled");
        const canvas = document.createElement("canvas");
        canvas.width = 48;
        canvas.height = 48;
        if (runeSlots.value[i]) {
            drawRuneOnCanvas(canvas, runeSlots.value[i]);
        }
        else {
            const ctx = canvas.getContext("2d");
            if (ctx)
                ctx.clearRect(0, 0, 48, 48);
        }
        slotDiv.appendChild(canvas);
        slotDiv.onclick = () => {
            if (selectedRunes.value.length === 0) {
                addLog("Select a pattern from the grid first.", true);
                return;
            }
            const newSlots = [...runeSlots.value];
            newSlots[i] = selectedRunes.value[0];
            runeSlots.value = newSlots;
            playSfx('runeApply');
            addLog(`Pattern ${selectedRunes.value[0]} placed.`, false, 'player');
            renderConsoleRuneSlots();
        };
        container.appendChild(slotDiv);
    }
}
function renderConsoleRuneGrid() {
    const grid = getEl("consoleRuneGrid");
    if (!grid)
        return;
    grid.innerHTML = "";
    if (knownRunes.value.length === 0) {
        grid.innerHTML = '<span style="opacity:0.6; padding:8px;">No patterns known</span>';
        return;
    }
    const maxPatterns = 3 + Math.floor(circleMastery.value / 2);
    knownRunes.value.forEach(runeName => {
        const rune = runeData.find(r => r.name === runeName);
        if (!rune)
            return;
        const badge = document.createElement("div");
        badge.className = "console-rune-badge";
        if (selectedRunes.value.includes(runeName))
            badge.classList.add("selected");
        badge.textContent = runeName;
        badge.title = `${rune.meaning}: ${rune.effect}`;
        badge.onclick = () => {
            if (selectedRunes.value.includes(runeName)) {
                selectedRunes.value = selectedRunes.value.filter(r => r !== runeName);
            }
            else {
                if (selectedRunes.value.length >= maxPatterns) {
                    addLog(`Maximum ${maxPatterns} patterns selected.`, true);
                    return;
                }
                selectedRunes.value = [...selectedRunes.value, runeName];
            }
            renderConsoleRuneGrid();
        };
        grid.appendChild(badge);
    });
}
function updateOrbexPanel() {
    const panel = getEl('orbexPanel');
    if (!panel)
        return;
    const fragmentCount = orbexFragments.value;
    const maxFragments = maxOrbexFragments.value;
    let fragmentsHtml = '';
    for (let i = 0; i < maxFragments; i++) {
        const filled = i < fragmentCount;
        fragmentsHtml += `<img src="/Images/Orbex_Fragment${filled ? '' : '_Corrupted'}.png" style="width:24px; height:24px; margin:2px;" title="${filled ? 'Fragment Reclaimed' : 'Fragment Missing'}">`;
    }
    let boonsHtml = '';
    orbexBoons.value.forEach(boon => {
        boonsHtml += `<span style="background:#1a0a0a; padding:2px 6px; border-radius:12px; font-size:0.7rem;">${boon}</span>`;
    });
    let nextMilestone = '';
    if (fragmentCount === 0)
        nextMilestone = 'Seek the first Acolyte alcove.';
    else if (fragmentCount === 1)
        nextMilestone = 'One fragment reclaimed.';
    else if (fragmentCount === 2)
        nextMilestone = 'Two fragments.';
    else if (fragmentCount === 3)
        nextMilestone = 'Three fragments. Halfway there.';
    else if (fragmentCount === 4)
        nextMilestone = 'Four fragments.';
    else if (fragmentCount === 5)
        nextMilestone = 'Five fragments. One remains.';
    else
        nextMilestone = 'Orbex is whole. Confront Kalgoth.';
    panel.innerHTML = `
    <div style="background:rgba(5,2,8,0.8); border:1px solid #5a4a3a; border-radius:12px; padding:10px; margin-top:10px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span style="color:#d4af37;">🌑 Orbex Fragments</span>
        <span>${fragmentCount}/${maxFragments}</span>
      </div>
      <div style="display:flex; justify-content:center; margin-bottom:8px;">${fragmentsHtml}</div>
      <div style="margin-bottom:8px;">
        <span style="color:#bc633a;">🌀 Circle Mastery</span>
        <div class="progress-bar" style="margin-top:4px;">
          <div id="masteryFill" class="progress-fill" style="width:0%; background:#8a7a5a;"></div>
        </div>
        <span style="font-size:0.7rem;">Level ${circleMastery.value}</span>
      </div>
      <div>
        <span style="color:#7ea04b;">✨ Boons</span>
        <div style="display:flex; gap:4px; margin-top:4px;">${boonsHtml || '<span style="opacity:0.6;">None yet</span>'}</div>
      </div>
      <div style="margin-top:8px; font-size:0.7rem; color:#bc9a6a;">${nextMilestone}</div>
    </div>
  `;
}
function updateResourceSummary() {
    const summary = getEl("resourceSummary");
    if (!summary)
        return;
    const icons = {
        nightshadeMoss: "🌿",
        cryptPhlegm: "💧",
        bansheeSalts: "🧂",
        wyrmEye: "👁️",
        demonIchor: "🩸",
        boneDust: "🦴",
        shadowResin: "🌑"
    };
    let html = "";
    for (const ing in ingredients.value) {
        const qty = ingredients.value[ing];
        if (qty > 0) {
            html += `<span>${icons[ing] || "?"} ${qty}</span>`;
        }
    }
    if (html === "")
        html = "<span>No resources</span>";
    summary.innerHTML = html;
}
export let etchCoverage = 0;
export let etchSmoothness = 0;
export function updateEtchFeedback(coverage, smoothness) {
    etchCoverage = coverage;
    etchSmoothness = smoothness;
    const covEl = getEl("etchCoverage");
    const smoothEl = getEl("etchSmoothness");
    if (covEl)
        covEl.innerText = Math.floor(coverage * 100).toString();
    if (smoothEl)
        smoothEl.innerText = Math.floor(smoothness * 100).toString();
}
// Card slot rendering - FIXED: single frame overlay method
function renderCardSlots() {
    const container = getEl('cardSlotsContainer');
    if (!container)
        return;
    const entitySlots = equippedEntitySlots.value;
    const spellSlots = equippedSpellSlots.value;
    const enhancementSlots = equippedEnhancementSlots.value;
    const landSlots = equippedLandSlots.value;
    const maxE = maxEntitySlots.value;
    const maxS = maxSpellSlots.value;
    const maxEn = maxEnhancementSlots.value;
    const maxL = maxLandSlots.value;
    let html = `
    <div style="display:flex; gap:8px; justify-content:center; padding:8px; background:rgba(10,6,14,0.6); border-top:1px solid #5a4a3a;">
      <!-- Entities -->
      <div style="display:flex; gap:4px; border-right:1px solid #5a4a3a; padding-right:12px;">
        <span style="color:#a09080; font-size:0.7rem; align-self:center;">🜁</span>
  `;
    for (let i = 0; i < maxE; i++) {
        const cardId = entitySlots[i] || '';
        const card = cardId ? getCardById(cardId) : null;
        html += `<div class="card-slot ${card ? 'filled' : 'empty'}" data-slot-type="entity" data-slot-index="${i}" style="width:48px; height:64px; background:#1a100a; border:1px solid ${card ? '#8a7a5a' : '#4a3a2a'}; border-radius:6px; cursor:pointer; overflow:hidden; position:relative;">`;
        if (card) {
            html += `<img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:1;">`;
            html += `<img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:2; pointer-events:none;">`;
        }
        else {
            html += `<span style="color:#5a4a3a; font-size:1.2rem; display:flex; align-items:center; justify-content:center; height:100%;">+</span>`;
        }
        html += `</div>`;
    }
    html += `</div>`;
    // Spells
    html += `<div style="display:flex; gap:4px; border-right:1px solid #5a4a3a; padding-right:12px;">`;
    for (let i = 0; i < maxS; i++) {
        const cardId = spellSlots[i] || '';
        const card = cardId ? getCardById(cardId) : null;
        html += `<div class="card-slot ${card ? 'filled' : 'empty'}" data-slot-type="spell" data-slot-index="${i}" style="width:48px; height:64px; background:#1a100a; border:1px solid ${card ? '#8a7a5a' : '#4a3a2a'}; border-radius:6px; cursor:pointer; overflow:hidden; position:relative;">`;
        if (card) {
            html += `<img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:1;">`;
            html += `<img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:2; pointer-events:none;">`;
        }
        else {
            html += `<span style="color:#5a4a3a; font-size:1.2rem; display:flex; align-items:center; justify-content:center; height:100%;">+</span>`;
        }
        html += `</div>`;
    }
    html += `</div>`;
    // Enhancements
    html += `<div style="display:flex; gap:4px; border-right:1px solid #5a4a3a; padding-right:12px;">`;
    for (let i = 0; i < maxEn; i++) {
        const cardId = enhancementSlots[i] || '';
        const card = cardId ? getCardById(cardId) : null;
        html += `<div class="card-slot ${card ? 'filled' : 'empty'}" data-slot-type="enhancement" data-slot-index="${i}" style="width:48px; height:64px; background:#1a100a; border:1px solid ${card ? '#8a7a5a' : '#4a3a2a'}; border-radius:6px; cursor:pointer; overflow:hidden; position:relative;">`;
        if (card) {
            html += `<img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:1;">`;
            html += `<img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:2; pointer-events:none;">`;
        }
        else {
            html += `<span style="color:#5a4a3a; font-size:1.2rem; display:flex; align-items:center; justify-content:center; height:100%;">+</span>`;
        }
        html += `</div>`;
    }
    html += `</div>`;
    // Lands
    html += `<div style="display:flex; gap:4px;">`;
    for (let i = 0; i < maxL; i++) {
        const cardId = landSlots[i] || '';
        const card = cardId ? getCardById(cardId) : null;
        html += `<div class="card-slot ${card ? 'filled' : 'empty'}" data-slot-type="land" data-slot-index="${i}" style="width:48px; height:64px; background:#1a100a; border:1px solid ${card ? '#8a7a5a' : '#4a3a2a'}; border-radius:6px; cursor:pointer; overflow:hidden; position:relative;">`;
        if (card) {
            html += `<img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:1;">`;
            html += `<img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:2; pointer-events:none;">`;
        }
        else {
            html += `<span style="color:#5a4a3a; font-size:1.2rem; display:flex; align-items:center; justify-content:center; height:100%;">+</span>`;
        }
        html += `</div>`;
    }
    html += `</div>`;
    html += `<button id="openGrimoireBtn" class="craft-btn" style="margin-left:12px; padding:4px 12px; font-size:0.7rem;">📖 Grimoire</button>`;
    html += `</div>`;
    container.innerHTML = html;
    container.querySelectorAll('.card-slot').forEach(el => {
        el.addEventListener('click', (e) => {
            openGrimoire();
        });
    });
    const grimoireBtn = container.querySelector('#openGrimoireBtn');
    if (grimoireBtn) {
        grimoireBtn.addEventListener('click', () => openGrimoire());
    }
}
// Main UI effects
export function setupUIEffects() {
    // Vitals
    effect(() => {
        const el = getEl("willValue");
        if (el)
            el.innerText = Math.floor(will.value).toString();
    });
    effect(() => {
        const el = getEl("healthValue");
        if (el)
            el.innerText = health.value.toString();
    });
    effect(() => {
        const el = getEl("nooseValue");
        const fill = getEl("nooseFill");
        if (el)
            el.innerText = Math.floor(kalgothsNoose.value).toString();
        if (fill)
            fill.style.width = kalgothsNoose.value + "%";
    });
    effect(() => {
        const el = getEl("quotaRemaining");
        if (el)
            el.innerText = quotaRemaining.value.toString();
    });
    effect(() => {
        const el = getEl("circlePowerValue");
        const fill = getEl("circlePowerFill");
        if (el)
            el.innerText = circlePower.value.toString();
        if (fill)
            fill.style.width = circlePower.value + "%";
    });
    effect(() => {
        const el = getEl("banishPower");
        if (el)
            el.innerText = banishPower.value.toString();
    });
    effect(() => {
        const el = getEl("captureCount");
        if (el)
            el.innerText = capturedDemons.value.length.toString();
    });
    // Mastery
    effect(() => {
        const el = getEl("masteryLevel");
        if (el)
            el.innerText = masteryLevel.value.toString();
    });
    effect(() => {
        const el = getEl("masteryXP");
        if (el)
            el.innerText = masteryXP.value.toString();
    });
    effect(() => {
        const el = getEl("masteryNeeded");
        if (el)
            el.innerText = masteryNeeded.value.toString();
    });
    effect(() => {
        const fill = getEl("masteryFill");
        if (fill)
            fill.style.width = (masteryXP.value / masteryNeeded.value) * 100 + "%";
    });
    // Circle Mastery
    effect(() => {
        const el = getEl("circleMasteryValue");
        if (el)
            el.innerText = circleMastery.value.toString();
    });
    // Seed Resonance
    effect(() => {
        const el = getEl("seedResonanceValue") || getEl("bloodResonanceValue");
        if (el)
            el.innerText = `${seedResonance.value}/${maxSeedResonance.value}`;
        const consoleSeed = getEl("consoleBlood");
        if (consoleSeed)
            consoleSeed.innerText = `${seedResonance.value}/${maxSeedResonance.value}`;
    });
    // Familiar
    effect(() => {
        const el = getEl("familiarLevel");
        if (el)
            el.innerText = familiar.value.level.toString();
    });
    effect(() => {
        const fill = getEl("xpFill");
        if (fill)
            fill.style.width = (familiar.value.xp / familiar.value.nextXP) * 100 + "%";
    });
    effect(() => {
        const el = getEl("familiarXP");
        if (el)
            el.innerText = `XP: ${familiar.value.xp}/${familiar.value.nextXP}`;
    });
    effect(() => {
        const el = getEl("familiarMood");
        if (el)
            el.innerText = `Mood: ${familiar.value.mood}%`;
    });
    effect(() => {
        const abilities = familiar.value.abilities;
        const abilityNames = [];
        if (abilities.includes("scout"))
            abilityNames.push("Scout");
        if (abilities.includes("ward"))
            abilityNames.push("Ward");
        if (abilities.includes("guidance"))
            abilityNames.push("Guidance");
        if (abilities.includes("presence"))
            abilityNames.push("Presence");
        const el = getEl("familiarAbilities");
        if (el)
            el.innerHTML = abilityNames.join(" · ");
    });
    // Whisp tooltip
    effect(() => {
        const whispSprite = getEl('whispSpriteClick');
        if (whispSprite) {
            let tip = `Whisp Lv.${familiar.value.level}`;
            if (familiar.value.abilities.includes('scout'))
                tip += '\nScout: +20% find';
            if (familiar.value.abilities.includes('ward'))
                tip += '\nWard: -15% Noose';
            if (familiar.value.abilities.includes('guidance'))
                tip += '\nGuidance: +20% trace';
            if (familiar.value.abilities.includes('presence'))
                tip += '\nPresence: +10% dominate';
            whispSprite.setAttribute('data-tooltip', tip);
        }
    });
    // Crafted counts
    effect(() => {
        const el = getEl("simpleCraftedList");
        if (el) {
            el.innerHTML = `Powder:${crafted.value.powderOfWarding} | Phial:${crafted.value.phialOfSubjugation} | Restore:${crafted.value.restorativeDraught}`;
        }
    });
    effect(() => {
        const el = getEl("consolePowder");
        if (el)
            el.innerText = crafted.value.powderOfWarding.toString();
    });
    effect(() => {
        const el = getEl("consolePhial");
        if (el)
            el.innerText = crafted.value.phialOfSubjugation.toString();
    });
    effect(() => {
        const el = getEl("consoleIchor");
        if (el)
            el.innerText = (ingredients.value.demonIchor || 0).toString();
    });
    effect(() => {
        const el = getEl("consoleIntegrity");
        if (el)
            el.innerText = `Power: ${circlePower.value}%`;
    });
    // Demon overlay - FIXED: higher z-index, proper cleanup
    effect(() => {
        const demonOverlay = getEl("demonOverlay");
        const demonOverlayImg = getEl("demonOverlayImg");
        if (demonOverlay && demonOverlayImg) {
            if (activeDemon.value?.image) {
                demonOverlayImg.src = activeDemon.value.image;
                demonOverlay.style.display = "block";
                demonOverlay.style.zIndex = "15"; // Ensure it's above circle elements
            }
            else {
                demonOverlay.style.display = "none";
                demonOverlayImg.src = "";
            }
        }
    });
    effect(() => {
        const demonActionPanel = getEl("demonActionPanel");
        if (demonActionPanel) {
            demonActionPanel.style.display = activeDemon.value ? "block" : "none";
        }
    });
    effect(() => {
        const demonArea = getEl("demonArea");
        if (demonArea) {
            if (!activeDemon.value) {
                demonArea.innerHTML = `🌀 No entity bound`;
            }
            else {
                demonArea.innerHTML = `<strong>🜁 ${activeDemon.value.name} (${activeDemon.value.trait})</strong>`;
            }
        }
    });
    // Escape area
    effect(() => {
        const canEscape = circlePower.value >= 100 && hasSpecialIngredient.value && orbexFragments.value >= 6;
        const escapeArea = getEl("escapeArea");
        const consoleEscapeArea = getEl("consoleEscapeArea");
        if (escapeArea)
            escapeArea.style.display = canEscape ? "block" : "none";
        if (consoleEscapeArea)
            consoleEscapeArea.style.display = canEscape ? "block" : "none";
    });
    // Ritual circle power glow
    effect(() => {
        const ritual = getEl("ritualCircle");
        if (ritual) {
            ritual.classList.remove("power-low", "power-mid", "power-high", "power-full");
            if (circlePower.value >= 90)
                ritual.classList.add("power-full");
            else if (circlePower.value >= 60)
                ritual.classList.add("power-high");
            else if (circlePower.value >= 30)
                ritual.classList.add("power-mid");
            else if (circlePower.value > 0)
                ritual.classList.add("power-low");
        }
    });
    effect(() => {
        const halo = getEl('ritualHalo');
        const allRunesEtched = runeSlots.value.every(r => r);
        if (halo) {
            halo.style.display = (circleQuality.value > 0 && allRunesEtched) ? 'block' : 'none';
        }
    });
    // Fragment collection milestone
    effect(() => {
        if (orbexFragments.value > lastFragmentCount) {
            triggerScreenPulse('#d4af37');
            whispSay(`Another fragment. Orbex stirs... (${orbexFragments.value}/6)`);
            lastFragmentCount = orbexFragments.value;
        }
    });
    // Timer display
    effect(() => {
        const mins = Math.floor(timerSeconds.value / 60);
        const secs = timerSeconds.value % 60;
        const timerDisplay = getEl("timerDisplay");
        const dayProgressFill = getEl("dayProgressFill");
        if (timerDisplay) {
            timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        if (dayProgressFill) {
            dayProgressFill.style.width = (timerSeconds.value / 600) * 100 + "%";
        }
    });
    // Ash pile
    effect(() => {
        const ashArea = getEl("ashPileArea");
        if (ashArea)
            ashArea.style.display = ashAvailable.value ? "block" : "none";
    });
    // Orbex panel
    effect(() => updateOrbexPanel());
    // Console rune slots/grid
    effect(() => renderConsoleRuneSlots());
    effect(() => renderConsoleRuneGrid());
    // Resource summary
    effect(() => updateResourceSummary());
    // Rune slots on main circle
    effect(() => updateRuneSlots());
    // Card slots
    effect(() => renderCardSlots());
}
// Legacy updateUI for backward compatibility
export function updateUI() {
    initTooltips();
    let tetherCanvas = getEl("tetherCanvas");
    if (!tetherCanvas) {
        tetherCanvas = document.createElement("canvas");
        tetherCanvas.id = "tetherCanvas";
        tetherCanvas.width = 440;
        tetherCanvas.height = 440;
        tetherCanvas.style.cssText = "position:absolute; top:0; left:0; pointer-events:none; border-radius:50%;";
        const ritualCircle = getEl("ritualCircle");
        if (ritualCircle) {
            ritualCircle.style.position = "relative";
            ritualCircle.appendChild(tetherCanvas);
        }
    }
    drawRuneTethers();
    renderCardSlots();
}
export function initOrbitAnimation() {
    let tetherCanvas = getEl("tetherCanvas");
    if (!tetherCanvas) {
        tetherCanvas = document.createElement("canvas");
        tetherCanvas.id = "tetherCanvas";
        tetherCanvas.width = 440;
        tetherCanvas.height = 440;
        tetherCanvas.style.cssText = "position:absolute; top:0; left:0; pointer-events:none; border-radius:50%;";
        const ritualCircle = getEl("ritualCircle");
        if (ritualCircle) {
            ritualCircle.style.position = "relative";
            ritualCircle.appendChild(tetherCanvas);
        }
    }
    startOrbitAnimation();
}
window.openWhispStats = openWhispStats;
