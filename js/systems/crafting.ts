// js/systems/crafting.ts
// Redesigned: No easy explore, balanced resource acquisition through strategic actions

import { batch } from '@preact/signals-core';
import { ritualEngine } from './ritual-engine.js';
import {
  ingredients,
  crafted,
  masteryLevel,
  circleIntegrity,
  knownRunes,
  discoveries,
  tutorial,
  suspicion,
  updateState,
  addMasteryXP,
  CONSTANTS,
  will,
  maxWill
} from '../core/state-signals.js';
import { addLog } from '../ui/log-manager.js';
import { addLedgerEntry } from '../ui/ledger.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import { startPhialBrewing } from '../minigames/phial-brew.js';
import { runeData } from '../data/runes.js';

function getMasteryCraftBonus(): { successBonus: number; yieldBonus: number } {
  return {
    successBonus: masteryLevel.value * 0.02,
    yieldBonus: 1 + (masteryLevel.value * 0.05)
  };
}

export function craftPowder(): void {
  if (ingredients.value.nightshadeMoss < 1 || ingredients.value.cryptPhlegm < 1) {
    addLog("Missing Moss or Phlegm.", true);
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal";
  overlay.style.display = "flex";
  overlay.innerHTML = `
    <div class="modal-content" style="max-width:450px; text-align:center;">
      <h3>🜟 Precision Grind</h3>
      <p>Keep the pestle within the green ring. Straying outside slows progress.</p>
      <canvas id="grindCanvas" width="350" height="350" style="background:#1a0e1a; border-radius:20px; margin:10px 0;"></canvas>
      <div class="progress-bar" style="width:100%;"><div id="grindProgress" class="progress-fill" style="width:0%; background:#7ea04b;"></div></div>
      <p id="grindStatus">Quality: 0%</p>
      <p>Bonus Powders: <span id="bonusCounter">0</span></p>
      <button id="cancelGrindBtn" class="craft-btn">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
  startLoop("grinding");

  const canvas = overlay.querySelector("#grindCanvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  const progressFill = overlay.querySelector("#grindProgress") as HTMLElement;
  const statusEl = overlay.querySelector("#grindStatus") as HTMLElement;
  const bonusEl = overlay.querySelector("#bonusCounter") as HTMLElement;

  let grinding = false;
  let grindAmount = 0;
  let bonusPowders = 0;
  let lastAngle: number | null = null;
  let rotationTotal = 0;
  let inZoneTime = 0;
  const REQUIRED_ROTATION = 6 * Math.PI;
  const ZONE_INNER = 50;
  const ZONE_OUTER = 90;

  function drawMortar(pestleX: number, pestleY: number, inZone: boolean): void {
    ctx.clearRect(0, 0, 350, 350);
    ctx.beginPath();
    ctx.ellipse(175, 180, 110, 70, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#3a2a2a";
    ctx.fill();
    ctx.strokeStyle = "#6a4a3a";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(175, 180, ZONE_OUTER, ZONE_OUTER * 0.64, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#7ea04b";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(175, 180, ZONE_INNER, ZONE_INNER * 0.64, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const glow = Math.min(1, grindAmount / REQUIRED_ROTATION);
    ctx.beginPath();
    ctx.ellipse(175, 180, 80, 50, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(126, 160, 75, ${0.3 + glow * 0.5})`;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(pestleX, pestleY, 18, 35, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = inZone ? "#7ea04b" : "#8a6a4a";
    ctx.fill();
    ctx.strokeStyle = "#aa8a6a";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  let pestleX = 175, pestleY = 160;
  drawMortar(pestleX, pestleY, true);

  function handleMouseMove(e: MouseEvent): void {
    if (!grinding) return;
    const rect = canvas.getBoundingClientRect();
    const scale = 350 / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    const dx = x - 175;
    const dy = y - 180;
    const dist = Math.hypot(dx / 110, dy / 70);
    if (dist > 0.9) return;

    pestleX = x;
    pestleY = y;
    const angle = Math.atan2(y - 180, x - 175);
    const scaledDist = Math.hypot(dx, dy * 1.57);
    const inZone = scaledDist >= ZONE_INNER && scaledDist <= ZONE_OUTER;

    if (lastAngle !== null) {
      let delta = angle - lastAngle;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      if (Math.abs(delta) < 0.5) {
        const efficiency = inZone ? 1.5 : 0.4;
        rotationTotal += Math.abs(delta) * efficiency;
        grindAmount = Math.min(REQUIRED_ROTATION, rotationTotal);
        const percent = Math.floor((grindAmount / REQUIRED_ROTATION) * 100);
        progressFill.style.width = percent + "%";
        statusEl.textContent = `Quality: ${percent}%`;
        if (inZone) {
          inZoneTime++;
          if (inZoneTime % 30 === 0) {
            bonusPowders++;
            bonusEl.textContent = bonusPowders.toString();
          }
        }
      }
    }
    lastAngle = angle;
    drawMortar(pestleX, pestleY, inZone);
    if (grindAmount >= REQUIRED_ROTATION) finishGrinding(true);
  }

  function finishGrinding(success: boolean): void {
    grinding = false;
    stopLoop("grinding");
    canvas.removeEventListener("mousemove", handleMouseMove);
    canvas.removeEventListener("mouseup", handleMouseUp);
    canvas.removeEventListener("mouseleave", handleMouseUp);
    overlay.remove();

    const { successBonus, yieldBonus } = getMasteryCraftBonus();
    const effectiveSuccess = success ? true : (Math.random() < successBonus);

    if (effectiveSuccess) {
      const baseAmount = Math.floor(1 * yieldBonus);
      const totalAmount = baseAmount + bonusPowders;
      batch(() => {
        ingredients.value = {
          ...ingredients.value,
          nightshadeMoss: ingredients.value.nightshadeMoss - 1,
          cryptPhlegm: ingredients.value.cryptPhlegm - 1
        };
        crafted.value = {
          ...crafted.value,
          powderOfWarding: crafted.value.powderOfWarding + totalAmount
        };
        if (!discoveries.value.ingredients.includes('nightshadeMoss')) {
          discoveries.value = {
            ...discoveries.value,
            ingredients: [...discoveries.value.ingredients, 'nightshadeMoss']
          };
        }
        if (!discoveries.value.ingredients.includes('cryptPhlegm')) {
          discoveries.value = {
            ...discoveries.value,
            ingredients: [...discoveries.value.ingredients, 'cryptPhlegm']
          };
        }
      });
      addLog(`Powder of Warding crafted! +${totalAmount} ${totalAmount > 1 ? 'powders' : 'powder'}${bonusPowders > 0 ? ' (including ' + bonusPowders + ' bonus)' : ''}`, false, 'player');
      ritualEngine.recordAction('grind', Math.min(1.0, grindAmount / REQUIRED_ROTATION));
      addMasteryXP(5 + bonusPowders * 2);
      playSfx('powderSuccess');
      addLedgerEntry('craft', { item: 'Powder of Warding', amount: totalAmount });
    } else {
      batch(() => {
        if (Math.random() < 0.5) {
          ingredients.value = { ...ingredients.value, nightshadeMoss: ingredients.value.nightshadeMoss - 1 };
        } else {
          ingredients.value = { ...ingredients.value, cryptPhlegm: ingredients.value.cryptPhlegm - 1 };
        }
      });
      addLog(`Grinding failed. One ingredient lost.`, true);
      playSfx('craftFail');
    }
  }

  function handleMouseDown(e: MouseEvent): void {
    grinding = true;
    startLoop("grinding");
    lastAngle = null;
    inZoneTime = 0;
    bonusPowders = 0;
    bonusEl.textContent = '0';
    const rect = canvas.getBoundingClientRect();
    const scale = 350 / rect.width;
    pestleX = (e.clientX - rect.left) * scale;
    pestleY = (e.clientY - rect.top) * scale;
    drawMortar(pestleX, pestleY, true);
  }

  function handleMouseUp(): void {
    if (grinding && grindAmount < REQUIRED_ROTATION) finishGrinding(false);
    grinding = false;
  }

  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mouseleave", handleMouseUp);

  overlay.querySelector("#cancelGrindBtn")!.addEventListener("click", () => {
    grinding = false;
    stopLoop("grinding");
    canvas.removeEventListener("mousemove", handleMouseMove);
    canvas.removeEventListener("mouseup", handleMouseUp);
    canvas.removeEventListener("mouseleave", handleMouseUp);
    overlay.remove();
    addLog("Crafting cancelled.");
  });
}

export function craftPotion(precise: boolean = false): void {
  if (ingredients.value.cryptPhlegm < 1 || ingredients.value.bansheeSalts < 1) {
    addLog("Missing Phlegm or Banshee Salts.", true);
    return;
  }
  if (!precise) {
    const { successBonus, yieldBonus } = getMasteryCraftBonus();
    const successChance = 0.5 + successBonus + (circleIntegrity.value / 200);
    const success = Math.random() < successChance;

    batch(() => {
      ingredients.value = {
        ...ingredients.value,
        cryptPhlegm: ingredients.value.cryptPhlegm - 1,
        bansheeSalts: ingredients.value.bansheeSalts - 1
      };

      if (success) {
        const amount = Math.floor(1 * yieldBonus);
        crafted.value = {
          ...crafted.value,
          phialOfSubjugation: crafted.value.phialOfSubjugation + amount
        };
        if (!discoveries.value.ingredients.includes('bansheeSalts')) {
          discoveries.value = {
            ...discoveries.value,
            ingredients: [...discoveries.value.ingredients, 'bansheeSalts']
          };
        }
        addLog(`Quick Brew successful! +${amount} Phial.`, false, 'player');
        addMasteryXP(4);
        playSfx('phialSuccess');
        addLedgerEntry('craft', { item: 'Phial of Subjugation', amount });
      } else {
        if (Math.random() < 0.5) {
          ingredients.value = { ...ingredients.value, cryptPhlegm: ingredients.value.cryptPhlegm - 1 };
        } else {
          ingredients.value = { ...ingredients.value, bansheeSalts: ingredients.value.bansheeSalts - 1 };
        }
        addLog(`Quick Brew failed. One ingredient lost.`, true);
        playSfx('phialFail');
      }
    });
    return;
  }
  startPhialBrewing();
}

export function quickCraftPowder(): void {
  if (ingredients.value.nightshadeMoss < 1 || ingredients.value.cryptPhlegm < 1) {
    addLog("Missing Moss or Phlegm.", true);
    return;
  }
  const { successBonus, yieldBonus } = getMasteryCraftBonus();
  const successChance = 0.6 + successBonus;

  batch(() => {
    ingredients.value = {
      ...ingredients.value,
      nightshadeMoss: ingredients.value.nightshadeMoss - 1,
      cryptPhlegm: ingredients.value.cryptPhlegm - 1
    };

    if (Math.random() < successChance) {
      const amount = Math.floor(1 * yieldBonus);
      crafted.value = {
        ...crafted.value,
        powderOfWarding: crafted.value.powderOfWarding + amount
      };
      addLog(`Quick Powder crafted! +${amount}`, false, 'player');
      addMasteryXP(4);
      playSfx('powderSuccess');
      addLedgerEntry('craft', { item: 'Powder of Warding', amount });
    } else {
      addLog(`Quick Powder failed. Ingredients lost.`, true);
      playSfx('craftFail');
    }
  });
}

export function quickCraftPhial(): void {
  craftPotion(false);
}

export function craftRestorative(): void {
  if (ingredients.value.nightshadeMoss < 2 || ingredients.value.cryptPhlegm < 2 || ingredients.value.bansheeSalts < 1) {
    addLog("Need 2 Moss, 2 Phlegm, and 1 Banshee Salts.", true);
    return;
  }

  const { yieldBonus } = getMasteryCraftBonus();
  const amount = Math.floor(1 * yieldBonus);

  batch(() => {
    ingredients.value = {
      ...ingredients.value,
      nightshadeMoss: ingredients.value.nightshadeMoss - 2,
      cryptPhlegm: ingredients.value.cryptPhlegm - 2,
      bansheeSalts: ingredients.value.bansheeSalts - 1
    };
    crafted.value = {
      ...crafted.value,
      restorativeDraught: crafted.value.restorativeDraught + amount
    };

    ['nightshadeMoss', 'cryptPhlegm', 'bansheeSalts'].forEach(ing => {
      if (!discoveries.value.ingredients.includes(ing)) {
        discoveries.value = {
          ...discoveries.value,
          ingredients: [...discoveries.value.ingredients, ing]
        };
      }
    });
  });

  addLog(`Restorative Draught crafted. +${amount}`, false, 'player');
  addMasteryXP(3);
  playSfx('craftRestoreDraught');
  addLedgerEntry('craft', { item: 'Restorative Draught', amount });
}

export function studyRune(): void {
  if (ingredients.value.nightshadeMoss < 5 || ingredients.value.cryptPhlegm < 5) {
    addLog("Need 5 Moss and 5 Phlegm to study.", true);
    return;
  }

  const unknown = runeData.filter(r => !knownRunes.value.includes(r.name));
  if (unknown.length === 0) {
    addLog("All runes known.", true);
    return;
  }

  batch(() => {
    ingredients.value = {
      ...ingredients.value,
      nightshadeMoss: ingredients.value.nightshadeMoss - 5,
      cryptPhlegm: ingredients.value.cryptPhlegm - 5
    };

    const newRune = unknown[Math.floor(Math.random() * unknown.length)].name;
    knownRunes.value = [...knownRunes.value, newRune];

    if (!discoveries.value.runes.includes(newRune)) {
      discoveries.value = {
        ...discoveries.value,
        runes: [...discoveries.value.runes, newRune]
      };
    }

    addLog(`📖 Through study, you learn the rune ${newRune}!`, false, 'player');
    ritualEngine.recordAction('study', 0.8, newRune);
    addMasteryXP(15);
    playSfx('learnRune');
    addLedgerEntry('discovery', { discoveryType: 'rune', name: newRune });

    if (!tutorial.value.firstRuneStudied) {
      tutorial.value = { ...tutorial.value, firstRuneStudied: true };
      addLog('📖 Tome updated: Rune Study.', false, 'system');
    }
  });
}