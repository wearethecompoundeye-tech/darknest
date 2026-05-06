// js/minigames/phial-brew.ts
import { ingredients, crafted, updateState, addMasteryXP, discover, autoSave } from '../core/state-signals.js';
import { addLog } from '../ui/log-manager.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'];
export function startPhialBrewing(onComplete) {
    if (ingredients.value.cryptPhlegm < 1 || ingredients.value.bansheeSalts < 1) {
        addLog("Missing Phlegm or Banshee Salts.", true);
        onComplete?.(false, 0);
        return;
    }
    const overlay = document.createElement("div");
    overlay.className = "modal";
    overlay.style.display = "flex";
    overlay.innerHTML = `
    <div class="modal-content" style="max-width:600px; text-align:center;">
      <h3>🔥 CAULDRON BREW</h3>
      <p>Watch the rune sequence, then repeat it.</p>
      <div style="position:relative; width:300px; height:300px; margin:20px auto;">
        <div id="cauldronIcon" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:100px; height:100px;">
          <img src="/Images/Cauldron.png" alt="Cauldron" style="width:100%; height:100%; object-fit:contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
          <span style="display:none; font-size:5rem;">🧪</span>
        </div>
        <div id="runeRing" style="position:relative; width:100%; height:100%;">
          ${RUNES.map((r, i) => {
        const angle = (i / RUNES.length) * 2 * Math.PI - Math.PI / 2;
        const radius = 120;
        const x = 150 + Math.cos(angle) * radius;
        const y = 150 + Math.sin(angle) * radius;
        return `<div class="cauldron-rune" data-rune="${r}" style="position:absolute; left:${x - 20}px; top:${y - 20}px; width:40px; height:40px; background:#1f1220; border:2px solid #b4643a; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.8rem; cursor:pointer; transition:0.2s;">${r}</div>`;
    }).join('')}
        </div>
      </div>
      <p id="brewRoundDisplay">Round 1/3</p>
      <div class="progress-bar" style="width:100%;"><div id="brewProgress" class="progress-fill" style="width:0%; background:#9a7a3a;"></div></div>
      <p id="brewMessage">Watch the sequence...</p>
      <div style="display:flex; gap:10px; justify-content:center; margin-top:16px;">
        <button id="stopBrewBtn" class="craft-btn">Stop & Collect</button>
        <button id="cancelBrewBtn" class="craft-btn">Cancel</button>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    startLoop("phialBoiling");
    const runeElements = overlay.querySelectorAll('.cauldron-rune');
    const roundDisplay = overlay.querySelector('#brewRoundDisplay');
    const progressFill = overlay.querySelector('#brewProgress');
    const messageEl = overlay.querySelector('#brewMessage');
    const stopBtn = overlay.querySelector('#stopBrewBtn');
    const cancelBtn = overlay.querySelector('#cancelBrewBtn');
    let currentRound = 1;
    let sequence = [];
    let playerIndex = 0;
    let canClick = false;
    let gameActive = true;
    let collected = false;
    let sequenceInterval = null;
    const TOTAL_ROUNDS = 3;
    function clearSequenceInterval() {
        if (sequenceInterval) {
            clearInterval(sequenceInterval);
            sequenceInterval = null;
        }
    }
    function generateSequence(length) {
        return Array.from({ length }, () => RUNES[Math.floor(Math.random() * RUNES.length)]);
    }
    function highlightRune(rune, isActive) {
        runeElements.forEach(el => {
            if (el.dataset.rune === rune) {
                el.style.background = isActive ? '#f0a85a' : '#1f1220';
                el.style.boxShadow = isActive ? '0 0 20px #f0a85a' : 'none';
                el.style.transform = isActive ? 'scale(1.1)' : 'scale(1)';
            }
        });
    }
    function playSequence() {
        canClick = false;
        messageEl.textContent = 'Watch...';
        clearSequenceInterval();
        let idx = 0;
        runeElements.forEach(el => highlightRune(el.dataset.rune, false));
        sequenceInterval = window.setInterval(() => {
            if (!gameActive) {
                clearSequenceInterval();
                return;
            }
            if (idx > 0)
                highlightRune(sequence[idx - 1], false);
            if (idx < sequence.length) {
                highlightRune(sequence[idx], true);
                playSfx('runeReveal');
                idx++;
            }
            else {
                clearSequenceInterval();
                setTimeout(() => {
                    if (gameActive) {
                        highlightRune(sequence[sequence.length - 1], false);
                        canClick = true;
                        messageEl.textContent = 'Your turn!';
                        playerIndex = 0;
                    }
                }, 300);
            }
        }, 600 - (currentRound * 100));
    }
    function handleRuneClick(e) {
        if (!canClick || !gameActive)
            return;
        const rune = e.currentTarget.dataset.rune;
        playSfx('runeClick');
        if (rune !== sequence[playerIndex]) {
            messageEl.textContent = 'Wrong!';
            failBrew();
            return;
        }
        highlightRune(rune, true);
        setTimeout(() => highlightRune(rune, false), 150);
        playerIndex++;
        if (playerIndex === sequence.length) {
            canClick = false;
            if (currentRound === TOTAL_ROUNDS) {
                finishBrew(true, TOTAL_ROUNDS);
            }
            else {
                currentRound++;
                roundDisplay.textContent = `Round ${currentRound}/${TOTAL_ROUNDS}`;
                progressFill.style.width = ((currentRound - 1) / TOTAL_ROUNDS * 100) + '%';
                messageEl.textContent = `Round ${currentRound} complete! Continue or stop.`;
                setTimeout(() => {
                    if (gameActive) {
                        sequence = generateSequence(2 + currentRound);
                        playSequence();
                    }
                }, 800);
            }
        }
    }
    function failBrew() {
        if (!gameActive)
            return;
        gameActive = false;
        playSfx('phialFail');
        clearSequenceInterval();
        finishBrew(false, 0);
    }
    function stopEarly() {
        if (!gameActive || collected)
            return;
        gameActive = false;
        collected = true;
        clearSequenceInterval();
        const rewardRounds = currentRound;
        finishBrew(true, rewardRounds);
    }
    function finishBrew(success, completedRounds) {
        stopLoop("phialBoiling");
        clearSequenceInterval();
        canClick = false;
        gameActive = false;
        runeElements.forEach(el => el.removeEventListener('click', handleRuneClick));
        stopBtn.removeEventListener('click', stopEarly);
        cancelBtn.removeEventListener('click', cancelBrew);
        if (overlay.parentNode)
            overlay.remove();
        if (success && completedRounds > 0) {
            updateState(() => {
                ingredients.value = {
                    ...ingredients.value,
                    cryptPhlegm: ingredients.value.cryptPhlegm - 1,
                    bansheeSalts: ingredients.value.bansheeSalts - 1
                };
                const phialGain = completedRounds;
                crafted.value = {
                    ...crafted.value,
                    phialOfSubjugation: crafted.value.phialOfSubjugation + phialGain
                };
                discover('ingredients', 'bansheeSalts');
            });
            const xpGain = 5 + completedRounds * 3;
            addMasteryXP(xpGain);
            playSfx('phialSuccess');
            addLog(`Brew complete! +${completedRounds} Phial${completedRounds > 1 ? 's' : ''}, +${xpGain} Mastery XP.`, false, 'player');
        }
        else {
            updateState(() => {
                if (Math.random() < 0.5) {
                    ingredients.value = { ...ingredients.value, cryptPhlegm: ingredients.value.cryptPhlegm - 1 };
                }
                else {
                    ingredients.value = { ...ingredients.value, bansheeSalts: ingredients.value.bansheeSalts - 1 };
                }
            });
            addLog(`Brew failed. One ingredient lost.`, true);
        }
        autoSave();
        // Invoke callback with result
        if (onComplete)
            onComplete(success, completedRounds);
    }
    function cancelBrew() {
        stopLoop("phialBoiling");
        clearSequenceInterval();
        gameActive = false;
        runeElements.forEach(el => el.removeEventListener('click', handleRuneClick));
        stopBtn.removeEventListener('click', stopEarly);
        cancelBtn.removeEventListener('click', cancelBrew);
        overlay.remove();
        addLog("Brewing cancelled.");
        if (onComplete)
            onComplete(false, 0);
    }
    runeElements.forEach(el => el.addEventListener('click', handleRuneClick));
    stopBtn.addEventListener('click', stopEarly);
    cancelBtn.addEventListener('click', cancelBrew);
    sequence = generateSequence(3);
    playSequence();
}
