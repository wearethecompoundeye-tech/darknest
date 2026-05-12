// js/ui/settings-panel.ts – Clean, functional settings panel
// Updated: New Game now sets a flag to prevent the old state from being re‑saved
import { updateVolumes, toggleSfx, toggleMusic } from '../audio/sfx.js';
import { setTutorialEnabled } from './tutorial.js';
import { setWhispEnabled, isWhispEnabled } from './whisp-chat.js';
import { getStorage } from '../core/storage.js';
import { autoSave } from '../core/persistence.js';

// ── Local volume state ─────────────────────────────────────────
let masterVol = 0.7;
let sfxVol = 0.7;
let musicVol = 0.4;

function applyVolume() {
  updateVolumes(masterVol, sfxVol, musicVol);
}

// ── Tooltip cleaner (prevents ghost tooltips) ──────────────────
function installTooltipCleaner() {
  document.querySelectorAll('.tooltip-content').forEach(el => el.remove());
  window.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) {
      document.querySelectorAll('.tooltip-content').forEach(t => t.remove());
    }
  });
}

// ── Render the settings panel ──────────────────────────────────
export function renderSettingsContent(): void {
  const container = document.getElementById('settingsContent');
  if (!container) {
    console.error('settingsContent container not found');
    return;
  }

  installTooltipCleaner();

  container.innerHTML = `
    <style>
      .settings-group {
        margin: 16px 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-family: 'Inter', sans-serif;
        color: #e0d8cc;
      }
      .settings-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .settings-label {
        flex: 1;
        font-size: 0.9rem;
        color: #c8b890;
      }
      .settings-slider {
        flex: 2;
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        background: #2a1a1a;
        border-radius: 4px;
        outline: none;
        cursor: pointer;
      }
      .settings-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: #d4af37;
        border-radius: 50%;
        border: 2px solid #5a4a3a;
        box-shadow: 0 0 8px #ffd700;
      }
      .settings-value {
        width: 40px;
        text-align: right;
        font-size: 0.85rem;
        color: #a09080;
      }
      .settings-btn {
        background: linear-gradient(145deg, #2a1a12, #0f0804);
        border: 2px solid var(--gold-base, #b89248);
        color: #f5efe0;
        padding: 8px 16px;
        border-radius: 24px;
        cursor: pointer;
        font-size: 0.8rem;
        letter-spacing: 0.05em;
        transition: 0.2s;
        flex: 1;
        text-align: center;
      }
      .settings-btn:hover {
        border-color: var(--gold-light, #f0d580);
        color: #ffd700;
        box-shadow: 0 0 12px rgba(212,175,55,0.3);
      }
      .settings-btn.danger {
        border-color: #8a2a2a;
        background: linear-gradient(145deg, #5a1a1a, #2a0505);
      }
      .settings-btn:active {
        transform: scale(0.95);
      }
    </style>

    <div class="settings-group">
      <div class="settings-row">
        <span class="settings-label">Master Volume</span>
        <input type="range" id="masterVolSlider" class="settings-slider" min="0" max="1" step="0.01" value="${masterVol}">
        <span id="masterVolLabel" class="settings-value">${Math.round(masterVol * 100)}%</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">SFX Volume</span>
        <input type="range" id="sfxVolSlider" class="settings-slider" min="0" max="1" step="0.01" value="${sfxVol}">
        <span id="sfxVolLabel" class="settings-value">${Math.round(sfxVol * 100)}%</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Music Volume</span>
        <input type="range" id="musicVolSlider" class="settings-slider" min="0" max="1" step="0.01" value="${musicVol}">
        <span id="musicVolLabel" class="settings-value">${Math.round(musicVol * 100)}%</span>
      </div>
    </div>

    <div style="display:flex; gap:10px; margin: 12px 0;">
      <button id="muteSfxBtn" class="settings-btn">🔊 SFX ON</button>
      <button id="muteMusicBtn" class="settings-btn">🎵 Music ON</button>
    </div>

    <div style="display:flex; gap:10px; margin: 12px 0;">
      <button id="toggleWhispBtn" class="settings-btn">👁️ Whisp ON</button>
      <button id="toggleTutorialBtn" class="settings-btn">📖 Tutorial ON</button>
    </div>

    <div style="display:flex; gap:10px; margin: 12px 0;">
      <button id="settingsSaveBtn" class="settings-btn">💾 Save Game</button>
      <button id="settingsLoadBtn" class="settings-btn">📂 Load Slot</button>
    </div>

    <div style="display:flex; gap:10px; margin: 12px 0;">
      <button id="settingsNewGameBtn" class="settings-btn danger">🔥 New Game</button>
    </div>
    <p style="margin-top:8px; font-size:0.7rem; color:#8a7a6a; text-align:center;">
      New Game will erase all progress and restart.
    </p>
  `;

  // ── Event delegation for all buttons ─────────────────────────
  container.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('button');
    if (!btn) return;

    const id = btn.id;

    // Mute toggles
    if (id === 'muteSfxBtn') {
      const sfxMuted = btn.textContent === '🔊 SFX ON';
      toggleSfx(!sfxMuted);
      btn.textContent = sfxMuted ? '🔇 SFX OFF' : '🔊 SFX ON';
    }
    else if (id === 'muteMusicBtn') {
      const musicMuted = btn.textContent === '🎵 Music ON';
      toggleMusic(!musicMuted);
      btn.textContent = musicMuted ? '🔇 Music OFF' : '🎵 Music ON';
    }

    // Whisp toggle
    else if (id === 'toggleWhispBtn') {
      const whispOn = isWhispEnabled();
      setWhispEnabled(!whispOn);
      btn.textContent = !whispOn ? '👁️ Whisp ON' : '👁️‍🗨️ Whisp OFF';
    }

    // Tutorial toggle
    else if (id === 'toggleTutorialBtn') {
      const tutorialOn = btn.textContent === '📖 Tutorial ON';
      setTutorialEnabled(!tutorialOn);
      btn.textContent = !tutorialOn ? '📖 Tutorial ON' : '📖 Tutorial OFF';
    }

    // Save / Load
    else if (id === 'settingsSaveBtn') {
      try {
        await autoSave();
        alert('Game saved.');
      } catch (e) {
        alert('Save failed: ' + e);
      }
    }
    else if (id === 'settingsLoadBtn') {
      import('../ui/save-slots.js').then(m => {
        m.showSaveSlots(() => window.location.reload());
      });
    }

    // ── New Game – prevent final auto‑save then wipe and reload ──
    else if (id === 'settingsNewGameBtn') {
      if (!confirm('Are you sure? All progress will be lost.')) return;

      // Delete all known save slots
      try {
        const storage = getStorage();
        const slots = await storage.listSlots();
        await Promise.all(slots.map(s => storage.delete(s.id)));
      } catch (e) {
        console.warn('Slot deletion failed:', e);
      }

      // Clear legacy localStorage key and everything else
      localStorage.removeItem('kalgothGazeOrbitSave');
      localStorage.clear();

      // Clear sessionStorage
      try { sessionStorage.clear(); } catch {}

      // Flag to prevent the beforeunload handler from re‑saving the old state
      (window as any).__newGame = true;

      // Hard reload with cache‑buster
      window.location.href = window.location.href.split('?')[0] + '?new=' + Date.now();
    }
  });

  // ── Volume sliders still need 'input' listeners ──────────────
  const masterSlider = document.getElementById('masterVolSlider') as HTMLInputElement;
  const sfxSlider    = document.getElementById('sfxVolSlider') as HTMLInputElement;
  const musicSlider  = document.getElementById('musicVolSlider') as HTMLInputElement;

  masterSlider?.addEventListener('input', () => {
    masterVol = parseFloat(masterSlider.value);
    const label = document.getElementById('masterVolLabel');
    if (label) label.textContent = `${Math.round(masterVol * 100)}%`;
    applyVolume();
  });
  sfxSlider?.addEventListener('input', () => {
    sfxVol = parseFloat(sfxSlider.value);
    const label = document.getElementById('sfxVolLabel');
    if (label) label.textContent = `${Math.round(sfxVol * 100)}%`;
    applyVolume();
  });
  musicSlider?.addEventListener('input', () => {
    musicVol = parseFloat(musicSlider.value);
    const label = document.getElementById('musicVolLabel');
    if (label) label.textContent = `${Math.round(musicVol * 100)}%`;
    applyVolume();
  });
}