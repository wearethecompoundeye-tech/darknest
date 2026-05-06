// js/ui/demon-modal.ts
// Entity dialogue modal - Fully implemented with AI fallback
// Purpose: Allows player to "Talk" to bound entity for lore/flavor interactions
import { activeDemon, getActiveEntity } from '../core/state-signals.js';
import { getDemonDialogue } from '../ai/ai-engine.js';
import { addLog } from './log-manager.js';
import { playSfx } from '../audio/sfx.js';
export function talkToDemon() {
    const demon = activeDemon.value;
    const entity = getActiveEntity();
    if (!demon && !entity) {
        addLog("No entity bound to speak with.", true);
        return;
    }
    const demonName = demon?.name || entity?.name || "Entity";
    const demonTrait = demon?.trait || entity?.aspect || "Unknown";
    // Show modal immediately with "Thinking..." placeholder
    const modal = createDemonDialogueModal(demonName, demonTrait);
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    playSfx('DemonModal_Open');
    // Fetch dialogue asynchronously
    const situation = getContextualSituation();
    getDemonDialogue(demonName, demonTrait, situation)
        .then(response => {
        const contentEl = modal.querySelector('#demonDialogueContent');
        if (contentEl) {
            contentEl.textContent = response;
        }
    })
        .catch(err => {
        const contentEl = modal.querySelector('#demonDialogueContent');
        if (contentEl) {
            contentEl.textContent = getFallbackDialogue(demonTrait);
        }
    });
}
function getContextualSituation() {
    const parts = [];
    parts.push("The acolyte has summoned you.");
    const demon = activeDemon.value;
    if (demon) {
        parts.push(`You are currently bound to the circle.`);
    }
    else {
        parts.push(`You have been recently summoned.`);
    }
    return parts.join(' ');
}
function getFallbackDialogue(trait) {
    const fallbacks = {
        'Imp': [
            '"You dare disturb me, mortal?"',
            '"What do you want, fleshbag?"',
            '"I could devour your soul... but I\'m bored."'
        ],
        'Cunning': [
            '"Ah, the summoner returns. How... predictable."',
            '"I see through your schemes, Acolyte."',
            '"Information has a price. What do you offer?"'
        ],
        'Feral': [
            '"GRRR... Meat. Fresh meat."',
            '"Release me! I hunger!"',
            '"You smell of fear. Delicious."'
        ],
        'Ancient': [
            '"I have watched empires crumble, little one."',
            '"Your kind is but a flicker in the void."',
            '"Speak quickly. Eternity waits for no one."'
        ],
        'Volatile': [
            '"HAHAHA! You wish to speak? FOOL!"',
            '"I could burn you where you stand... but it\'s more fun to watch you squirm."',
            '"Every word you speak brings you closer to annihilation."'
        ],
        'Shadow-touched': [
            '"The void whispers your name, Acolyte."',
            '"I have seen what lurks in your shadow. It hungers."',
            '"Kalgoth knows you are here. He is patient."'
        ],
        'Void': [
            '"The abyss stares back, little spark."',
            '"You think you summon us? We allow it."',
            '"Your soul is a flicker in the dark. Enjoy it while it lasts."'
        ],
        'Fire': [
            '"I am the flame that consumes all."',
            '"Your flesh is kindling, Acolyte. Tread carefully."',
            '"Burn bright, burn brief. That is your fate."'
        ],
        'Earth': [
            '"The mountains remember your transgressions."',
            '"I am patient as stone. I will outlast you."',
            '"Your foundations are weak, summoner."'
        ],
        'Air': [
            '"I am the whisper on the wind. I know your secrets."',
            '"You cannot grasp the storm, little one."',
            '"The skies weep for your folly."'
        ],
        'Water': [
            '"I am the tide that drowns all hope."',
            '"Your tears will join the abyss."',
            '"You are adrift, Acolyte. There is no shore."'
        ],
        'Life': [
            '"I am the pulse of the earth. You are but a parasite."',
            '"Life finds a way... to end you."',
            '"Your vitality is borrowed. I will collect."'
        ],
        'Death': [
            '"I am the silence at the end of all things."',
            '"Your mortality is a gift. Cherish it while you can."',
            '"The grave yawns wide for you, summoner."'
        ]
    };
    const traitFallbacks = fallbacks[trait] || fallbacks['Imp'];
    return traitFallbacks[Math.floor(Math.random() * traitFallbacks.length)];
}
function createDemonDialogueModal(demonName, demonTrait) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'demonDialogueModal';
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
    modal.style.backdropFilter = 'blur(12px)';
    modal.style.zIndex = '2000';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.innerHTML = `
    <div class="modal-content" style="max-width:500px; width:90%; background:#0a0508; border:2px solid #6a4a3a; border-radius:32px; padding:24px; box-shadow:0 0 0 1px #8a7a5a inset, 0 20px 40px #000; color:#e0d8cc;">
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
        <div style="width:60px; height:60px; background:radial-gradient(circle, #4a2a2a, #1a0a0a); border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #8a5a3a;">
          <span style="font-size:2rem;">👹</span>
        </div>
        <div>
          <h3 style="margin:0; color:#d4af37;">${demonName}</h3>
          <p style="margin:0; font-size:0.8rem; color:#a09080;">${demonTrait}</p>
        </div>
      </div>
      <div style="min-height:100px; padding:16px; background:rgba(0,0,0,0.3); border-radius:16px; border-left:3px solid #8a5a3a; font-style:italic;">
        <span id="demonDialogueContent">Thinking...</span>
      </div>
      <div style="display:flex; justify-content:flex-end; margin-top:20px;">
        <button id="closeDemonDialogue" class="craft-btn" style="padding:8px 24px;">Close</button>
      </div>
    </div>
  `;
    modal.querySelector('#closeDemonDialogue').addEventListener('click', () => {
        modal.remove();
        playSfx('uiClick');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            playSfx('uiClick');
        }
    });
    return modal;
}
export function openDemonModal() {
    talkToDemon();
}
