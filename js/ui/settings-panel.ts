// js/ui/settings-panel.ts
// Settings modal content renderer with New Game option

import { el } from '../core/dom-helper.js';

export function renderSettingsContent(): void {
  const container = el('settingsContent');
  if (!container) return;

  container.innerHTML = `
    <div style="margin:15px 0;">
      <label>Master Volume <span id="masterVolLabel">70%</span></label>
      <input type="range" id="masterVolumeSlider" min="0" max="1" step="0.01" value="0.7">
    </div>
    <div style="margin:15px 0;">
      <label>SFX Volume <span id="sfxVolLabel">70%</span></label>
      <input type="range" id="sfxVolumeSlider" min="0" max="1" step="0.01" value="0.7">
    </div>
    <div style="margin:15px 0;">
      <label>Music Volume <span id="musicVolLabel">40%</span></label>
      <input type="range" id="musicVolumeSlider" min="0" max="1" step="0.01" value="0.4">
    </div>
    <div style="display:flex; gap:10px; justify-content:center;">
      <button class="craft-btn" id="muteSfxBtn">🔊 SFX ON</button>
      <button class="craft-btn" id="muteMusicBtn">🎵 MUSIC ON</button>
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

  const newGameBtn = el('settingsNewGameBtn');
  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to start a new game? All progress will be lost.')) {
        localStorage.removeItem('kalgothGazeOrbitSave');
        localStorage.clear();
        window.location.reload();
      }
    });
  }
}