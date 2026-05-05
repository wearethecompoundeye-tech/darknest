// js/ui/battle-clash.ts – Solid overlay clash with particle burst & screen shake
import { type Card } from '../data/cards.js';

let clashEnabled = true;
export function setClashEnabled(enabled: boolean) { clashEnabled = enabled; }
export function isClashEnabled(): boolean { return clashEnabled; }

export class CardClashAnimation {
  private overlay: HTMLDivElement | null = null;
  private resolved = false;

  constructor() { this.injectStyles(); }

  public async play(playerCard: Card, enemyCard: Card, container: HTMLElement): Promise<void> {
    if (!clashEnabled) return;
    return new Promise(resolve => {
      // Full-size dark overlay inside the battle content
      this.overlay = document.createElement('div');
      this.overlay.style.cssText = 'position:absolute; inset:0; background:rgba(0,0,0,0.92); z-index:10; display:flex; justify-content:center; align-items:center; overflow:hidden;';
      container.style.position = 'relative'; // ensure overlay fills container
      container.appendChild(this.overlay);

      const playerEl = this.createClashCard(playerCard);
      const enemyEl = this.createClashCard(enemyCard);
      this.overlay.appendChild(playerEl);
      this.overlay.appendChild(enemyEl);

      const skipHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { document.removeEventListener('keydown', skipHandler); this.dispose(); resolve(); }
      };
      document.addEventListener('keydown', skipHandler);

      requestAnimationFrame(() => this.animate(playerEl, enemyEl, () => {
        document.removeEventListener('keydown', skipHandler);
        resolve();
      }));
    });
  }

  private createClashCard(card: Card): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = `
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: 240px; aspect-ratio: 3/4;
      border-radius: 16px; overflow: hidden;
      will-change: transform, opacity;
      filter: drop-shadow(0 0 25px #d4af37);
      background: #0a0508;
    `;
    el.innerHTML = `<img src="${card.image}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;"><img src="${card.frame}" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"><div style="position:absolute;bottom:-30px;left:50%;transform:translateX(-50%);color:#e0d8cc;font-size:1.5rem;text-shadow:0 0 10px rgba(0,0,0,0.7);white-space:nowrap;">${card.name}</div>`;
    return el;
  }

  private animate(playerEl: HTMLElement, enemyEl: HTMLElement, onComplete: () => void): void {
    // Start positions
    playerEl.style.transition = 'transform 0.3s ease-out';
    playerEl.style.transform = 'translate(calc(-50% - 180px), -50%) scale(1.1)';
    enemyEl.style.transition = 'transform 0.3s ease-out';
    enemyEl.style.transform = 'translate(calc(-50% + 180px), -50%) scale(1.1)';

    setTimeout(() => {
      // Slam together (fast)
      playerEl.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
      playerEl.style.transform = 'translate(-50%, -50%) scale(1.25)';
      enemyEl.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
      enemyEl.style.transform = 'translate(-50%, -50%) scale(1.25)';

      // Impact effects
      this.spawnImpactParticles();
      this.triggerScreenShake();

      setTimeout(() => {
        // Slight recoil
        playerEl.style.transition = 'transform 0.4s ease-out';
        playerEl.style.transform = 'translate(calc(-50% - 20px), -50%) scale(1) rotate(2deg)';
        enemyEl.style.transition = 'transform 0.4s ease-out';
        enemyEl.style.transform = 'translate(calc(-50% + 20px), -50%) scale(1) rotate(-2deg)';

        setTimeout(() => {
          // Fade entire overlay
          if (this.overlay) {
            this.overlay.style.transition = 'opacity 0.35s ease-in-out';
            this.overlay.style.opacity = '0';
            setTimeout(() => { this.dispose(); onComplete(); }, 350);
          } else {
            onComplete();
          }
        }, 500);
      }, 250);
    }, 350);
  }

  private spawnImpactParticles(): void {
    if (!this.overlay) return;
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute; top:50%; left:50%; width:0; height:0; pointer-events:none; z-index:5;';
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('div');
      const angle = Math.random() * Math.PI * 2, dist = 70 + Math.random() * 120;
      Object.assign(p.style, {
        position: 'absolute',
        width: '6px', height: '6px',
        borderRadius: '50%',
        background: Math.random() > 0.5 ? '#ffd700' : '#a0d07a',
        animation: 'cardImpactParticle 0.6s ease-out forwards',
      });
      p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      container.appendChild(p);
    }
    this.overlay.appendChild(container);
    setTimeout(() => container.remove(), 1000);
  }

  private triggerScreenShake(): void {
    const modal = document.getElementById('cardBattleModal');
    if (!modal) return;
    modal.style.animation = 'clashShake 0.3s ease-in-out';
    setTimeout(() => { if (modal) modal.style.animation = ''; }, 300);
  }

  private injectStyles(): void {
    if (document.getElementById('clash-styles')) return;
    const s = document.createElement('style'); s.id = 'clash-styles';
    s.textContent = `
      @keyframes cardImpactParticle {
        0% { transform: translate(0,0) scale(1); opacity:1; }
        100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity:0; }
      }
      @keyframes clashShake {
        0%, 100% { transform: translateX(0); }
        10% { transform: translateX(-6px); }
        20% { transform: translateX(6px); }
        30% { transform: translateX(-4px); }
        40% { transform: translateX(4px); }
        50% { transform: translateX(-2px); }
        60% { transform: translateX(2px); }
        70% { transform: translateX(0); }
      }
    `;
    document.head.appendChild(s);
  }

  public dispose(): void {
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
  }
}
