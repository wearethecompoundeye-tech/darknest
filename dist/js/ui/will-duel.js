import { will, maxWill, health, kalgothsNoose, circlePower, circleMastery, orbexFragments, seedResonance, familiar, getEquippedCards } from '../core/state-signals.js';
import { el } from '../core/dom-helper.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import { addLog } from './log-manager.js';
let currentConfig = null;
let duelState = null;
let duelModal = null;
export function openWillDuel(config) {
    currentConfig = config;
    // Calculate player's Will Power
    const baseWill = will.value;
    const circleBonus = Math.floor(circlePower.value / 5);
    const fragmentBonus = orbexFragments.value * 3;
    const whispBonus = familiar.value.level * 2;
    const masteryBonus = Math.floor(circleMastery.value / 2);
    const playerWillPower = baseWill + circleBonus + fragmentBonus + whispBonus + masteryBonus;
    // Draw hand (up to 3 spells from equipped)
    const equippedSpells = getEquippedCards('spell');
    const hand = equippedSpells.slice(0, 3);
    duelState = {
        hollowResistance: config.baseResistance,
        maxResistance: config.baseResistance,
        playerWillPower,
        successes: 0,
        failures: 0,
        hand,
        battleLog: [`You face ${config.hollowName}, a corrupted Acolyte.`],
        phase: 'player'
    };
    if (duelModal)
        duelModal.remove();
    duelModal = createDuelModal();
    document.body.appendChild(duelModal);
    duelModal.style.display = 'flex';
    renderDuelUI();
    playSfx('duel_start');
    startLoop('demonSummonBg');
}
function createDuelModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'willDuelModal';
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.95)';
    modal.style.backdropFilter = 'blur(12px)';
    modal.style.zIndex = '2000';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.innerHTML = `
    <div class="modal-content duel-content" style="max-width:700px; width:95%; background:#0a0508; border:2px solid #6a4a3a; border-radius:32px; padding:24px; box-shadow:0 0 0 1px #8a7a5a inset, 0 20px 40px #000; color:#e0d8cc;">
      <h3 style="margin:0 0 20px; color:#b8a890; text-align:center; text-shadow:0 0 10px #5a4a3a;">🌑 WILL DUEL 🌑</h3>
      <div style="display:flex; gap:20px;">
        <!-- Hollow Portrait -->
        <div style="flex:1; text-align:center;">
          <div id="hollowPortrait" style="width:200px; height:250px; margin:0 auto; border:2px solid #5a4a3a; border-radius:16px; overflow:hidden; box-shadow:0 0 20px rgba(90,74,58,0.5);">
            <img id="hollowImg" src="" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <h4 id="hollowName" style="margin:10px 0 5px; color:#c0a0a0;">Hollow Acolyte</h4>
          <div class="progress-bar" style="margin-bottom:5px;"><div id="resistanceBar" class="progress-fill" style="width:100%; background:#8a4a6a;"></div></div>
          <span id="resistanceText">Resistance: 15/15</span>
        </div>
        <!-- Player Info -->
        <div style="flex:1;">
          <h4 style="margin:0 0 15px; color:#c0b8a8; text-align:center;">Your Will</h4>
          <div style="background:rgba(0,0,0,0.5); border:1px solid #5a4a3a; border-radius:16px; padding:16px;">
            <p style="text-align:center; font-size:1.8rem; margin:0 0 10px;" id="willPowerDisplay">${duelState?.playerWillPower || 0}</p>
            <p style="text-align:center; font-size:0.8rem; color:#a09080;">Will Power</p>
            <div style="margin-top:15px;">
              <p style="margin:5px 0;">✨ Successes: <span id="successCount">0/3</span></p>
              <p style="margin:5px 0;">💔 Failures: <span id="failureCount">0/2</span></p>
            </div>
          </div>
        </div>
      </div>
      <!-- Battle Log -->
      <div id="duelLog" style="margin:20px 0; padding:10px; background:rgba(0,0,0,0.5); border:1px solid #5a4a3a; border-radius:12px; min-height:60px; max-height:80px; overflow-y:auto; font-size:0.9rem;"></div>
      <!-- Hand (Spell Cards) -->
      <div id="spellHand" style="display:flex; gap:10px; justify-content:center; margin-bottom:20px;"></div>
      <!-- Action Buttons -->
      <div id="actionButtons" style="display:flex; gap:15px; justify-content:center;">
        <button id="assertBtn" class="craft-btn" style="padding:12px 24px;">⚔️ Assert Dominance</button>
        <button id="empathizeBtn" class="craft-btn" style="padding:12px 24px; background:#4a6a4a;">🤝 Empathize</button>
        <button id="invokeBtn" class="craft-btn" style="padding:12px 24px; background:#6a5a2a;">🔮 Invoke Orbex</button>
      </div>
      <div style="margin-top:15px; text-align:center;">
        <span style="color:#a09080; font-size:0.8rem;">Will: ${will.value}/${maxWill.value} | Seed Resonance: ${seedResonance.value}</span>
      </div>
    </div>
  `;
    modal.querySelector('#assertBtn').addEventListener('click', () => handleChoice('assert'));
    modal.querySelector('#empathizeBtn').addEventListener('click', () => handleChoice('empathize'));
    modal.querySelector('#invokeBtn').addEventListener('click', () => handleChoice('invoke'));
    return modal;
}
function renderDuelUI() {
    if (!duelState || !currentConfig)
        return;
    const hollowImg = el('hollowImg');
    const hollowName = el('hollowName');
    const resistanceBar = el('resistanceBar');
    const resistanceText = el('resistanceText');
    const willPowerDisplay = el('willPowerDisplay');
    const successCount = el('successCount');
    const failureCount = el('failureCount');
    const duelLog = el('duelLog');
    if (hollowImg)
        hollowImg.src = currentConfig.hollowPortrait;
    if (hollowName)
        hollowName.textContent = currentConfig.hollowName;
    if (resistanceBar)
        resistanceBar.style.width = `${(duelState.hollowResistance / duelState.maxResistance) * 100}%`;
    if (resistanceText)
        resistanceText.textContent = `Resistance: ${duelState.hollowResistance}/${duelState.maxResistance}`;
    if (willPowerDisplay)
        willPowerDisplay.textContent = duelState.playerWillPower.toString();
    if (successCount)
        successCount.textContent = `${duelState.successes}/3`;
    if (failureCount)
        failureCount.textContent = `${duelState.failures}/2`;
    if (duelLog) {
        duelLog.innerHTML = duelState.battleLog.map(msg => `<div>> ${msg}</div>`).join('');
        duelLog.scrollTop = duelLog.scrollHeight;
    }
    // Render hand
    const handEl = el('spellHand');
    if (handEl) {
        handEl.innerHTML = '';
        duelState.hand.forEach((spell, index) => {
            const spellEl = createSpellElement(spell, index);
            handEl.appendChild(spellEl);
        });
        if (duelState.hand.length === 0) {
            handEl.innerHTML = '<p style="color:#a09080;">No spells equipped</p>';
        }
    }
    // Update button states
    const buttons = ['assertBtn', 'empathizeBtn', 'invokeBtn'];
    buttons.forEach(id => {
        const btn = el(id);
        if (btn)
            btn.disabled = duelState.phase !== 'player';
    });
}
function createSpellElement(spell, index) {
    const div = document.createElement('div');
    div.className = `spell-card card-${spell.rarity}`;
    div.style.position = 'relative';
    div.style.width = '80px';
    div.style.cursor = 'pointer';
    div.style.borderRadius = '8px';
    div.style.overflow = 'hidden';
    div.style.transition = 'transform 0.15s';
    div.style.aspectRatio = '3/4';
    div.innerHTML = `
    <img src="${spell.image}" style="width:100%; height:100%; object-fit:cover;">
    <img src="${spell.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;">
    <div style="position:absolute; bottom:2px; left:2px; background:rgba(0,0,0,0.7); padding:2px 4px; border-radius:10px; font-size:0.6rem; color:#e0d8cc;">
      ${spell.stats.cost} Will
    </div>
  `;
    div.addEventListener('click', () => handleSpellCast(index));
    div.addEventListener('mouseenter', () => { div.style.transform = 'scale(1.05)'; });
    div.addEventListener('mouseleave', () => { div.style.transform = 'scale(1)'; });
    return div;
}
function handleSpellCast(index) {
    if (!duelState || duelState.phase !== 'player')
        return;
    const spell = duelState.hand[index];
    if (!spell)
        return;
    const spellStats = spell.stats;
    if (will.value < spellStats.cost) {
        addLog('Not enough Will!', true);
        return;
    }
    will.value -= spellStats.cost;
    // Apply spell effect (simplified for Will Duel)
    let effectMessage = '';
    let bonus = 0;
    if (spell.id.includes('sorrow') || spell.id.includes('gaze')) {
        bonus = 3;
        effectMessage = `reduces the Hollow's resistance by 3!`;
    }
    else if (spell.id.includes('benediction') || spell.id.includes('will')) {
        duelState.playerWillPower += 5;
        effectMessage = `bolsters your will power by 5!`;
    }
    else if (spell.id.includes('whisper')) {
        bonus = 5;
        effectMessage = `shakes the Hollow's resolve, reducing resistance by 5!`;
    }
    else {
        bonus = 2;
        effectMessage = `disrupts the Hollow slightly.`;
    }
    if (bonus > 0) {
        duelState.hollowResistance = Math.max(0, duelState.hollowResistance - bonus);
    }
    duelState.battleLog.push(`You cast ${spell.name}: ${effectMessage}`);
    duelState.hand.splice(index, 1);
    playSfx('card_play');
    renderDuelUI();
    checkDuelEnd();
}
function handleChoice(choice) {
    if (!duelState || duelState.phase !== 'player')
        return;
    let successChance = 0;
    let willCost = 0;
    let nooseReduction = 0;
    let message = '';
    switch (choice) {
        case 'assert':
            willCost = 10;
            if (will.value < willCost) {
                addLog('Not enough Will!', true);
                return;
            }
            will.value -= willCost;
            successChance = 0.6 + (duelState.playerWillPower / 50);
            message = 'You attempt to dominate the Hollow\'s will.';
            break;
        case 'empathize':
            willCost = 5;
            if (will.value < willCost) {
                addLog('Not enough Will!', true);
                return;
            }
            will.value -= willCost;
            successChance = 0.4 + (familiar.value.level * 0.05) + (duelState.playerWillPower / 60);
            nooseReduction = 3;
            message = 'You reach out with empathy, seeking the Acolyte\'s buried self.';
            break;
        case 'invoke':
            if (seedResonance.value < 1) {
                addLog('Not enough Seed Resonance!', true);
                return;
            }
            seedResonance.value--;
            successChance = 0.95;
            message = 'You channel the power of Orbex itself.';
            break;
    }
    duelState.phase = 'resolving';
    renderDuelUI();
    duelState.battleLog.push(message);
    setTimeout(() => {
        if (!duelState)
            return;
        const success = Math.random() < successChance;
        if (success) {
            duelState.successes++;
            duelState.hollowResistance = Math.max(0, duelState.hollowResistance - 5);
            duelState.battleLog.push(`Success! The Hollow's resistance crumbles.`);
            if (nooseReduction > 0) {
                kalgothsNoose.value = Math.max(0, kalgothsNoose.value - nooseReduction);
            }
            playSfx('choice_empathize');
        }
        else {
            duelState.failures++;
            duelState.playerWillPower -= 5;
            health.value = Math.max(0, health.value - 5);
            duelState.battleLog.push(`Failure. The Hollow resists.`);
            playSfx('duel_fail');
        }
        renderDuelUI();
        checkDuelEnd();
        if (duelState.successes < 3 && duelState.failures < 2 && duelState.hollowResistance > 0) {
            duelState.phase = 'player';
            renderDuelUI();
        }
    }, 800);
}
function checkDuelEnd() {
    if (!duelState || !currentConfig)
        return;
    if (duelState.successes >= 3) {
        // Victory
        duelState.battleLog.push(`Victory! The Hollow Acolyte is purified.`);
        renderDuelUI();
        stopLoop('demonSummonBg');
        playSfx('duel_success');
        setTimeout(() => {
            if (currentConfig?.onVictory)
                currentConfig.onVictory();
            closeDuelModal();
        }, 1500);
    }
    else if (duelState.failures >= 2) {
        // Defeat
        duelState.battleLog.push(`Defeat... The Hollow escapes.`);
        renderDuelUI();
        stopLoop('demonSummonBg');
        playSfx('duel_fail');
        setTimeout(() => {
            if (currentConfig?.onDefeat)
                currentConfig.onDefeat();
            closeDuelModal();
        }, 1500);
    }
    else if (duelState.hollowResistance <= 0 && duelState.successes < 3) {
        // Resistance broken early
        duelState.successes = 3;
        duelState.battleLog.push(`The Hollow's resistance is shattered! Victory!`);
        renderDuelUI();
        stopLoop('demonSummonBg');
        playSfx('duel_success');
        setTimeout(() => {
            if (currentConfig?.onVictory)
                currentConfig.onVictory();
            closeDuelModal();
        }, 1500);
    }
}
function closeDuelModal() {
    if (duelModal) {
        duelModal.style.display = 'none';
        duelModal.remove();
        duelModal = null;
    }
    stopLoop('demonSummonBg');
    currentConfig = null;
    duelState = null;
}
