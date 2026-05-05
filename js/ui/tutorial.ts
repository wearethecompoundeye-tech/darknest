// js/ui/tutorial.ts
// Fully scripted, cinematic tutorial with Zelion the Whisp
// Phases in/out, sparkle particles, humorous dialogue, step-by-step guidance

import {
  state,
  tutorial,
  ingredients,
  crafted,
  knownRunes,
  totalSummons,
  totalExplorations,
  tithePaidThisDay,
  familiar,
  orbexFragments,
  health,
  will,
  kalgothsNoose,
  circlePower,
  circleMastery,
  ownedCards,
  equippedEntitySlots,
  circleQuality,
  gazeSurvivalCount,
  dailyConsumableSlots,
  activeDemon
} from '../core/state-signals.js';
import { addLog } from './log-manager.js';
import { el } from '../core/dom-helper.js';
import { playSfx } from '../audio/sfx.js';

// Tutorial state
let tutorialActive = false;
let currentStepIndex = 0;
let tutorialEnabled = true;
let whispElement: HTMLDivElement | null = null;
let dialogueBubble: HTMLDivElement | null = null;
let sparkleContainer: HTMLDivElement | null = null;
let highlightElement: HTMLElement | null = null;
let stepTimeout: number | null = null;
let isWaitingForAction = false;
let actionCheckInterval: number | null = null;

// Dialogue from Zelion
const ZELION = {
  intro: [
    "Oh good, you're finally awake!",
    "Although there's nothing good about waking up in this nightmare of a place..."
  ],
  intro2: [
    "You are trapped in the Undercrypts and your only chance to survive here is to listen to me, Zelion, your friendly summoning companion!",
    "This place is dark, dank and dangerously close to a cave in... so are you ready to rock?!"
  ],
  circle: "This is... yep, you guessed it, The Summoning Circle!",
  trace: "Click this button and drag the void spark at the top of the circle along the line to trace it.",
  traceComplete: "Hey, you're a natural, have you done this before?",
  powder: "Grind the cave moss and the worm phlegm in this mortar carved from the skull of a rabid crypt spawn! It's so gross but the resulting powder is a key component in stabilizing your circle within its surroundings. Make sure to drag your pestle within the center band to get the most bang for your muck.",
  phial: "You need to boil your favorite phlegm with some void salts in order to seal the powder and prevent it from exploding in your face!",
  phial2: "Just follow the rune sequence to balance the brew, smells kinda good... in an awful kinda way.",
  rune: "Now select a rune pattern from the grid. These ancient symbols will empower your summons!",
  equip: "Open your Grimoire and equip an entity. That Umbral Mite looks... friendly?",
  summon: "You've got powder, a phial, the circle traced, and an entity equipped. Hit that SUMMON button and let's see what crawls out!",
  summonVictory: "Wow! You actually beat it! Quick, ensnare it before it changes its mind!",
  bandolier: "The Gaze is coming. Assign your consumables to the bandolier slots so you can use them quickly when things get... intense.",
  gazeWarning: "Kalgoth's Gaze approaches! Stay in the circle and use your consumables to survive. I'll be right here... hiding.",
  gazeSurvived: "You survived! Not bad for a first-timer. The Gaze will return each day, stronger. Keep exploring and growing your power!"
};

interface TutorialStep {
  id: string;
  trigger: () => boolean;
  elementId?: string;
  dialogue: string | string[];
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  waitForAction?: boolean;
  actionDescription?: string;
  onStart?: () => void;
  onComplete?: () => void;
  skippable?: boolean;
}

