// scripts/validate-cards.js
// Validates card data against expected structure.
const fs = require('fs');

const cardsPath = 'public/data/cards.json';
if (!fs.existsSync(cardsPath)) {
  console.log('cards.json not found – skipping validation.');
  process.exit(0);
}

const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
const errors = [];

const requiredFields = ['id', 'name', 'type', 'rarity', 'aspect', 'image', 'frame'];
const validTypes = ['entity', 'spell', 'enhancement', 'land'];
const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

cards.forEach((card, idx) => {
  // Required fields
  requiredFields.forEach(field => {
    if (!card[field]) {
      errors.push(`Card #${idx} (${card.id || 'unknown'}): missing field "${field}"`);
    }
  });

  // Valid type
  if (card.type && !validTypes.includes(card.type)) {
    errors.push(`Card #${idx} (${card.id}): invalid type "${card.type}"`);
  }

  // Valid rarity
  if (card.rarity && !validRarities.includes(card.rarity)) {
    errors.push(`Card #${idx} (${card.id}): invalid rarity "${card.rarity}"`);
  }

  // Entity-specific checks
  if (card.type === 'entity') {
    if (!card.stats || typeof card.stats !== 'object') {
      errors.push(`Card #${idx} (${card.id}): entity missing stats`);
    } else {
      const statFields = ['hp', 'atk', 'spd', 'cun', 'def', 'res', 'init', 'loyalty'];
      statFields.forEach(s => {
        if (typeof card.stats[s] !== 'number') {
          errors.push(`Card #${idx} (${card.id}): missing or invalid stat "${s}"`);
        }
      });
    }
  }
});

if (errors.length > 0) {
  console.error('Card validation errors:');
  errors.forEach(e => console.error('  -', e));
  process.exit(1);
} else {
  console.log(`Card validation passed (${cards.length} cards).`);
}
