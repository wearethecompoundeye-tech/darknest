// js/core/persistence.ts
// Save/load with IndexedDB. Demon fields removed.

import { batch } from '@preact/signals-core';
import {
  playerName, ingredients, crafted, knownRunes, selectedRunes, runeSlots,
  masteryLevel, masteryXP, masteryNeeded, storyProgress, will, health, maxWill,
  suspicion, seedResonance, maxSeedResonance, quotaRemaining, actionCounter,
  tithePaidThisDay, timerSeconds,
  unidentifiedRelics, knownRelics, oldEquippedRelics, revealedRituals,
  hasSpecialIngredient, temporaryBuffs,
  familiar, lastPetTime, lastForageTime, totalSummons, totalExplorations,
  totalWillClashWins, tutorial, discoveries, currentMaze, circleQuality,
  circleIntegrity, ledgerEntries, ashAvailable, pendingAshRemains, itemUsageDaily,
  orbexFragments, maxOrbexFragments, corruptionLevel,
  orbexBoons, alcovesDiscovered, mazePathsUnlocked,
  kalgothsNoose, circlePower, circleMastery,
  ownedCards, equippedEntitySlots, equippedSpellSlots, equippedEnhancementSlots,
  equippedLandSlots, ownedRelics, equippedRelics,
  gazeIntensity, wardIntegrities, gazeSurvivalCount, dailyConsumableSlots,
  kalgothsPower,
} from './state-signals.js';
import { getStorage, type SaveSlotMeta } from './storage.js';

const CURRENT_VERSION = 1;
let currentSlot = 'autosave';

function serialize(): any {
  return {
    version: CURRENT_VERSION,
    playerName: playerName.value,
    ingredients: ingredients.value,
    crafted: crafted.value,
    knownRunes: knownRunes.value,
    selectedRunes: selectedRunes.value,
    runeSlots: runeSlots.value,
    masteryLevel: masteryLevel.value,
    masteryXP: masteryXP.value,
    masteryNeeded: masteryNeeded.value,
    storyProgress: storyProgress.value,
    will: will.value,
    health: health.value,
    maxWill: maxWill.value,
    suspicion: suspicion.value,
    seedResonance: seedResonance.value,
    maxSeedResonance: maxSeedResonance.value,
    quotaRemaining: quotaRemaining.value,
    actionCounter: actionCounter.value,
    tithePaidThisDay: tithePaidThisDay.value,
    timerSeconds: timerSeconds.value,
    unidentifiedRelics: unidentifiedRelics.value,
    knownRelics: knownRelics.value,
    equippedRelics: oldEquippedRelics.value,
    revealedRituals: Array.from(revealedRituals.value),
    hasSpecialIngredient: hasSpecialIngredient.value,
    temporaryBuffs: temporaryBuffs.value,
    familiar: familiar.value,
    lastPetTime: lastPetTime.value,
    lastForageTime: lastForageTime.value,
    totalSummons: totalSummons.value,
    totalExplorations: totalExplorations.value,
    totalWillClashWins: totalWillClashWins.value,
    tutorial: tutorial.value,
    discoveries: discoveries.value,
    currentMaze: currentMaze.value,
    circleQuality: circleQuality.value,
    circleIntegrity: circleIntegrity.value,
    ledgerEntries: ledgerEntries.value,
    ashAvailable: ashAvailable.value,
    pendingAshRemains: pendingAshRemains.value,
    itemUsageDaily: itemUsageDaily.value,
    orbexFragments: orbexFragments.value,
    maxOrbexFragments: maxOrbexFragments.value,
    corruptionLevel: corruptionLevel.value,
    orbexBoons: orbexBoons.value,
    alcovesDiscovered: alcovesDiscovered.value,
    mazePathsUnlocked: mazePathsUnlocked.value,
    kalgothsNoose: kalgothsNoose.value,
    circlePower: circlePower.value,
    circleMastery: circleMastery.value,
    ownedCards: ownedCards.value,
    equippedEntitySlots: equippedEntitySlots.value,
    equippedSpellSlots: equippedSpellSlots.value,
    equippedEnhancementSlots: equippedEnhancementSlots.value,
    equippedLandSlots: equippedLandSlots.value,
    ownedRelics: ownedRelics.value,
    equippedRelicsNew: equippedRelics.value,
    gazeIntensity: gazeIntensity.value,
    wardIntegrities: wardIntegrities.value,
    gazeSurvivalCount: gazeSurvivalCount.value,
    dailyConsumableSlots: dailyConsumableSlots.value,
    kalgothsPower: kalgothsPower.value,
  };
}

export let autoSave: () => void;
export let loadSaveData: (data: any) => void;

export function setCurrentSlot(slotId: string): void {
  currentSlot = slotId;
}

export async function saveToSlot(slotId: string): Promise<void> {
  const data = serialize();
  const meta: SaveSlotMeta = {
    id: slotId,
    label: slotId === 'autosave' ? 'Autosave' : `Save ${slotId.replace('slot', '')}`,
    timestamp: Date.now(),
    version: CURRENT_VERSION,
    playerName: playerName.value,
    orbexFragments: orbexFragments.value,
  };
  await getStorage().save(slotId, data, meta);
}

export async function loadFromSlot(slotId: string): Promise<boolean> {
  const data = await getStorage().load(slotId);
  if (!data) return false;
  loadSaveData(data);
  currentSlot = slotId;
  return true;
}

export async function getSlotList(): Promise<SaveSlotMeta[]> {
  return getStorage().listSlots();
}

export async function deleteSlot(slotId: string): Promise<void> {
  await getStorage().delete(slotId);
}

autoSave = () => {
  saveToSlot(currentSlot);
};

loadSaveData = (data: any) => {
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
    if (data.kalgothsPower !== undefined) kalgothsPower.value = data.kalgothsPower;
  });
};

export async function initSaveSystem(): Promise<void> {
  const oldData = localStorage.getItem('kalgothGazeOrbitSave');
  if (oldData) {
    try {
      const parsed = JSON.parse(oldData);
      if (parsed && parsed.playerName) {
        await saveToSlot('slot1');
        console.log('Migrated old save to slot1');
      }
    } catch {}
    localStorage.removeItem('kalgothGazeOrbitSave');
  }

  const autosaveLoaded = await loadFromSlot('autosave');
  if (!autosaveLoaded) {
    const slot1Loaded = await loadFromSlot('slot1');
    if (!slot1Loaded) {
      console.log('No save found, starting new game.');
    }
  }
}