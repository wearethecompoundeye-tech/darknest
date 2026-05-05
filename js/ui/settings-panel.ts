// js/ui/settings-panel.ts – Fully functional settings panel
// No dependency on deleted whisp-commentary.ts.

import { el } from '../core/dom-helper.js';
import { updateVolumes, toggleSfx, toggleMusic } from '../audio/sfx.js';
import { setTutorialEnabled } from './tutorial.js';
import { setWhispEnabled, isWhispEnabled } from './whisp-chat.js'; // <-- corrected
import { getStorage } from '../core/storage.js';

let masterVolume = 0.7;
let sfxVolume = 0.7;
let musicVolume = 0.4;

export function renderSettingsContent(): void {
  const container = el('settingsContent');
  if (!container) return;

  container.innerHTML = `
    <div style="margin:15px 0;">
      <label>Master Volume <span id="masterVolLabel">${Math.round(masterVolume * 100)}%</span></label>
      <input type="range" id="masterVolumeSlider" min="0" max="1" step="0.01" value="${masterVolume}">
    </div>
    <div style="margin:15px 0;">
      <label>SFX Volume <span id="sfxVolLabel">${Math.round(sfxVolume * 100)}%</span></label>
      <input type="range" id="sfxVolumeSlider" min="0" max="1" step="0.01" value="${sfxVolume}">
    </div>
    <div style="margin:15px 0;">
      <label>Music Volume <span id="musicVolLabel">${Math.round(musicVolume * 100)}%</span></label>
      <input type="range" id="musicVolumeSlider" min="0" max="1" step="0.01" value="${musicVolume}">
    </div>
    <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
      <button id="muteSfxBtn" class="craft-btn">🔊 SFX ON</button>
      <button id="muteMusicBtn" class="craft-btn">🎵 MUSIC ON</button>
    </div>
    <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
      <button class="craft-btn" id="toggleWhispBtn">👁️ Whisp ON</button>
      <button class="craft-btn" id="toggleTutorialBtn">📖 Tutorial ON</button>
    </div>
    <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
      <button class="craft-btn" id="settingsSaveBtn">💾 Save</button>
      <button class="craft-btn" id="settingsLoadBtn">📂 Load</button>
    </div>
    <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
      <button class="craft-btn" id="settingsNewGameBtn" style="background:#8a2a2a;">🔄 New Game</button>
    </div>
    <p style="margin-top:20px; font-size:0.7rem; color:#a09080; text-align:center;">
      New Game will erase all progress and start fresh.
    </p>
  `;

  // Volume sliders
  const masterSlider = el('masterVolumeSlider') as HTMLInputElement;
  const sfxSlider = el('sfxVolumeSlider') as HTMLInputElement;
  const musicSlider = el('musicVolumeSlider') as HTMLInputElement;

  masterSlider?.addEventListener('input', () => {
    masterVolume = parseFloat(masterSlider.value);
    (el('masterVolLabel') as HTMLElement).textContent = `${Math.round(masterVolume * 100)}%`;
    applyVolume();
  });
  sfxSlider?.addEventListener('input', () => {
    sfxVolume = parseFloat(sfxSlider.value);
    (el('sfxVolLabel') as HTMLElement).textContent = `${Math.round(sfxVolume * 100)}%`;
    applyVolume();
  });
  musicSlider?.addEventListener('input', () => {
    musicVolume = parseFloat(musicSlider.value);
    (el('musicVolLabel') as HTMLElement).textContent = `${Math.round(musicVolume * 100)}%`;
    applyVolume();
  });

  // Mute buttons
  let sfxMuted = false;
  let musicMuted = false;

  el('muteSfxBtn')?.addEventListener('click', () => {
    sfxMuted = !sfxMuted;
    toggleSfx(!sfxMuted);
    const btn = el('muteSfxBtn') as HTMLButtonElement;
    btn.textContent = sfxMuted ? '🔇 SFX OFF' : '🔊 SFX ON';
  });
  el('muteMusicBtn')?.addEventListener('click', () => {
    musicMuted = !musicMuted;
    toggleMusic(!musicMuted);
    const btn = el('muteMusicBtn') as HTMLButtonElement;
    btn.textContent = musicMuted ? '🔇 MUSIC OFF' : '🎵 MUSIC ON';
  });

  // Feature toggles
  let whispEnabled = isWhispEnabled();
  let tutorialEnabled = true;

  const whispBtn = el('toggleWhispBtn') as HTMLButtonElement;
  whispBtn.textContent = whispEnabled ? '👁️ Whisp ON' : '👁️‍🗨️ Whisp OFF';
  whispBtn.addEventListener('click', () => {
    whispEnabled = !whispEnabled;
    setWhispEnabled(whispEnabled);
    whispBtn.textContent = whispEnabled ? '👁️ Whisp ON' : '👁️‍🗨️ Whisp OFF';
  });

  const tutorialBtn = el('toggleTutorialBtn') as HTMLButtonElement;
  tutorialBtn.textContent = tutorialEnabled ? '📖 Tutorial ON' : '📖 Tutorial OFF';
  tutorialBtn.addEventListener('click', () => {
    tutorialEnabled = !tutorialEnabled;
    setTutorialEnabled(tutorialEnabled);
    tutorialBtn.textContent = tutorialEnabled ? '📖 Tutorial ON' : '📖 Tutorial OFF';
  });

  // Save / Load / New Game
  el('settingsSaveBtn')?.addEventListener('click', () => {
    import('../core/persistence.js').then(m => m.autoSave());
    alert('Game saved.');
  });
  el('settingsLoadBtn')?.addEventListener('click', () => {
    import('../ui/save-slots.js').then(m => {
      m.showSaveSlots(() => window.location.reload());
    });
  });
  el('settingsNewGameBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to start a new game? All progress will be lost.')) {
      const storage = getStorage();
      storage.listSlots().then(slots => {
        return Promise.all(slots.map(s => storage.delete(s.id)));
      }).then(() => {
        localStorage.clear();
        window.location.reload();
      });
    }
  });
}

function applyVolume(): void {
  updateVolumes(masterVolume, sfxVolume, musicVolume);
}