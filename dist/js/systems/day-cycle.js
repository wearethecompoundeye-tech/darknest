// js/systems/day-cycle.ts
// Day cycle with Kalgoth's Gaze integration - Fixed timer start and state management
import { batch } from '@preact/signals-core';
import { timerSeconds, tithePaidThisDay, ingredients, tutorial, CONSTANTS, hasSpecialIngredient, circlePower, orbexFragments } from '../core/state-signals.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents } from '../core/events.js';
import { addLog } from '../ui/log-manager.js';
import { playSfx } from '../audio/sfx.js';
import { el } from '../core/dom-helper.js';
import { startGazeWarning } from './gaze-event.js';
let timerInterval = null;
let isTimerPaused = false;
let modalObserver = null;
export function initDayCycle() {
    if (timerInterval)
        clearInterval(timerInterval);
    if (timerSeconds.value <= 0) {
        timerSeconds.value = 600;
    }
    modalObserver = new MutationObserver(checkModalVisibility);
    modalObserver.observe(document.body, { attributes: true, attributeFilter: ['style'], subtree: true });
    startTimer();
}
function checkModalVisibility() {
    const modals = document.querySelectorAll('.modal');
    const anyModalOpen = Array.from(modals).some(modal => modal.style.display === 'flex' || modal.style.display === 'block');
    isTimerPaused = anyModalOpen;
}
function startTimer() {
    timerInterval = window.setInterval(() => {
        if (isTimerPaused)
            return;
        const gazeActive = window.__gazeActive;
        if (gazeActive)
            return;
        if (timerSeconds.value > 0) {
            timerSeconds.value--;
            updateTimerDisplay();
        }
        else {
            handleDayEnd();
        }
    }, 1000);
}
function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds.value / 60);
    const secs = timerSeconds.value % 60;
    const timerDisplay = el("timerDisplay");
    if (timerDisplay) {
        timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    const dayProgressFill = el("dayProgressFill");
    if (dayProgressFill) {
        dayProgressFill.style.width = (timerSeconds.value / 600) * 100 + "%";
    }
}
function handleDayEnd() {
    if (timerSeconds.value > 0)
        return;
    startGazeWarning();
}
export function payTithe() {
    if (tithePaidThisDay.value) {
        addLog("Already paid today.", true);
        return;
    }
    if (ingredients.value.demonIchor >= CONSTANTS.DAILY_ICHOR_REQUIREMENT) {
        batch(() => {
            ingredients.value = { ...ingredients.value, demonIchor: ingredients.value.demonIchor - CONSTANTS.DAILY_ICHOR_REQUIREMENT };
            tithePaidThisDay.value = true;
        });
        addLog(`Tithe paid. Kalgoth's Noose will loosen at day's end.`, false, 'player');
        gameBus.emit(GameEvents.TITHE_PAID, { ichorCost: CONSTANTS.DAILY_ICHOR_REQUIREMENT });
        if (!tutorial.value.firstTithePaid) {
            tutorial.value = { ...tutorial.value, firstTithePaid: true };
            addLog('📖 Tome updated: Tithe.', false, 'system');
        }
    }
    else {
        addLog(`Need ${CONSTANTS.DAILY_ICHOR_REQUIREMENT} Ichor.`, true);
    }
}
export function attemptEscape() {
    if (circlePower.value >= 100 && hasSpecialIngredient.value && orbexFragments.value >= 6) {
        addLog("🔥 VICTORY! You tear open a rift and escape the Undercrypt.", false, 'player');
        alert("YOU HAVE ESCAPED!");
        document.body.style.pointerEvents = "none";
        if (timerInterval)
            clearInterval(timerInterval);
        playSfx('gameWin');
    }
    else {
        addLog("Circle not fully empowered or fragments missing.", true);
    }
}
export function stopDayCycle() {
    if (timerInterval)
        clearInterval(timerInterval);
    if (modalObserver)
        modalObserver.disconnect();
}
export function setGazeActive(active) {
    window.__gazeActive = active;
}
