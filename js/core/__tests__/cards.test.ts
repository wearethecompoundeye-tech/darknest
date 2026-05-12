import { describe, it, expect } from 'vitest';
import { allCards } from '../../data/cards.js';

describe('Card data integrity', () => {
  const cards = allCards.filter(c => c.image && c.frame); // skip type definitions

  it('every card image should be a valid path', () => {
    for (const card of cards) {
      const ok =
        card.image.includes('/Images/') ||
        card.image.startsWith('http');
      expect(ok).toBe(true);
    }
  });

  it('every card frame should be a valid path', () => {
    for (const card of cards) {
      const ok =
        card.frame.includes('/Images/') ||
        card.frame.startsWith('http');
      expect(ok).toBe(true);
    }
  });

  it('should not contain unescaped hard‑coded absolute paths', () => {
    for (const card of cards) {
      expect(card.image).not.toMatch(/^'\//);
      expect(card.frame).not.toMatch(/^'\//);
    }
  });

  it("The Sunken God's Lament and The Sneeze's Echo should have correct apostrophes", () => {
    const lament = allCards.find(c => c.id === 'sunken_gods_lament');
    const sneezeEcho = allCards.find(c => c.id === 'sneezes_echo');
    expect(lament).toBeDefined();
    expect(sneezeEcho).toBeDefined();
    // They must contain the real apostrophe in the path, not an escaped one
    expect(lament!.image).toContain("The Sunken God's Lament.png");
    expect(sneezeEcho!.image).toContain("The Sneeze's Echo.png");
  });
});