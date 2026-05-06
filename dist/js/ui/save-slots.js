// js/ui/save-slots.ts
// Save slot selection modal – shows existing saves, New Game clears everything.
import { getSlotList, loadFromSlot, setCurrentSlot } from '../core/persistence.js';
import { getStorage } from '../core/storage.js';
export function showSaveSlots(onLoad) {
    const overlay = document.createElement('div');
    overlay.id = 'saveSlotsOverlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.92); z-index:100000; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:monospace;';
    const title = document.createElement('h2');
    title.textContent = 'Choose a Save Slot';
    title.style.color = '#d4af37';
    overlay.appendChild(title);
    const container = document.createElement('div');
    container.style.cssText = 'display:flex; flex-direction:column; gap:10px; margin:20px;';
    overlay.appendChild(container);
    const loading = document.createElement('p');
    loading.textContent = 'Loading...';
    loading.style.color = '#a09080';
    container.appendChild(loading);
    // Fetch slots and build UI
    getSlotList().then(slots => {
        container.innerHTML = '';
        if (slots.length === 0) {
            container.innerHTML = '<p style="color:#a09080;">No saves found.</p>';
        }
        else {
            slots.forEach(slot => {
                const card = document.createElement('div');
                card.style.cssText = 'background:#1a100a; border:1px solid #5a4a3a; border-radius:12px; padding:12px 20px; cursor:pointer; transition:0.2s; display:flex; justify-content:space-between; width:300px;';
                const info = document.createElement('div');
                info.innerHTML = `<strong style="color:#e0d8cc;">${slot.label}</strong><br><span style="font-size:0.8rem; color:#a09080;">${slot.playerName} · Fragments: ${slot.orbexFragments}/6</span><br><span style="font-size:0.7rem; color:#6a5a4a;">${new Date(slot.timestamp).toLocaleString()}</span>`;
                card.appendChild(info);
                card.addEventListener('click', async () => {
                    await loadFromSlot(slot.id);
                    setCurrentSlot(slot.id);
                    overlay.remove();
                    onLoad();
                });
                card.addEventListener('mouseenter', () => card.style.borderColor = '#d4af37');
                card.addEventListener('mouseleave', () => card.style.borderColor = '#5a4a3a');
                container.appendChild(card);
            });
        }
        // New Game button – delete all slots and hard reload
        const newGameBtn = document.createElement('button');
        newGameBtn.textContent = '🆕 New Game';
        newGameBtn.style.cssText = 'margin-top:20px; padding:12px 24px; background:#2a1a0a; border:1px solid #d4af37; border-radius:24px; color:#e0d8cc; cursor:pointer; font-size:1rem;';
        newGameBtn.addEventListener('click', async () => {
            overlay.innerHTML = '<p style="color:#d4af37;">Clearing all saves…</p>';
            const storage = getStorage();
            const allSlots = await getSlotList();
            for (const slot of allSlots) {
                await storage.delete(slot.id);
            }
            // Also clear any old localStorage key just in case
            localStorage.clear();
            window.location.reload();
        });
        container.appendChild(newGameBtn);
    });
    document.body.appendChild(overlay);
}
