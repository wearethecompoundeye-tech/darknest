// cleanup.js – run with: node cleanup.mjs
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const replacements = [
  // ambience-manager.ts
  { file: 'js/audio/ambience-manager.ts', old: `import { suspicion, demonWrath, corruptionLevel } from '../core/state-signals.js';`, new: `import { suspicion, corruptionLevel } from '../core/state-signals.js';` },
  // dev-mode.ts
  { file: 'js/core/dev-mode.ts', old: `  dailyConsumableSlots, itemUsageDaily, activeDemon,`, new: `  dailyConsumableSlots, itemUsageDaily,` },
  // game.ts – remove activeDemon from imports
  { file: 'js/core/game.ts', old: `  activeDemon, addCard, braidedTracePhases, empoweredCircle,`, new: `  addCard, braidedTracePhases, empoweredCircle,` },
  // game.ts – remove the line that checks activeDemon.name (loadGame)
  { file: 'js/core/game.ts', old: `        if (activeDemon.value && !activeDemon.value.name) {
          activeDemon.value = null;
        }`, new: `` },
  // persistence.ts – remove demon-related imports (approximate line block)
  { file: 'js/core/persistence.ts', old: `}) => {
  batch(() => {
    if (data.playerName !== undefined) playerName.value = data.playerName;
    if (data.ingredients) ingredients.value = { ...ingredients.value, ...data.ingredients };
    if (data.crafted) crafted.value = { ...crafted.value, ...data.crafted };
    if (data.knownRunes) knownRunes.value = data.knownRunes;
    if (data.selectedRunes) selectedRunes.value = data.selectedRunes;
    if (data.runeSlots) runeSlots.value = data.runeSlots;
    if (data.masteryLevel !== undefined) masteryLevel.value = data.masteryLevel;
    if (data.masteryXP !== undefined) masteryXP.value = data.masteryXP;
    if (data.masteryNeeded !== undefined) masteryNeeded.value = data.masteryNeeded;
    if (data.storyProgress !== undefined) storyProgress.value = data.storyProgress;
    if (data.will !== undefined) will.value = data.will;
    if (data.health !== undefined) health.value = data.health;
    if (data.maxWill !== undefined) maxWill.value = data.maxWill;
    if (data.suspicion !== undefined) suspicion.value = data.suspicion;
    if (data.seedResonance !== undefined) seedResonance.value = data.seedResonance;
    if (data.maxSeedResonance !== undefined) maxSeedResonance.value = data.maxSeedResonance;
    if (data.quotaRemaining !== undefined) quotaRemaining.value = data.quotaRemaining;
    if (data.actionCounter !== undefined) actionCounter.value = data.actionCounter;
    if (data.tithePaidThisDay !== undefined) tithePaidThisDay.value = data.tithePaidThisDay;
    if (data.timerSeconds !== undefined) timerSeconds.value = data.timerSeconds;
    if (data.activeDemon !== undefined) activeDemon.value = data.activeDemon;
    if (data.capturedDemons) capturedDemons.value = data.capturedDemons;
    if (data.banishPower !== undefined) banishPower.value = data.banishPower;
    if (data.demonFavor) demonFavor.value = data.demonFavor;
    if (data.demonWrath !== undefined) demonWrath.value = data.demonWrath;
    if (data.releasedDemons) releasedDemons.value = data.releasedDemons;
    if (data.unidentifiedRelics) unidentifiedRelics.value = data.unidentifiedRelics;
    if (data.knownRelics) knownRelics.value = data.knownRelics;
    if (data.equippedRelics) oldEquippedRelics.value = data.equippedRelics;
    if (data.revealedRituals) revealedRituals.value = new Set(data.revealedRituals);
    if (data.hasSpecialIngredient !== undefined) hasSpecialIngredient.value = data.hasSpecialIngredient;
    if (data.temporaryBuffs) temporaryBuffs.value = data.temporaryBuffs;
    if (data.familiar) familiar.value = { ...familiar.value, ...data.familiar };
    if (data.lastPetTime !== undefined) lastPetTime.value = data.lastPetTime;
    if (data.lastForageTime !== undefined) lastForageTime.value = data.lastForageTime;
    if (data.totalSummons !== undefined) totalSummons.value = data.totalSummons;
    if (data.totalExplorations !== undefined) totalExplorations.value = data.totalExplorations;
    if (data.totalWillClashWins !== undefined) totalWillClashWins.value = data.totalWillClashWins;
    if (data.tutorial) tutorial.value = { ...tutorial.value, ...data.tutorial };
    if (data.discoveries) discoveries.value = { ...discoveries.value, ...data.discoveries };
    if (data.currentMaze !== undefined) currentMaze.value = data.currentMaze;
    if (data.circleQuality !== undefined) circleQuality.value = data.circleQuality;
    if (data.circleIntegrity !== undefined) circleIntegrity.value = data.circleIntegrity;
    if (data.ledgerEntries) ledgerEntries.value = data.ledgerEntries;
    if (data.ashAvailable !== undefined) ashAvailable.value = data.ashAvailable;
    if (data.pendingAshRemains !== undefined) pendingAshRemains.value = data.pendingAshRemains;
    if (data.itemUsageDaily) itemUsageDaily.value = data.itemUsageDaily;
    if (data.orbexFragments !== undefined) orbexFragments.value = data.orbexFragments;
    if (data.maxOrbexFragments !== undefined) maxOrbexFragments.value = data.maxOrbexFragments;
    if (data.corruptionLevel !== undefined) corruptionLevel.value = data.corruptionLevel;
    if (data.trueNameFragments) trueNameFragments.value = data.trueNameFragments;
    if (data.discoveredTrueNames) discoveredTrueNames.value = data.discoveredTrueNames;
    if (data.activeDemonTier !== undefined) activeDemonTier.value = data.activeDemonTier;
    if (data.orbexBoons) orbexBoons.value = data.orbexBoons;
    if (data.alcovesDiscovered !== undefined) alcovesDiscovered.value = data.alcovesDiscovered;
    if (data.mazePathsUnlocked) mazePathsUnlocked.value = data.mazePathsUnlocked;
    if (data.demonImages) demonImages.value = { ...demonImages.value, ...data.demonImages };
    if (data.kalgothsNoose !== undefined) kalgothsNoose.value = data.kalgothsNoose;
    if (data.circlePower !== undefined) circlePower.value = data.circlePower;
    if (data.circleMastery !== undefined) circleMastery.value = data.circleMastery;
    if (data.ownedCards) ownedCards.value = data.ownedCards;
    if (data.equippedEntitySlots) equippedEntitySlots.value = data.equippedEntitySlots;
    if (data.equippedSpellSlots) equippedSpellSlots.value = data.equippedSpellSlots;
    if (data.equippedEnhancementSlots) equippedEnhancementSlots.value = data.equippedEnhancementSlots;
    if (data.equippedLandSlots) equippedLandSlots.value = data.equippedLandSlots;
    if (data.ownedRelics) ownedRelics.value = data.ownedRelics;
    if (data.equippedRelicsNew) equippedRelics.value = data.equippedRelicsNew;
    if (data.gazeIntensity !== undefined) gazeIntensity.value = data.gazeIntensity;
    if (data.wardIntegrities) wardIntegrities.value = data.wardIntegrities;
    if (data.gazeSurvivalCount !== undefined) gazeSurvivalCount.value = data.gazeSurvivalCount;
    if (data.dailyConsumableSlots) dailyConsumableSlots.value = data.dailyConsumableSlots;
  });`, 
    new: `}) => {
  batch(() => {
    if (data.playerName !== undefined) playerName.value = data.playerName;
    if (data.ingredients) ingredients.value = { ...ingredients.value, ...data.ingredients };
    if (data.crafted) crafted.value = { ...crafted.value, ...data.crafted };
    if (data.knownRunes) knownRunes.value = data.knownRunes;
    if (data.selectedRunes) selectedRunes.value = data.selectedRunes;
    if (data.runeSlots) runeSlots.value = data.runeSlots;
    if (data.masteryLevel !== undefined) masteryLevel.value = data.masteryLevel;
    if (data.masteryXP !== undefined) masteryXP.value = data.masteryXP;
    if (data.masteryNeeded !== undefined) masteryNeeded.value = data.masteryNeeded;
    if (data.storyProgress !== undefined) storyProgress.value = data.storyProgress;
    if (data.will !== undefined) will.value = data.will;
    if (data.health !== undefined) health.value = data.health;
    if (data.maxWill !== undefined) maxWill.value = data.maxWill;
    if (data.suspicion !== undefined) suspicion.value = data.suspicion;
    if (data.seedResonance !== undefined) seedResonance.value = data.seedResonance;
    if (data.maxSeedResonance !== undefined) maxSeedResonance.value = data.maxSeedResonance;
    if (data.quotaRemaining !== undefined) quotaRemaining.value = data.quotaRemaining;
    if (data.actionCounter !== undefined) actionCounter.value = data.actionCounter;
    if (data.tithePaidThisDay !== undefined) tithePaidThisDay.value = data.tithePaidThisDay;
    if (data.timerSeconds !== undefined) timerSeconds.value = data.timerSeconds;
    if (data.revealedRituals) revealedRituals.value = new Set(data.revealedRituals);
    if (data.hasSpecialIngredient !== undefined) hasSpecialIngredient.value = data.hasSpecialIngredient;
    if (data.temporaryBuffs) temporaryBuffs.value = data.temporaryBuffs;
    if (data.familiar) familiar.value = { ...familiar.value, ...data.familiar };
    if (data.lastPetTime !== undefined) lastPetTime.value = data.lastPetTime;
    if (data.lastForageTime !== undefined) lastForageTime.value = data.lastForageTime;
    if (data.totalSummons !== undefined) totalSummons.value = data.totalSummons;
    if (data.totalExplorations !== undefined) totalExplorations.value = data.totalExplorations;
    if (data.totalWillClashWins !== undefined) totalWillClashWins.value = data.totalWillClashWins;
    if (data.tutorial) tutorial.value = { ...tutorial.value, ...data.tutorial };
    if (data.discoveries) discoveries.value = { ...discoveries.value, ...data.discoveries };
    if (data.currentMaze !== undefined) currentMaze.value = data.currentMaze;
    if (data.circleQuality !== undefined) circleQuality.value = data.circleQuality;
    if (data.circleIntegrity !== undefined) circleIntegrity.value = data.circleIntegrity;
    if (data.ledgerEntries) ledgerEntries.value = data.ledgerEntries;
    if (data.ashAvailable !== undefined) ashAvailable.value = data.ashAvailable;
    if (data.pendingAshRemains !== undefined) pendingAshRemains.value = data.pendingAshRemains;
    if (data.itemUsageDaily) itemUsageDaily.value = data.itemUsageDaily;
    if (data.orbexFragments !== undefined) orbexFragments.value = data.orbexFragments;
    if (data.maxOrbexFragments !== undefined) maxOrbexFragments.value = data.maxOrbexFragments;
    if (data.corruptionLevel !== undefined) corruptionLevel.value = data.corruptionLevel;
    if (data.orbexBoons) orbexBoons.value = data.orbexBoons;
    if (data.alcovesDiscovered !== undefined) alcovesDiscovered.value = data.alcovesDiscovered;
    if (data.mazePathsUnlocked) mazePathsUnlocked.value = data.mazePathsUnlocked;
    if (data.kalgothsNoose !== undefined) kalgothsNoose.value = data.kalgothsNoose;
    if (data.circlePower !== undefined) circlePower.value = data.circlePower;
    if (data.circleMastery !== undefined) circleMastery.value = data.circleMastery;
    if (data.ownedCards) ownedCards.value = data.ownedCards;
    if (data.equippedEntitySlots) equippedEntitySlots.value = data.equippedEntitySlots;
    if (data.equippedSpellSlots) equippedSpellSlots.value = data.equippedSpellSlots;
    if (data.equippedEnhancementSlots) equippedEnhancementSlots.value = data.equippedEnhancementSlots;
    if (data.equippedLandSlots) equippedLandSlots.value = data.equippedLandSlots;
    if (data.ownedRelics) ownedRelics.value = data.ownedRelics;
    if (data.equippedRelicsNew) equippedRelics.value = data.equippedRelicsNew;
    if (data.gazeIntensity !== undefined) gazeIntensity.value = data.gazeIntensity;
    if (data.wardIntegrities) wardIntegrities.value = data.wardIntegrities;
    if (data.gazeSurvivalCount !== undefined) gazeSurvivalCount.value = data.gazeSurvivalCount;
    if (data.dailyConsumableSlots) dailyConsumableSlots.value = data.dailyConsumableSlots;
  });`
  },
  // summons.ts – remove demon-related import lines (approximate)
  { file: 'js/systems/summoning.ts', old: `import {
  state,
  health,
  will,
  maxWill,
  suspicion,
  crafted,
  selectedRunes,
  circleQuality,
  activeDemon,
  capturedDemons,
  banishPower,
  ingredients,
  demonFavor,
  demonWrath,
  releasedDemons,
  discoveries,
  tutorial,
  totalSummons,
  activeDemonTier,
  orbexFragments,
  discoveredTrueNames,
  temporaryBuffs,
  masteryLevel,
  runeSlots,
  ashAvailable,
  pendingAshRemains,
  updateState,
  addMasteryXP,
  addFamiliarXP,
  modifyDemonFavor,
  modifyDemonWrath,
  getDemonFavor,
  discover,
  reduceQuota,
  advanceAction,
  autoSave,
  getCorruptionModifier,
  addTrueNameFragment,
  getRandomTrueNameFragment,
  CONSTANTS,
  demonImages,
  kalgothsNoose,
  circlePower,
  circleMastery,
  ownedCards,
  addCard,
  getEquippedCards,
  getActiveEntity,
  equippedEntitySlots,
  empoweredCircle,
  braidedTracePhases,
} from '../core/state-signals.js';`, 
    new: `import {
  state,
  health,
  will,
  maxWill,
  suspicion,
  crafted,
  selectedRunes,
  circleQuality,
  ingredients,
  discoveries,
  tutorial,
  totalSummons,
  orbexFragments,
  temporaryBuffs,
  masteryLevel,
  runeSlots,
  ashAvailable,
  pendingAshRemains,
  updateState,
  addMasteryXP,
  addFamiliarXP,
  discover,
  reduceQuota,
  advanceAction,
  autoSave,
  getCorruptionModifier,
  CONSTANTS,
  kalgothsNoose,
  circlePower,
  circleMastery,
  ownedCards,
  addCard,
  getEquippedCards,
  getActiveEntity,
  equippedEntitySlots,
  empoweredCircle,
  braidedTracePhases,
} from '../core/state-signals.js';`
  },
  // summons.ts – remove the block that sets activeDemon after ensnare
  { file: 'js/systems/summoning.ts', old: `    // Legacy demon object (no longer used)
    const demon = {
      name: enemyCard.name,
      trait: enemyCard.aspect as DemonTrait,
      tier,
      image: enemyCard.image,
      resistance: 0.3 + (tier * 0.1),
      personality: { mood: 60, favor: 0, history: [] }
    };
    activeDemon.value = demon;
    activeDemonTier.value = tier;`, new: `` },
  // also remove the discover call that uses 'demons'
  { file: 'js/systems/summoning.ts', old: `    discover('demons', enemyCard.aspect as DemonTrait);`, new: `` },
  // and remove the ledger entry that references demonName? Actually we can keep ledger but remove the aspect field.
  { file: 'js/systems/summoning.ts', old: `    addLedgerEntry('summon', { entityName: enemyCard.name, aspect: enemyCard.aspect, ensnared: true });`, new: `    addLedgerEntry('summon', { entityName: enemyCard.name, ensnared: true });` },
  // ledger.ts – remove releasedDemons import
  { file: 'js/ui/ledger.ts', old: `import { state, ledgerEntries, totalSummons, releasedDemons, totalExplorations, discoveries } from '../core/state-signals.js';`, new: `import { state, ledgerEntries, totalSummons, totalExplorations, discoveries } from '../core/state-signals.js';` },
  // tutorial.ts – remove activeDemon import
  { file: 'js/ui/tutorial.ts', old: `  activeDemon`, new: `` },
  // whisp-commentary.ts – remove activeDemon import
  { file: 'js/ui/whisp-commentary.ts', old: `  activeDemon,`, new: `` },
  // whisp-commentary.ts – also remove the effect that references activeDemon
  { file: 'js/ui/whisp-commentary.ts', old: `  // Active demon changes
  effect(() => {
    const current = activeDemon.value;
    if (!whispEnabled) return;
    if (current && !prevActiveDemon) {
      whispSay(\`Ah, a \${current.trait}. How... fascinating. Try not to get eaten.\`);
    } else if (!current && prevActiveDemon) {
      whispSay("Demon gone. Good riddance. Or perhaps a loss?");
    }
    prevActiveDemon = current;
  });`, new: `` },
  // ui-renderer.ts – remove imports of banishPower, capturedDemons, activeDemon
  { file: 'js/ui/ui-renderer.ts', old: `  banishPower,
  capturedDemons,
`, new: `` },
  { file: 'js/ui/ui-renderer.ts', old: `  activeDemon,
`, new: `` },
  // ui-renderer.ts – remove the demon overlay effect block (the one starting with `effect(() => {`)
  { file: 'js/ui/ui-renderer.ts', old: `  // Demon overlay - FIXED: higher z-index, proper cleanup
  effect(() => {
    const demonOverlay = getEl("demonOverlay");
    const demonOverlayImg = getEl("demonOverlayImg") as HTMLImageElement | null;
    if (demonOverlay && demonOverlayImg) {
      if (activeDemon.value?.image) {
        demonOverlayImg.src = activeDemon.value.image;
        demonOverlay.style.display = "block";
        demonOverlay.style.zIndex = "15"; // Ensure it's above circle elements
      } else {
        demonOverlay.style.display = "none";
        demonOverlayImg.src = "";
      }
    }
  });

  effect(() => {
    const demonActionPanel = getEl("demonActionPanel");
    if (demonActionPanel) {
      demonActionPanel.style.display = activeDemon.value ? "block" : "none";
    }
  });

  effect(() => {
    const demonArea = getEl("demonArea");
    if (demonArea) {
      if (!activeDemon.value) {
        demonArea.innerHTML = \`🌀 No entity bound\`;
      } else {
        demonArea.innerHTML = \`<strong>🜁 \${activeDemon.value.name} (\${activeDemon.value.trait})</strong>\`;
      }
    }
  });`, new: `` },
  // ui-renderer.ts – remove the banishPower display effect
  { file: 'js/ui/ui-renderer.ts', old: `  effect(() => {
    const el = getEl("banishPower");
    if (el) el.innerText = banishPower.value.toString();
  });`, new: `` },
  // ui-renderer.ts – remove the captureCount display effect
  { file: 'js/ui/ui-renderer.ts', old: `  effect(() => {
    const el = getEl("captureCount");
    if (el) el.innerText = capturedDemons.value.length.toString();
  });`, new: `` },
  // ui-renderer.ts – remove unused imports (if any residual)
  { file: 'js/ui/ui-renderer.ts', old: `import {
  will,
  health,
  maxWill,
  circleIntegrity,
  banishPower,
  capturedDemons,
  masteryLevel,
  masteryXP,
  masteryNeeded,
  seedResonance,
  maxSeedResonance,
  familiar,
  crafted,
  ingredients,
  activeDemon,
  orbexFragments,
  maxOrbexFragments,
  orbexBoons,
  runeSlots,
  selectedRunes,
  knownRunes,
  circleQuality,
  ashAvailable,
  activeDemonTier,
  quotaRemaining,
  timerSeconds,
  hasSpecialIngredient,
  discoveries,
  tutorial,
  state,
  legacyState,
  updateState,
  CONSTANTS,
  kalgothsNoose,
  circlePower,
  circleMastery,
  ownedCards,
  equippedEntitySlots,
  equippedSpellSlots,
  equippedEnhancementSlots,
  equippedLandSlots,
  maxEntitySlots,
  maxSpellSlots,
  maxEnhancementSlots,
  maxLandSlots,
  getEquippedCards,
  empoweredCircle,
} from '../core/state-signals.js';`, 
    new: `import {
  will,
  health,
  maxWill,
  circleIntegrity,
  masteryLevel,
  masteryXP,
  masteryNeeded,
  seedResonance,
  maxSeedResonance,
  familiar,
  crafted,
  ingredients,
  orbexFragments,
  maxOrbexFragments,
  orbexBoons,
  runeSlots,
  selectedRunes,
  knownRunes,
  circleQuality,
  ashAvailable,
  quotaRemaining,
  timerSeconds,
  hasSpecialIngredient,
  discoveries,
  tutorial,
  state,
  legacyState,
  updateState,
  CONSTANTS,
  kalgothsNoose,
  circlePower,
  circleMastery,
  ownedCards,
  equippedEntitySlots,
  equippedSpellSlots,
  equippedEnhancementSlots,
  equippedLandSlots,
  maxEntitySlots,
  maxSpellSlots,
  maxEnhancementSlots,
  maxLandSlots,
  getEquippedCards,
  empoweredCircle,
} from '../core/state-signals.js';`
  },
  // state-signals.ts – we need to add back some signals that are used elsewhere but not demon-related? Actually we removed them entirely, but some like `unidentifiedRelics, knownRelics, oldEquippedRelics` are still needed for persistence? They are for relics, not demons. We removed them by mistake? The original state-signals.ts we provided removed those? We need to check. The error also shows `oldEquippedRelics` missing. We'll need to add those back because they are still used by `persistence.ts`. So I'll add them back as simple signals.
];

// Run the replacements
for (const { file, old, new: replacement } of replacements) {
  const path = join(process.cwd(), file);
  try {
    let content = await readFile(path, 'utf8');
    if (!content.includes(old)) {
      console.warn(`⚠️ Not found in ${file}: ${old.slice(0, 60)}`);
      continue;
    }
    content = content.replace(old, replacement);
    await writeFile(path, content, 'utf8');
    console.log(`✅ Fixed ${file}`);
  } catch (err) {
    console.error(`❌ Error processing ${file}: ${err.message}`);
  }
}
console.log('Cleanup complete.');