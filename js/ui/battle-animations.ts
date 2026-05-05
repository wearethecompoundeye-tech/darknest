// js/ui/battle-animations.ts
import { el } from '../core/dom-helper.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import type { Card, CardRarity } from '../data/cards.js';

export async function playBattleCommenceAnimation(enemyCard: Card): Promise<void> {
  console.log('[Battle Animation] Starting animation for', enemyCard.name);
  return new Promise((resolve) => {
    const gameContainer = el('gameContainer');
    if (!gameContainer) {
      console.warn('[Battle Animation] gameContainer not found');
      return resolve();
    }

    gameContainer.classList.add('battle-commencement-active');

    const revealDiv = document.createElement('div');
    revealDiv.id = 'enemyCardReveal';
    revealDiv.className = 'enemy-card-reveal';

    revealDiv.classList.add(`card-reveal-${enemyCard.rarity}`);
    const aspectClass = `aspect-effect-${enemyCard.aspect.toLowerCase()}`;
    if (['void', 'fire', 'earth', 'air', 'water', 'life', 'death'].includes(enemyCard.aspect.toLowerCase())) {
      revealDiv.classList.add(aspectClass);
    }

    const img = document.createElement('img');
    img.src = enemyCard.image;
    img.alt = enemyCard.name;
    img.onerror = () => { img.src = '/Images/Game Art/Creatures/Umbral Mite.png'; };
    revealDiv.appendChild(img);

    const frameImg = document.createElement('img');
    frameImg.src = enemyCard.frame;
    frameImg.style.position = 'absolute';
    frameImg.style.top = '0';
    frameImg.style.left = '0';
    frameImg.style.width = '100%';
    frameImg.style.height = '100%';
    frameImg.style.pointerEvents = 'none';
    revealDiv.appendChild(frameImg);

    document.body.appendChild(revealDiv);

    playRaritySound(enemyCard.rarity);

    const duration = getAnimationDuration(enemyCard.rarity);
    setTimeout(() => {
      dismissBattleAnimation(resolve);
    }, duration);
  });
}

function playRaritySound(rarity: CardRarity): void {
  const soundMap: Record<CardRarity, string> = {
    common: 'card_play',
    uncommon: 'runeReveal',
    rare: 'duel_start',
    epic: 'Boon_Unlock',
    legendary: 'True_Name_Complete'
  };
  const sound = soundMap[rarity] || 'card_play';
  playSfx(sound);
  if (rarity === 'legendary') {
    startLoop('demonSummonBg');
  }
}

function getAnimationDuration(rarity: CardRarity): number {
  const durationMap: Record<CardRarity, number> = {
    common: 1200,
    uncommon: 1500,
    rare: 2000,
    epic: 2500,
    legendary: 3000
  };
  return durationMap[rarity] || 1500;
}

function dismissBattleAnimation(resolve: () => void): void {
  const gameContainer = el('gameContainer');
  const revealDiv = el('enemyCardReveal');

  if (gameContainer) {
    gameContainer.classList.remove('battle-commencement-active');
  }

  if (revealDiv) {
    revealDiv.style.transition = 'opacity 0.3s ease-out';
    revealDiv.style.opacity = '0';
    setTimeout(() => {
      if (revealDiv.parentNode) {
        revealDiv.remove();
      }
      stopLoop('demonSummonBg');
      resolve();
    }, 300);
  } else {
    resolve();
  }
}