const steps: TutorialStep[] = [
  {
    id: 'intro',
    trigger: () => true,
    dialogue: ZELION.intro,
    position: 'center',
    waitForAction: true
  },
  {
    id: 'intro2',
    trigger: () => true,
    dialogue: ZELION.intro2,
    position: 'center',
    waitForAction: true
  },
  {
    id: 'circle',
    trigger: () => true,
    elementId: 'ritualCircle',
    dialogue: ZELION.circle,
    position: 'top',
    waitForAction: true
  },
  {
    id: 'trace',
    trigger: () => circleQuality.value === 0,
    elementId: 'traceCircleBtn',
    dialogue: ZELION.trace,
    position: 'top',
    waitForAction: true,
    onStart: () => {
      actionCheckInterval = window.setInterval(() => {
        if (circleQuality.value > 0) {
          advanceTutorial();
        }
      }, 200);
    }
  },
  {
    id: 'traceComplete',
    trigger: () => circleQuality.value > 0,
    dialogue: ZELION.traceComplete,
    position: 'center',
    waitForAction: true
  },
  {
    id: 'powder',
    trigger: () => crafted.value.powderOfWarding === 0,
    elementId: 'craftPowderBtn',
    dialogue: ZELION.powder,
    position: 'right',
    waitForAction: true,
    onStart: () => {
      actionCheckInterval = window.setInterval(() => {
        if (crafted.value.powderOfWarding > 0) {
          advanceTutorial();
        }
      }, 200);
    }
  },
  {
    id: 'phial',
    trigger: () => crafted.value.phialOfSubjugation === 0,
    elementId: 'craftPotionBtn',
    dialogue: ZELION.phial,
    position: 'right',
    waitForAction: true
  },
  {
    id: 'phial2',
    trigger: () => crafted.value.phialOfSubjugation === 0,
    dialogue: ZELION.phial2,
    position: 'center',
    waitForAction: true,
    onStart: () => {
      actionCheckInterval = window.setInterval(() => {
        if (crafted.value.phialOfSubjugation > 0) {
          advanceTutorial();
        }
      }, 200);
    }
  },
  {
    id: 'equip',
    trigger: () => equippedEntitySlots.value.filter(id => id).length === 0,
    elementId: 'captureJar',
    dialogue: ZELION.equip,
    position: 'left',
    waitForAction: true,
    onStart: () => {
      actionCheckInterval = window.setInterval(() => {
        if (equippedEntitySlots.value.some(id => id)) {
          advanceTutorial();
        }
      }, 200);
    }
  },
  {
    id: 'summon',
    trigger: () => totalSummons.value === 0,
    elementId: 'summonBtn',
    dialogue: ZELION.summon,
    position: 'top',
    waitForAction: true,
    onStart: () => {
      actionCheckInterval = window.setInterval(() => {
        if (totalSummons.value > 0) {
          advanceTutorial();
        }
      }, 200);
    }
  },
  {
    id: 'summonVictory',
    trigger: () => totalSummons.value > 0 && activeDemon.value !== null,
    dialogue: ZELION.summonVictory,
    position: 'center',
    waitForAction: true
  },
  {
    id: 'bandolier',
    trigger: () => dailyConsumableSlots.value.every(s => s === ''),
    elementId: 'toggleBandolierBtn',
    dialogue: ZELION.bandolier,
    position: 'left',
    waitForAction: true,
    onStart: () => {
      actionCheckInterval = window.setInterval(() => {
        if (dailyConsumableSlots.value.some(s => s !== '')) {
          advanceTutorial();
        }
      }, 200);
    }
  },
  {
    id: 'gazeWarning',
    trigger: () => gazeSurvivalCount.value === 0,
    dialogue: ZELION.gazeWarning,
    position: 'center',
    waitForAction: true,
    onStart: () => {
      actionCheckInterval = window.setInterval(() => {
        if (gazeSurvivalCount.value > 0) {
          advanceTutorial();
        }
      }, 200);
    }
  },
  {
    id: 'gazeSurvived',
    trigger: () => gazeSurvivalCount.value > 0,
    dialogue: ZELION.gazeSurvived,
    position: 'center',
    waitForAction: true,
    onComplete: () => {
      tutorialEnabled = false;
      tutorial.value = { ...tutorial.value, guidedFirstDayComplete: true, firstGazeSurvived: true };
      addLog('Zelion: "You\'re on your own now. I\'ll be here if you need hints."', false, 'whisp');
    }
  }
];

