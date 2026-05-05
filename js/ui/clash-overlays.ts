// js/ui/clash-overlays.ts
// Full‑screen victory/defeat sequences with particles and SFX.
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';

function spawnParticles(container: HTMLElement, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 8 + 4;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 300 + 50;
    p.style.cssText = `position:absolute; width:${size}px; height:${size}px; background:${color}; border-radius:50%; left:50%; top:50%; margin-left:-${size/2}px; margin-top:-${size/2}px; pointer-events:none; animation:particleFly 1.5s ease-out forwards;`;
    p.style.setProperty('--dx', `${Math.cos(angle)*dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle)*dist}px`);
    container.appendChild(p);
    setTimeout(() => p.remove(), 1500);
  }
}

export async function showVictoryOverlay(): Promise<void> {
  return new Promise(resolve => {
    playSfx('victory_music');
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed; inset:0; background:radial-gradient(circle, rgba(0,0,0,0.5), #000); z-index:4000; display:flex; align-items:center; justify-content:center; flex-direction:column;`;
    overlay.innerHTML = `<div style="font-size:4rem; color:#ffd700; text-shadow:0 0 40px #ffd700; font-family:'Cinzel',serif; animation:scaleIn 0.5s ease-out;">VICTORY</div>`;

    spawnParticles(overlay, '#ffd700', 150);
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 1s';
      setTimeout(() => {
        overlay.remove();
        stopLoop('battle_music');
        resolve();
      }, 1000);
    }, 3000);
  });
}

export async function showDefeatOverlay(): Promise<void> {
  return new Promise(resolve => {
    playSfx('defeat_music');
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed; inset:0; background:radial-gradient(circle, rgba(80,0,0,0.7), #000); z-index:4000; display:flex; align-items:center; justify-content:center; flex-direction:column;`;
    overlay.innerHTML = `<div style="font-size:4rem; color:#cc0000; text-shadow:0 0 40px #cc0000; font-family:'Cinzel',serif; animation:scaleIn 0.5s ease-out;">DEFEAT</div>`;

    spawnParticles(overlay, '#cc0000', 120);
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 1s';
      setTimeout(() => {
        overlay.remove();
        stopLoop('battle_music');
        resolve();
      }, 1000);
    }, 3000);
  });
}

// Inject required keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes scaleIn { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes particleFly { from{transform:translate(0,0);opacity:1} to{transform:translate(var(--dx),var(--dy));opacity:0} }
`;
document.head.appendChild(style);