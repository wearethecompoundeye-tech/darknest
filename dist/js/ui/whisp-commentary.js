// js/ui/whisp-commentary.ts
// Whisp reactive commentary system with combo detection
// Full file - no snippets
import { effect } from '@preact/signals-core';
import { health, will, suspicion, orbexFragments, corruptionLevel, activeDemon, totalSummons, totalExplorations, crafted, ingredients } from '../core/state-signals.js';
import { getWhispCommentary } from '../ai/ai-engine.js';
import { checkForCombos } from '../systems/card-progression.js';
let commentaryTimeout = null;
let bubble = null;
let whispEnabled = true;
// Track previous values for change detection
let prevHealth = health.value;
let prevWill = will.value;
let prevSuspicion = suspicion.value;
let prevFragments = orbexFragments.value;
let prevCorruption = corruptionLevel.value;
let prevActiveDemon = activeDemon.value;
let prevPowder = crafted.value.powderOfWarding;
let prevPhial = crafted.value.phialOfSubjugation;
let prevMoss = ingredients.value.nightshadeMoss;
let prevIchor = ingredients.value.demonIchor;
let prevSummons = totalSummons.value;
let prevExplorations = totalExplorations.value;
// Combo tracking
let lastComboCount = 0;
let whispComboAcknowledged = false;
export function setWhispEnabled(enabled) {
    whispEnabled = enabled;
    if (!enabled && bubble) {
        bubble.style.display = 'none';
    }
}
export function isWhispEnabled() {
    return whispEnabled;
}
function createBubble() {
    const div = document.createElement('div');
    div.id = 'whispCommentaryBubble';
    div.style.cssText = `
    position: fixed; bottom: 20px; left: 20px; max-width: 300px;
    background: rgba(10, 5, 20, 0.95); border: 2px solid #7ea04b;
    border-radius: 20px 20px 20px 4px; padding: 12px 16px;
    color: #e7dacf; font-size: 0.9rem; backdrop-filter: blur(8px);
    z-index: 10000; box-shadow: 0 4px 20px rgba(0,0,0,0.7), 0 0 15px #5a7a3a;
    transition: opacity 0.3s; pointer-events: none; display: none;
    font-style: italic;
  `;
    const style = document.createElement('style');
    style.textContent = `
    #whispCommentaryBubble::before {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 20px;
      width: 0;
      height: 0;
      border-left: 10px solid transparent;
      border-right: 10px solid transparent;
      border-top: 10px solid rgba(10, 5, 20, 0.95);
    }
    #whispCommentaryBubble::after {
      content: '';
      position: absolute;
      bottom: -13px;
      left: 18px;
      width: 0;
      height: 0;
      border-left: 12px solid transparent;
      border-right: 12px solid transparent;
      border-top: 12px solid #7ea04b;
      z-index: -1;
    }
  `;
    document.head.appendChild(style);
    document.body.appendChild(div);
    return div;
}
export async function whispSpeak(context, stateSummary) {
    if (!whispEnabled)
        return;
    if (!bubble)
        bubble = createBubble();
    try {
        const message = await getWhispCommentary(context, stateSummary);
        bubble.textContent = message;
    }
    catch {
        const fallbacks = [
            "I'm watching. Always watching.",
            "Interesting choice. Foolish, but interesting.",
            "The void finds this amusing.",
            "You're doing great. No, really."
        ];
        bubble.textContent = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    bubble.style.display = 'block';
    bubble.style.opacity = '1';
    if (commentaryTimeout)
        clearTimeout(commentaryTimeout);
    commentaryTimeout = window.setTimeout(() => {
        if (bubble) {
            bubble.style.opacity = '0';
            setTimeout(() => { if (bubble)
                bubble.style.display = 'none'; }, 500);
        }
    }, 5000);
}
export function whispSay(message) {
    if (!whispEnabled)
        return;
    if (!bubble)
        bubble = createBubble();
    bubble.textContent = message;
    bubble.style.display = 'block';
    bubble.style.opacity = '1';
    if (commentaryTimeout)
        clearTimeout(commentaryTimeout);
    commentaryTimeout = window.setTimeout(() => {
        if (bubble) {
            bubble.style.opacity = '0';
            setTimeout(() => { if (bubble)
                bubble.style.display = 'none'; }, 500);
        }
    }, 5000);
}
export function getStateSummary() {
    return `Health: ${health.value}, Will: ${will.value}, Suspicion: ${suspicion.value}, Fragments: ${orbexFragments.value}/6, Corruption: ${corruptionLevel.value}`;
}
export function setupWhispReactions() {
    // Health changes
    effect(() => {
        const current = health.value;
        if (!whispEnabled)
            return;
        if (current < prevHealth && current < 30) {
            whispSay("You're bleeding. How... messy. Try not to die before we finish our work.");
        }
        else if (current < prevHealth && current < 50) {
            whispSay("That looked painful. Almost enjoyed it.");
        }
        prevHealth = current;
    });
    // Will changes
    effect(() => {
        const current = will.value;
        if (!whispEnabled)
            return;
        if (current < prevWill && current < 20) {
            whispSay("Your will frays. Perhaps a nap? No, too much to do.");
        }
        prevWill = current;
    });
    // Suspicion changes
    effect(() => {
        const current = suspicion.value;
        if (!whispEnabled)
            return;
        if (current > prevSuspicion && current > 70) {
            whispSay("The Prophets sniff around. They smell your fear. Delicious.");
        }
        prevSuspicion = current;
    });
    // Fragment collection
    effect(() => {
        const current = orbexFragments.value;
        if (!whispEnabled)
            return;
        if (current > prevFragments) {
            const messages = [
                `Another shard of Orbex. It pulses... ${current}/6.`,
                `Fragment ${current} reclaimed. The light grows.`,
                `Good. More pieces. Orbex hungers.`
            ];
            whispSay(messages[Math.floor(Math.random() * messages.length)]);
        }
        prevFragments = current;
    });
    // Corruption changes
    effect(() => {
        const current = corruptionLevel.value;
        if (!whispEnabled)
            return;
        if (current > prevCorruption && current > 60) {
            whispSay("Corruption rises. Kalgoth's touch. Don't let it consume you.");
        }
        prevCorruption = current;
    });
    // Active demon changes
    effect(() => {
        const current = activeDemon.value;
        if (!whispEnabled)
            return;
        if (current && !prevActiveDemon) {
            whispSay(`Ah, a ${current.trait}. How... fascinating. Try not to get eaten.`);
        }
        else if (!current && prevActiveDemon) {
            whispSay("Demon gone. Good riddance. Or perhaps a loss?");
        }
        prevActiveDemon = current;
    });
    // Powder crafting
    effect(() => {
        const currentPowder = crafted.value.powderOfWarding;
        if (!whispEnabled)
            return;
        if (currentPowder > prevPowder) {
            whispSay("Powder of Warding. Clever. Almost like you know what you're doing.");
        }
        prevPowder = currentPowder;
    });
    // Phial crafting
    effect(() => {
        const currentPhial = crafted.value.phialOfSubjugation;
        if (!whispEnabled)
            return;
        if (currentPhial > prevPhial) {
            whispSay("A phial. Subjugation in a bottle. Cute.");
        }
        prevPhial = currentPhial;
    });
    // Moss changes
    effect(() => {
        const currentMoss = ingredients.value.nightshadeMoss;
        if (!whispEnabled)
            return;
        if (currentMoss < prevMoss && currentMoss < 2) {
            whispSay("Moss running low. I need that, you know. To survive.");
        }
        prevMoss = currentMoss;
    });
    // Ichor changes
    effect(() => {
        const currentIchor = ingredients.value.demonIchor;
        if (!whispEnabled)
            return;
        if (currentIchor > prevIchor) {
            whispSay("Demon ichor. The Prophets demand it. Orbex craves it. Everyone wants something.");
        }
        prevIchor = currentIchor;
    });
    // First summon
    effect(() => {
        const current = totalSummons.value;
        if (!whispEnabled)
            return;
        if (current === 1 && prevSummons === 0) {
            whispSay("Your first summon. They grow up so fast.");
        }
        else if (current === 5 && prevSummons === 4) {
            whispSay("Five demons called. You're building quite the menagerie.");
        }
        prevSummons = current;
    });
    // First expedition
    effect(() => {
        const current = totalExplorations.value;
        if (!whispEnabled)
            return;
        if (current === 1 && prevExplorations === 0) {
            whispSay("Into the undercrypt. Watch for wyrms. And traitors.");
        }
        prevExplorations = current;
    });
    // === NEW: Combo detection and commentary ===
    effect(() => {
        if (!whispEnabled)
            return;
        const combos = checkForCombos();
        const currentComboCount = combos.length;
        if (currentComboCount > lastComboCount && currentComboCount > 0) {
            // New combo formed!
            const newCombo = combos[combos.length - 1];
            const cardNames = newCombo.cardIds.map(id => {
                const card = ownedCards.value.find((c) => c.cardId === id);
                return card?.name || id;
            }).join(' and ');
            const messages = [
                `Ooh, ${cardNames} working together! ${newCombo.effect}`,
                `A symphony of power! ${newCombo.effect}`,
                `Look at you, a regular summoner! ${newCombo.effect}`,
                `The cards resonate... ${newCombo.effect}`
            ];
            whispSay(messages[Math.floor(Math.random() * messages.length)]);
            whispComboAcknowledged = true;
        }
        else if (currentComboCount === 0 && lastComboCount > 0) {
            // Combo broken
            whispSay("Combo broken. Back to the basics, I suppose.");
            whispComboAcknowledged = false;
        }
        lastComboCount = currentComboCount;
    });
    // Aspect synergy detection
    effect(() => {
        if (!whispEnabled)
            return;
        // This will be triggered when equipped entities change
        // The actual check is in the combo effect, but we can add specific synergy lines
        const combos = checkForCombos();
        if (combos.length >= 2 && !whispComboAcknowledged) {
            whispSay("Multiple synergies active! You're learning.");
            whispComboAcknowledged = true;
        }
    });
}