// Helper functions for Whisp effects
function createSparkleBurst(x: number, y: number): void {
  if (!sparkleContainer) {
    sparkleContainer = document.createElement('div');
    sparkleContainer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10005;';
    document.body.appendChild(sparkleContainer);
  }
  for (let i = 0; i < 20; i++) {
    const spark = document.createElement('div');
    spark.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 4px;
      height: 4px;
      background: radial-gradient(circle, #d4af37, #a0d07a);
      border-radius: 50%;
      pointer-events: none;
      animation: sparkleFade 1s ease-out forwards;
    `;
    const angle = (i / 20) * Math.PI * 2;
    const distance = 30 + Math.random() * 50;
    spark.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
    spark.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
    sparkleContainer.appendChild(spark);
    setTimeout(() => spark.remove(), 1000);
  }
}

function createWhisp(center: boolean = false): HTMLDivElement {
  if (whispElement) {
    whispElement.remove();
  }
  const div = document.createElement('div');
  div.className = 'zelion-tutorial-sprite';
  div.style.cssText = `
    position: fixed;
    width: 60px;
    height: 60px;
    background: radial-gradient(circle at 35% 35%, #c0e080, #5a8a3a 60%, #2a4a1a);
    border-radius: 50%;
    box-shadow: 0 0 20px #8ac060, 0 0 40px #4a7a2a;
    z-index: 10004;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease, left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    animation: zelionFloat 4s ease-in-out infinite;
  `;
  if (center) {
    div.style.left = '50%';
    div.style.top = '50%';
    div.style.transform = 'translate(-50%, -50%)';
  }
  const eye = document.createElement('div');
  eye.style.cssText = `
    position: absolute;
    top: 14px;
    left: 18px;
    width: 14px;
    height: 14px;
    background: radial-gradient(circle, #fff 0%, #d4f0a0 80%);
    border-radius: 50%;
    opacity: 0.95;
    animation: zelionBlink 3s infinite;
  `;
  const pupil = document.createElement('div');
  pupil.style.cssText = `
    position: absolute;
    top: 3px;
    left: 3px;
    width: 6px;
    height: 6px;
    background: #1a3a0a;
    border-radius: 50%;
  `;
  eye.appendChild(pupil);
  div.appendChild(eye);
  document.body.appendChild(div);
  return div;
}

function showDialogue(text: string | string[], showContinue: boolean = false): void {
  if (dialogueBubble) dialogueBubble.remove();
  dialogueBubble = document.createElement('div');
  dialogueBubble.className = 'zelion-dialogue';
  dialogueBubble.style.cssText = `
    position: fixed;
    background: rgba(10, 5, 20, 0.95);
    border: 2px solid #8ac060;
    border-radius: 24px 24px 24px 8px;
    padding: 18px 24px;
    max-width: 350px;
    color: #e7dacf;
    font-size: 0.95rem;
    backdrop-filter: blur(8px);
    z-index: 10003;
    box-shadow: 0 8px 30px rgba(0,0,0,0.8), 0 0 25px #6a9a4a;
    pointer-events: auto;
    line-height: 1.5;
    transition: opacity 0.2s;
  `;
  const content = Array.isArray(text) ? text.join('<br><br>') : text;
  dialogueBubble.innerHTML = content;
  if (showContinue) {
    const btn = document.createElement('div');
    btn.textContent = 'Click to continue';
    btn.style.cssText = 'margin-top:15px; text-align:right; color:#a0d07a; font-size:0.8rem; cursor:pointer;';
    btn.addEventListener('click', () => {
      advanceTutorial();
    });
    dialogueBubble.appendChild(btn);
  }
  document.body.appendChild(dialogueBubble);
}

function positionElements(target?: HTMLElement, position: string = 'bottom'): void {
  if (!whispElement || !dialogueBubble) return;
  if (position === 'center' || !target) {
    whispElement.style.left = '50%';
    whispElement.style.top = '45%';
    whispElement.style.transform = 'translate(-50%, -50%) scale(1.3)';
    dialogueBubble.style.left = '50%';
    dialogueBubble.style.top = '55%';
    dialogueBubble.style.transform = 'translateX(-50%)';
    return;
  }
  const rect = target.getBoundingClientRect();
  const spacing = 20;
  let wx = 0, wy = 0, bx = 0, by = 0;
  const w = 60, h = 60;
  const bw = Math.min(350, dialogueBubble.offsetWidth);
  const bh = dialogueBubble.offsetHeight;
  switch (position) {
    case 'right':
      wx = rect.right + spacing;
      wy = rect.top + rect.height/2 - h/2;
      bx = wx + w + spacing;
      by = rect.top + rect.height/2 - bh/2;
      break;
    case 'left':
      wx = rect.left - w - spacing;
      wy = rect.top + rect.height/2 - h/2;
      bx = wx - bw - spacing;
      by = rect.top + rect.height/2 - bh/2;
      break;
    case 'top':
      wx = rect.left + rect.width/2 - w/2;
      wy = rect.top - h - spacing;
      bx = rect.left + rect.width/2 - bw/2;
      by = wy - bh - spacing;
      break;
    case 'bottom':
    default:
      wx = rect.left + rect.width/2 - w/2;
      wy = rect.bottom + spacing;
      bx = rect.left + rect.width/2 - bw/2;
      by = wy + h + spacing;
      break;
  }
  const pad = 10;
  wx = Math.max(pad, Math.min(window.innerWidth - w - pad, wx));
  wy = Math.max(pad, Math.min(window.innerHeight - h - pad, wy));
  bx = Math.max(pad, Math.min(window.innerWidth - bw - pad, bx));
  by = Math.max(pad, Math.min(window.innerHeight - bh - pad, by));
  whispElement.style.left = wx + 'px';
  whispElement.style.top = wy + 'px';
  whispElement.style.transform = 'scale(1)';
  dialogueBubble.style.left = bx + 'px';
  dialogueBubble.style.top = by + 'px';
  dialogueBubble.style.transform = 'none';
}

function highlightTarget(elementId: string): void {
  if (highlightElement) {
    highlightElement.classList.remove('zelion-highlight');
  }
  const el = document.getElementById(elementId);
  if (el) {
    el.classList.add('zelion-highlight');
    highlightElement = el;
  }
}

function clearHighlight(): void {
  if (highlightElement) {
    highlightElement.classList.remove('zelion-highlight');
    highlightElement = null;
  }
}

function dismissTutorialUI(): void {
  if (whispElement) { whispElement.remove(); whispElement = null; }
  if (dialogueBubble) { dialogueBubble.remove(); dialogueBubble = null; }
  if (sparkleContainer) { sparkleContainer.remove(); sparkleContainer = null; }
  clearHighlight();
  if (stepTimeout) { clearTimeout(stepTimeout); stepTimeout = null; }
  if (actionCheckInterval) { clearInterval(actionCheckInterval); actionCheckInterval = null; }
}

function advanceTutorial(): void {
  if (actionCheckInterval) { clearInterval(actionCheckInterval); actionCheckInterval = null; }
  if (!tutorialActive || !tutorialEnabled) return;
  const step = steps[currentStepIndex];
  if (step?.onComplete) step.onComplete();
  if (actionCheckInterval) { clearInterval(actionCheckInterval); actionCheckInterval = null; }
  if (actionCheckInterval) { clearInterval(actionCheckInterval); actionCheckInterval = null; }
  currentStepIndex++;
  if (currentStepIndex < steps.length) {
    executeStep(currentStepIndex);
  } else {
    finishTutorial();
  }
}

function executeStep(index: number): void {
  if (index >= steps.length) return;
  const step = steps[index];
  if (step.trigger && !step.trigger()) {
    currentStepIndex = index;
    dismissTutorialUI();
    tutorialActive = false;
    return;
  }
  dismissTutorialUI();
  const center = step.position === 'center' || !step.elementId;
  whispElement = createWhisp(center);
  setTimeout(() => { if (whispElement) whispElement.style.opacity = '1'; }, 10);
  const rect = whispElement.getBoundingClientRect();
  createSparkleBurst(rect.left + 30, rect.top + 30);
  showDialogue(step.dialogue, step.waitForAction);
  if (step.elementId) {
    const target = document.getElementById(step.elementId);
    if (target) {
      positionElements(target, step.position);
      highlightTarget(step.elementId);
    } else {
      positionElements(undefined, 'center');
    }
  } else {
    positionElements(undefined, 'center');
  }
  if (step.onStart) step.onStart();
  if (!step.waitForAction) {
    stepTimeout = window.setTimeout(() => advanceTutorial(), 4000);
  }
}

function finishTutorial(): void {
  dismissTutorialUI();
  tutorialActive = false;
  tutorialEnabled = false;
  tutorial.value = { ...tutorial.value, guidedFirstDayComplete: true };
  addLog('Zelion: "Tutorial complete! Good luck out there."', false, 'whisp');
}

// Public API
export function initTutorial(): void {
  if (tutorial.value.guidedFirstDayComplete || gazeSurvivalCount.value > 0) {
    tutorialEnabled = false;
    return;
  }
  tutorialActive = true;
  tutorialEnabled = true;
  currentStepIndex = 0;
  executeStep(0);
}

export function checkTutorialProgress(): void {
  // Progress is handled by actionCheckInterval in each step
}

export function setTutorialEnabled(enabled: boolean): void {
  tutorialEnabled = enabled;
  if (!enabled && tutorialActive) {
    dismissTutorialUI();
    tutorialActive = false;
  }
}

export function isTutorialEnabled(): boolean { return tutorialEnabled; }
export function showTutorialPopup(stepId: string): void { /* Manual popup not used in scripted tutorial */ }
export function getContextualHint(): string { return "Listen to Zelion. He knows what he's doing... mostly."; }
export function openWhispStats(): void { /* unchanged */ }