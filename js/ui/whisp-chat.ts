// js/ui/whisp-chat.ts – Zilion: Enhanced trail & main‑UI‑constrained behaviour.
// Includes setWhispEnabled / isWhispEnabled for settings integration.
// 
// Size explanation: This file is large because it implements a fully interactive
// companion avatar with:
//   - idle animations (figure‑8, twirl, drift, shiver)
//   - smooth physics and boundary clamping
//   - eye tracking and blinking
//   - sleeping/waking with floating ‘Z’ particles
//   - a dense, glowing particle trail
//   - an AI chat panel (Ollama) with state‑aware conversation
//   - drag‑and‑drop repositioning
//   - modal dodge behaviour
//   - ambient particle effects
// All of these run in a single requestAnimationFrame loop, which is efficient.
// The heaviest part is the Ollama chat, which only activates when the player types.
// If you wish to reduce CPU load, you can disable the trail or reduce particle count
// by modifying TRAIL_PARTICLES_PER_SPAWN and TRAIL_LIFETIME at the top of the file.
//
// To completely disable Zilion and reclaim resources, call setWhispEnabled(false).

import { el } from '../core/dom-helper.js';
import { askOllama } from '../ai/ai-engine.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents, type WhispMessagePayload } from '../core/events.js';
import {
  corruptionLevel,
  health,
  will,
  maxWill,
  kalgothsNoose,
  orbexFragments,
  maxOrbexFragments,
  circlePower,
  circleMastery,
  gazeIntensity,
  isGazeActive,
  timerSeconds,
  ingredients,
  crafted,
  equippedEntitySlots,
  equippedSpellSlots,
  ownedCards,
  getEntityCombatStats,
} from '../core/state-signals.js';
import { getZilionMemory } from '../ai/zelionMemory.js';
import { currentPhase } from '../core/gameReducer.js';
import { getCardById, type Card, type EntityStats, type SpellStats } from '../data/cards.js';
import { checkForCombos, getAspectSynergyBonus } from '../systems/card-progression.js';

// ── Global enabled state (used by settings) ────────────────────
let whispEnabled = true;

export function setWhispEnabled(enabled: boolean): void {
  whispEnabled = enabled;
  if (S.av) {
    S.av.style.display = enabled ? '' : 'none';
  }
  if (S.trailParts) {
    S.trailParts.style.display = enabled ? '' : 'none';
  }
}

export function isWhispEnabled(): boolean {
  return whispEnabled;
}

// ── Internal state ─────────────────────────────────────────────
const S = {
  av: null as HTMLElement | null,
  body: null as HTMLElement | null,
  eye: null as HTMLElement | null,
  pupil: null as HTMLElement | null,
  refl: null as HTMLElement | null,
  bubble: null as HTMLElement | null,
  chatM: null as HTMLDivElement | null,
  chatInp: null as HTMLInputElement | null,
  chatMsgs: null as HTMLElement | null,
  left: 0, top: 0,
  defaultLeft: 0, defaultTop: 0,
  drag: false, startX: 0, startY: 0, startLeft: 0, startTop: 0,
  tX: 0, tY: 0, cX: 0, cY: 0,
  wanderTargetX: 0, wanderTargetY: 0,
  lastMouseMove: 0,
  blinkState: 1, blinkTarget: 1, nextBlink: 0, breathPhase: 0,
  glowIntensity: 1, glowTarget: 1, glowDecay: 0,
  emotion: 0,
  sleeping: false,
  sleepTimer: 0,
  sleepZElements: [] as HTMLElement[],
  behaviour: 'idle' as string,
  behaviourTimer: 0,
  targetLeft: 0, targetTop: 0,
  velocityX: 0, velocityY: 0,
  figure8Phase: 0,
  twirlAngle: 0,
  wakingUp: false, wakeStart: 0,
  lastClick: 0,
  modalOpen: false, dodgeLeft: 0, dodgeTop: 0,
  messageQueue: [] as { sender: string; text: string }[],
  trailParts: null as HTMLElement | null,
  lastTrailTime: 0,
  prevLeft: 0, prevTop: 0,
  cleanupInterval: null as number | null,
  cleanupAnimFrame: null as number | null,
  bounds: { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 },
  boundsDirty: true,
};

const EYE_RANGE = 10;
const AVATAR_SIZE = 75;
const TRAIL_INTERVAL = 0.02;
const TRAIL_PARTICLES_PER_SPAWN = 3;
const TRAIL_LIFETIME = 1.2;
const SPRING_STIFFNESS = 3.0;
const SPRING_DAMPING = 0.85;

// ── Mouse tracking ─────────────────────────────────────────────
document.addEventListener('mousemove', (e: MouseEvent) => {
  if (!whispEnabled) return;
  S.lastMouseMove = Date.now();
  if (!S.av) return;
  const r = S.av.getBoundingClientRect();
  S.tX = Math.max(-EYE_RANGE, Math.min(EYE_RANGE, (e.clientX - r.left - r.width / 2) * 0.15));
  S.tY = Math.max(-EYE_RANGE, Math.min(EYE_RANGE, (e.clientY - r.top - r.height / 2) * 0.15));
  if (S.sleeping) wakeUp();
});
window.addEventListener('resize', () => { S.boundsDirty = true; });

// ── Main API ──────────────────────────────────────────────────
export function initWhispChat(): void {
  if (!whispEnabled) return;
  if (S.av) return;
  computeHomeBounds();
  computeCircleCorner();
  createAvatar();
  addStyles();
  setupDrag();
  startRenderLoop();
  startModalDodge();
  gameBus.on<WhispMessagePayload>(GameEvents.WHISP_MESSAGE, (p) => {
    addOrQueue(p.speaker === 'kalgoth' ? 'kalgoth' : 'zelion', p.text);
    getZilionMemory().recordEvent('whisp_msg', p.text);
  });
  pickNewBehaviour();
  pickWanderTarget();
}

export function destroyWhispChat(): void {
  if (S.cleanupInterval) clearInterval(S.cleanupInterval);
  if (S.cleanupAnimFrame) cancelAnimationFrame(S.cleanupAnimFrame);
  if (S.av) { S.av.remove(); S.av = null; }
  if (S.bubble) { S.bubble.remove(); S.bubble = null; }
  if (S.chatM) { S.chatM.remove(); S.chatM = null; }
  if (S.trailParts) { S.trailParts.remove(); S.trailParts = null; }
  S.messageQueue = [];
}

export function showBubble(text: string, isKalgoth = false): void {
  if (!whispEnabled) return;
  addOrQueue(isKalgoth ? 'kalgoth' : 'zelion', text);
}

// ═══════════════ HOMING & BOUNDS ══════════════════════════════
function computeHomeBounds(): void {
  const centerPanel = document.querySelector('.center-stack');
  if (centerPanel) {
    const r = centerPanel.getBoundingClientRect();
    S.bounds = {
      left: r.left + 20,
      top: r.top + 20,
      right: r.right - 20,
      bottom: r.bottom - 20,
      width: r.width - 40,
      height: r.height - 40
    };
  } else {
    const w = window.innerWidth, h = window.innerHeight;
    S.bounds = {
      left: w * 0.3,
      top: h * 0.15,
      right: w * 0.7,
      bottom: h * 0.85,
      width: w * 0.4,
      height: h * 0.7
    };
  }
  S.boundsDirty = false;
}

function clampToBounds(left: number, top: number): [number, number] {
  return [
    Math.max(S.bounds.left, Math.min(S.bounds.right - AVATAR_SIZE, left)),
    Math.max(S.bounds.top, Math.min(S.bounds.bottom - AVATAR_SIZE, top))
  ];
}

function computeCircleCorner(): void {
  computeHomeBounds();
  S.defaultLeft = S.bounds.left + S.bounds.width / 2 - AVATAR_SIZE / 2;
  S.defaultTop  = S.bounds.top  + S.bounds.height/ 2 - AVATAR_SIZE / 2;
  [S.left, S.top] = clampToBounds(S.defaultLeft, S.defaultTop);
  S.targetLeft = S.left;
  S.targetTop = S.top;
}

// ═══════════════ AVATAR CREATION ══════════════════════════════
function createAvatar(): void {
  const av = document.createElement('div'); av.id = 'zelion-avatar';
  av.style.cssText = `position:fixed; left:${S.left}px; top:${S.top}px; width:${AVATAR_SIZE}px; height:${AVATAR_SIZE}px; z-index:100000; cursor:grab; user-select:none; touch-action:none; opacity:0; transition: none;`;
  S.av = av;

  const body = document.createElement('div'); body.className = 'zelion-body';
  Object.assign(body.style, {
    position:'absolute', width:'100%', height:'100%', borderRadius:'50%',
    background:'radial-gradient(circle at 35% 35%, #d4e8a0, #5a8a3a 60%, #2a4a1a)',
    boxShadow:'inset 0 -8px 16px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,255,255,0.15), 0 0 20px #8ac060, 0 0 45px #4a7a2a',
    transition: 'background 0.3s',
  });
  S.body = body; av.appendChild(body);

  const eye = document.createElement('div');
  Object.assign(eye.style, {
    position:'absolute', top:'21px', left:'24px', width:'24px', height:'24px',
    background:'radial-gradient(circle, #f8fff8, #d4f0a0 90%)', borderRadius:'50%', overflow:'hidden',
    boxShadow:'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 4px rgba(0,0,0,0.3)',
    transformOrigin: 'center', transition: 'transform 0.15s',
  });
  S.eye = eye;
  const pupil = document.createElement('div');
  Object.assign(pupil.style, {
    position:'absolute', top:'50%', left:'50%', width:'12px', height:'12px', margin:'-6px 0 0 -6px',
    background:'#1a3a0a', borderRadius:'50%'
  });
  S.pupil = pupil; eye.appendChild(pupil);
  const refl = document.createElement('div');
  Object.assign(refl.style, {
    position:'absolute', top:'50%', left:'50%', width:'4px', height:'4px', margin:'-8px 0 0 4px',
    background:'white', borderRadius:'50%', opacity:0.9
  });
  S.refl = refl; eye.appendChild(refl); av.appendChild(eye);

  const trailContainer = document.createElement('div'); trailContainer.className = 'zelion-trail';
  Object.assign(trailContainer.style, { position:'fixed', top:'0', left:'0', width:'100%', height:'100%', pointerEvents:'none', zIndex:'99999' });
  document.body.appendChild(trailContainer); S.trailParts = trailContainer;
  const parts = document.createElement('div'); parts.className = 'zelion-parts';
  Object.assign(parts.style, { position:'absolute', top:'0', left:'0', width:'100%', height:'100%', pointerEvents:'none' });
  av.appendChild(parts);

  document.body.appendChild(av);
  setInterval(spawnAmbientParticle, 800);

  setTimeout(() => {
    if (S.av) {
      S.av.style.opacity = '1';
      S.av.style.transition = 'width 1.2s ease-out, height 1.2s ease-out, opacity 0.8s';
      spawnEntranceSwirl();
      setTimeout(() => { animateToCircleCornerAndGreet(); }, 1200);
    }
  }, 400);
}

function animateToCircleCornerAndGreet(): void {
  if (!S.av) return;
  S.av.style.transition = 'left 0.8s ease-in-out, top 0.8s ease-in-out';
  S.left = S.defaultLeft; S.top = S.defaultTop;
  S.av.style.left = S.left + 'px'; S.av.style.top = S.top + 'px';
  S.targetLeft = S.left; S.targetTop = S.top;
  setTimeout(() => {
    showCenterBubble("I am Zilion, keeper of the Orbex shard in your skull. Ask me anything.");
    setTimeout(() => { if (S.av) S.av.style.transition = 'transform 0.1s ease-out'; }, 600);
  }, 900);
}

function pickWanderTarget(): void {
  S.wanderTargetX = (Math.random() - 0.5) * EYE_RANGE * 2;
  S.wanderTargetY = (Math.random() - 0.5) * EYE_RANGE * 2;
  setTimeout(pickWanderTarget, 1500 + Math.random() * 2500);
}

function pickNewBehaviour(): void {
  let nextDelay = 6000 + Math.random() * 8000;
  const rand = Math.random();
  if (rand < 0.15) { S.behaviour = 'figure8'; S.figure8Phase = 0; }
  else if (rand < 0.30) { S.behaviour = 'twirl'; S.twirlAngle = 0; }
  else if (rand < 0.55) {
    S.behaviour = 'drift';
    const [tx, ty] = clampToBounds(
      S.bounds.left + Math.random() * S.bounds.width,
      S.bounds.top  + Math.random() * S.bounds.height
    );
    S.targetLeft = tx; S.targetTop = ty;
    nextDelay = 5000 + Math.random() * 5000;
  }
  else if (rand < 0.70) { S.behaviour = 'shiver'; nextDelay = 2000 + Math.random() * 3000; }
  else {
    S.behaviour = 'idle';
    const [tx, ty] = clampToBounds(
      S.defaultLeft + (Math.random() - 0.5) * 80,
      S.defaultTop  + (Math.random() - 0.5) * 50
    );
    S.targetLeft = tx; S.targetTop = ty;
    nextDelay = 5000 + Math.random() * 6000;
  }
  S.behaviourTimer = window.setTimeout(pickNewBehaviour, nextDelay);
}

// ═══════════════ PHYSICS & ANIMATION ══════════════════════════
function updatePosition(dt: number): void {
  if (S.drag) return;
  if (S.boundsDirty) computeHomeBounds();

  let targetX = S.targetLeft, targetY = S.targetTop;

  if (S.behaviour === 'figure8') {
    S.figure8Phase += dt * 0.7;
    const cx = S.bounds.left + S.bounds.width / 2;
    const cy = S.bounds.top  + S.bounds.height/ 2;
    const a = Math.min(60, S.bounds.width / 4);
    const b = Math.min(40, S.bounds.height/ 4);
    targetX = cx + a * Math.sin(S.figure8Phase);
    targetY = cy + b * Math.sin(S.figure8Phase * 2);
  } else if (S.behaviour === 'twirl') {
    S.twirlAngle += dt * 1.8;
    if (S.body) S.body.style.transform = `rotate(${S.twirlAngle}rad)`;
    const cx = S.defaultLeft, cy = S.defaultTop;
    const radius = 40;
    targetX = cx + Math.cos(S.twirlAngle) * radius;
    targetY = cy + Math.sin(S.twirlAngle) * radius;
  } else if (S.behaviour === 'shiver') {
    targetX = S.defaultLeft + (Math.random() - 0.5) * 20;
    targetY = S.defaultTop  + (Math.random() - 0.5) * 20;
  }

  [targetX, targetY] = clampToBounds(targetX, targetY);

  const ax = (targetX - S.left) * SPRING_STIFFNESS;
  const ay = (targetY - S.top) * SPRING_STIFFNESS;
  S.velocityX = (S.velocityX + ax * dt) * SPRING_DAMPING;
  S.velocityY = (S.velocityY + ay * dt) * SPRING_DAMPING;
  S.left += S.velocityX * dt;
  S.top  += S.velocityY * dt;

  [S.left, S.top] = clampToBounds(S.left, S.top);
  if (S.av) { S.av.style.left = S.left + 'px'; S.av.style.top  = S.top  + 'px'; }

  // Dense, longer trail
  const dx = S.left - S.prevLeft, dy = S.top - S.prevTop;
  if (Math.sqrt(dx*dx + dy*dy) > 0.03) {
    const now = performance.now() / 1000;
    if (now - S.lastTrailTime > TRAIL_INTERVAL) {
      for (let i = 0; i < TRAIL_PARTICLES_PER_SPAWN; i++) {
        spawnTrailParticle(S.left + AVATAR_SIZE/2 + (Math.random()-0.5)*10,
                           S.top  + AVATAR_SIZE/2 + (Math.random()-0.5)*10, TRAIL_LIFETIME);
      }
      S.lastTrailTime = now;
    }
  }
  S.prevLeft = S.left; S.prevTop = S.top;
}

function spawnTrailParticle(x: number, y: number, life: number = TRAIL_LIFETIME): void {
  if (!S.trailParts) return;
  const p = document.createElement('div');
  const size = 4 + Math.random() * 6;
  const opacity = 0.8 + Math.random() * 0.2;
  Object.assign(p.style, {
    position:'fixed', left:(x-size/2)+'px', top:(y-size/2)+'px',
    width:size+'px', height:size+'px', borderRadius:'50%',
    background: Math.random() > 0.5 ? '#ffd700' : '#a0d07a',
    opacity: opacity.toString(), boxShadow:`0 0 ${6 + life * 4}px currentColor`,
    pointerEvents:'none',
    animation: `zelionTrailFade ${life}s ease-out forwards`
  });
  S.trailParts.appendChild(p);
  setTimeout(() => p.remove(), life * 1000 + 100);
}

function enterSleep(): void {
  if (S.sleeping) return;
  S.sleeping = true; S.emotion = 2;
  if (S.eye) S.eye.style.transform = `translate(${S.cX}px, ${S.cY}px) scaleY(0.05)`;
  S.sleepZElements = [];
  const spawnZ = () => {
    if (!S.sleeping || !S.av) return;
    const z = document.createElement('div'); z.textContent = 'Z';
    Object.assign(z.style, {
      position: 'fixed', left: (S.left + AVATAR_SIZE/2 - 10) + 'px', top: (S.top - 20) + 'px',
      color: '#c0e0a0', fontSize: '28px', fontFamily: '"Courier New", monospace',
      pointerEvents: 'none', textShadow: '0 0 8px #7ea04b',
      animation: 'zelionZFloat 2.5s ease-out forwards', opacity: '0.9',
    });
    document.body.appendChild(z); S.sleepZElements.push(z); setTimeout(() => z.remove(), 2500);
  };
  S.sleepTimer = window.setInterval(spawnZ, 1200);
}

function wakeUp(): void {
  if (!S.sleeping) return;
  S.sleeping = false; S.emotion = 3;
  clearInterval(S.sleepTimer);
  S.sleepZElements.forEach(z => z.remove()); S.sleepZElements = [];
  S.wakingUp = true; S.wakeStart = performance.now();
  for (let i = 0; i < 15; i++) spawnTrailParticle(S.left + AVATAR_SIZE/2, S.top + AVATAR_SIZE/2, 0.3);
  if (S.eye) S.eye.style.transform = `translate(${S.cX}px, ${S.cY}px) scale(1.3)`;
  clearTimeout(S.behaviourTimer); pickNewBehaviour();
}

// ═══════════════ DRAG, CHAT, MODAL DODGE ══════════════════════
function setupDrag(): void {
  const av = S.av; if (!av) return;
  const moveHandler = (e: MouseEvent) => {
    if (!S.drag) return;
    S.left = S.startLeft + e.clientX - S.startX;
    S.top  = S.startTop  + e.clientY - S.startY;
    [S.left, S.top] = clampToBounds(S.left, S.top);
    av.style.left = S.left+'px'; av.style.top = S.top+'px';
    S.targetLeft = S.left; S.targetTop = S.top;
    if (S.chatM) posChatModal();
  };
  const upHandler = (e: MouseEvent) => {
    if (!S.drag) return;
    S.drag = false; av.style.cursor = 'grab';
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
    const dx = e.clientX - S.startX, dy = e.clientY - S.startY;
    if (Math.sqrt(dx*dx+dy*dy) < 3) {
      const now = Date.now();
      if (now - S.lastClick < 350) { S.lastClick = 0; toggleChat(); }
      else { S.lastClick = now; }
    }
  };
  av.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return; e.preventDefault();
    S.startX = e.clientX; S.startY = e.clientY;
    S.startLeft = S.left; S.startTop = S.top;
    S.drag = true; av.style.cursor = 'grabbing';
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  });
}

function toggleChat(): void { S.chatM ? closeChat() : openChat(); }

function openChat(): void {
  if (S.chatM) return;
  const md = document.createElement('div');
  Object.assign(md.style, { position:'fixed', width:'340px', maxHeight:'450px', background:'rgba(5,2,8,0.95)', border:'2px solid #7ea04b', borderRadius:'20px 20px 20px 4px', boxShadow:'0 0 25px rgba(126,160,75,0.5)', display:'flex', flexDirection:'column', zIndex:'2147483647', fontFamily:'"Courier New",monospace', color:'#e0d8cc' });
  md.innerHTML = `<div style="padding:8px 16px;border-bottom:1px solid #5a4a3a;display:flex;justify-content:space-between;"><span style="color:#a0d07a;">🌀 Zilion</span><span style="color:#8a7a6a;font-size:0.7rem;">Esc to close</span></div><div id="zelionChatMsgs" style="flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;max-height:300px;"></div><div style="display:flex;border-top:1px solid #5a4a3a;"><input id="zelionChatInp" type="text" placeholder="Ask Zilion..." style="flex:1;background:transparent;border:none;padding:10px;color:#e0d8cc;font-family:inherit;outline:none;"></div>`;
  document.body.appendChild(md);
  S.chatM = md; S.chatMsgs = document.getElementById('zelionChatMsgs') as HTMLElement;
  S.chatInp = document.getElementById('zelionChatInp') as HTMLInputElement;
  S.messageQueue.forEach(m => addChatMsg(m.sender, m.text)); S.messageQueue = [];
  S.chatInp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && S.chatInp?.value.trim()) {
      const txt = S.chatInp.value.trim(); S.chatInp.value = '';
      addChatMsg('player', txt); handleChatSend(txt);
    }
    if (e.key === 'Escape') closeChat();
  });
  posChatModal(); S.chatInp.focus();
  document.addEventListener('keydown', escClose);
}

function closeChat(): void { if (S.chatM) { S.chatM.remove(); S.chatM = null; S.chatInp = null; S.chatMsgs = null; } document.removeEventListener('keydown', escClose); }
function escClose(e: KeyboardEvent): void { if (e.key === 'Escape') closeChat(); }

function posChatModal(): void {
  if (!S.chatM || !S.av) return;
  const r = S.av.getBoundingClientRect();
  S.chatM.style.left = Math.min(r.left + r.width + 10, innerWidth - 360) + 'px';
  S.chatM.style.top  = Math.max(10, r.top) + 'px';
}

function addChatMsg(sender: string, text: string): void {
  if (!S.chatMsgs) return;
  const isPlayer = sender==='player', isKalgoth = sender==='kalgoth';
  const d = document.createElement('div');
  Object.assign(d.style, {
    alignSelf: isKalgoth?'center':(isPlayer?'flex-end':'flex-start'), maxWidth:'80%', padding:'6px 10px',
    borderRadius: isPlayer?'10px 10px 2px 10px':(isKalgoth?'0':'10px 10px 10px 2px'),
    background: isKalgoth?'#4a1a1a':(isPlayer?'#2a1a0a':'#1a2a0a'),
    border:`1px solid ${isKalgoth?'#ff4444':(isPlayer?'#8a7a5a':'#5a7a3a')}`,
    fontSize:'0.8rem', fontStyle: isPlayer?'normal':'italic',
    fontWeight: isKalgoth?'bold':'normal', textShadow: isKalgoth?'0 0 5px red':'none',
  });
  d.textContent = `${isKalgoth?'KALGOTH':(isPlayer?'You':'Zilion')}: ${text}`;
  S.chatMsgs.appendChild(d); S.chatMsgs.scrollTop = S.chatMsgs.scrollHeight;
}

async function handleChatSend(userText: string): Promise<void> {
  const corr = corruptionLevel.value;
  if (corr > 50 && Math.random() < (corr-30)/70) { addChatMsg('kalgoth', "I hear your thoughts."); return; }
  if (corr > 80 && Math.random() < 0.2) { addChatMsg('zelion', "Kalgoth's shadow..."); return; }
  try {
    const mem = getZilionMemory(); const personalityPrompt = mem.getPersonalityPrompt();
    const gameState = buildGameStateSummary();
    const fullPrompt = `${personalityPrompt}\n\n${gameState}\n\nPlayer message: ${userText}`;
    const reply = await askOllama([{role:'user',content:fullPrompt}]);
    addChatMsg('zelion', reply);
  } catch { addChatMsg('zelion', "*static*"); }
}

function buildGameStateSummary(): string {
  const parts: string[] = [];
  parts.push(`[CURRENT GAME STATE]`);
  parts.push(`Health: ${health.value}/${100}, Will: ${will.value}/${maxWill.value}`);
  parts.push(`Kalgoth's Noose: ${kalgothsNoose.value}%`);
  parts.push(`Orbex Fragments: ${orbexFragments.value}/${maxOrbexFragments.value}, Corruption: ${corruptionLevel.value}%`);
  parts.push(`Circle Power: ${circlePower.value}%, Mastery: ${circleMastery.value}`);
  parts.push(`Gaze Intensity: ${gazeIntensity.value}, Gaze Active: ${isGazeActive.value}, Day Timer: ${Math.floor(timerSeconds.value/60)}m ${timerSeconds.value%60}s`);
  parts.push(`Phase: ${currentPhase.value.status}`);
  parts.push(`Resources: Moss=${ingredients.value.nightshadeMoss}, Phlegm=${ingredients.value.cryptPhlegm}, Salts=${ingredients.value.bansheeSalts}, Ichor=${ingredients.value.demonIchor}`);
  parts.push(`Crafted: Powder=${crafted.value.powderOfWarding}, Phial=${crafted.value.phialOfSubjugation}, Draught=${crafted.value.restorativeDraught}`);
  return parts.join('\n');
}

function startModalDodge(): void {
  setInterval(() => {
    const modals = document.querySelectorAll('.modal');
    let any = false;
    modals.forEach(m => { const s = (m as HTMLElement).style.display; if (s!=='none'&&s!=='') any = true; });
    if (any && !S.modalOpen) {
      S.dodgeLeft = S.left; S.dodgeTop = S.top;
      S.left = 20; S.top = 20;
      if (S.av) { S.av.style.left='20px'; S.av.style.top='20px'; }
      S.modalOpen = true;
    } else if (!any && S.modalOpen) {
      S.left = S.dodgeLeft; S.top = S.dodgeTop;
      if (S.av) { S.av.style.left = `${S.left}px`; S.av.style.top = `${S.top}px`; }
      S.modalOpen = false;
    }
  }, 500);
}

function addStyles(): void {
  if (document.getElementById('zelion-final-styles')) return;
  const s = document.createElement('style'); s.id = 'zelion-final-styles';
  s.textContent = `
    @keyframes zelionParticle { 0% { transform:translate(0,0) scale(0); opacity:1; } 100% { transform:translate(var(--tx),var(--ty)) scale(1.2); opacity:0; } }
    @keyframes zelionTrailFade { 0% { opacity:1; transform:scale(1); } 100% { opacity:0; transform:scale(0.1); } }
    @keyframes bubbleFadeIn { from { opacity:0; transform:translate(-50%,-70%); } to { opacity:1; transform:translate(-50%,-100%); } }
    @keyframes zelionZFloat { 0% { opacity:1; transform:translate(0,0); } 100% { opacity:0; transform:translate(-10px,-40px); } }
  `;
  document.head.appendChild(s);
}

function showCenterBubble(text: string): void {
  if (S.bubble) S.bubble.remove();
  S.bubble = document.createElement('div');
  const rect = S.av?.getBoundingClientRect();
  const left = rect ? rect.left + rect.width/2 : innerWidth/2;
  const top  = rect ? rect.top - 30 : innerHeight/2;
  S.bubble.style.cssText = `position:fixed; left:${left}px; top:${top}px; transform:translate(-50%,-100%); max-width:340px; padding:10px 16px; border-radius:12px 12px 12px 4px; background:rgba(5,2,8,0.95); color:#e0d8cc; border:2px solid #7ea04b; font-family:"Courier New",monospace; font-size:0.9rem; font-style:italic; pointer-events:none; z-index:100001; animation:bubbleFadeIn 0.3s ease-out;`;
  S.bubble.textContent = text;
  document.body.appendChild(S.bubble);
  setTimeout(() => { if (S.bubble) { S.bubble.remove(); S.bubble = null; } }, 6000);
}

function spawnEntranceSwirl(): void {
  const c = S.av?.querySelector('.zelion-parts') as HTMLElement;
  if (!c) return;
  const now = performance.now();
  const spawn = () => {
    const elapsed = performance.now() - now;
    if (elapsed > 1500 || !S.av) return;
    const angle = (elapsed / 1500) * Math.PI * 4;
    const dist = 40 + elapsed / 40;
    const centerX = S.left + 37, centerY = S.top + 37;
    spawnTrailParticle(centerX + Math.cos(angle) * dist, centerY + Math.sin(angle) * dist, 0.5);
    requestAnimationFrame(spawn);
  };
  requestAnimationFrame(spawn);
}

function spawnAmbientParticle(): void {
  const c = S.av?.querySelector('.zelion-parts') as HTMLElement;
  if (!c) return;
  const p = document.createElement('div');
  const a = Math.random()*Math.PI*2, d = 25+Math.random()*30;
  Object.assign(p.style, { position:'absolute', top:'50%', left:'50%', width:'6px', height:'6px', borderRadius:'50%', background:Math.random()>0.7?'#ffd700':'#a0d07a', boxShadow:'0 0 6px currentColor', animation:`zelionParticle ${1.5+Math.random()*2}s linear forwards` });
  p.style.setProperty('--tx',`${Math.cos(a)*d}px`); p.style.setProperty('--ty',`${Math.sin(a)*d}px`);
  c.appendChild(p); setTimeout(()=>p.remove(),3000);
}

function addOrQueue(sender: string, text: string): void {
  if (S.chatM) { addChatMsg(sender, text); } else { S.messageQueue.push({ sender, text }); }
}

// ═══════════════ RENDER LOOP ══════════════════════════════════
function startRenderLoop(): void {
  let lastTime = performance.now();
  const loop = (now: number) => {
    if (!whispEnabled) {
      S.cleanupAnimFrame = requestAnimationFrame(loop);
      return;
    }
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    const useCursor = (Date.now() - S.lastMouseMove) < 2000;
    const targetEyeX = useCursor ? S.tX : S.wanderTargetX;
    const targetEyeY = useCursor ? S.tY : S.wanderTargetY;
    S.cX += (targetEyeX - S.cX) * 0.15;
    S.cY += (targetEyeY - S.cY) * 0.15;

    if (now > S.nextBlink) {
      S.nextBlink = now + 2500 + Math.random() * 3000;
      S.blinkTarget = 0.05;
      setTimeout(() => { S.blinkTarget = 1; }, 120);
      if (Math.random() < 0.3) {
        setTimeout(() => { S.blinkTarget = 0.05; setTimeout(() => { S.blinkTarget = 1; }, 80); }, 200);
      }
    }
    S.blinkState += (S.blinkTarget - S.blinkState) * 0.5;
    S.breathPhase += 0.02;

    if (S.glowDecay > 0) {
      S.glowTarget += (1 - S.glowTarget) * 0.05;
      S.glowDecay -= 16;
    } else S.glowTarget = 1;
    S.glowIntensity += (S.glowTarget - S.glowIntensity) * 0.1;

    if (!S.drag && !S.sleeping) {
      S.body.style.transform = `translate(${Math.sin(S.breathPhase * 1.3) * 1.5}px, ${Math.cos(S.breathPhase * 1.7) * 1.2}px) scale(${1 + Math.sin(S.breathPhase) * 0.005})`;
    } else if (S.sleeping) {
      S.body.style.transform = 'scale(0.94)';
    }

    const emoColors: Record<number, [string, string]> = {
      0: ['#d4e8a0', '#5a8a3a'], 1: ['#ffd6a5', '#ff8c37'], 2: ['#c0e0a0', '#4a7a2a'], 3: ['#ffffff', '#a0d07a'],
    };
    const [c1, c2] = emoColors[S.emotion] || emoColors[0];
    if (S.body) {
      S.body.style.background = `radial-gradient(circle at 35% 35%, ${c1}, ${c2})`;
      const gs = 18 + S.glowIntensity * 20;
      const go = 0.2 + S.glowIntensity * 0.3;
      S.body.style.boxShadow = `inset 0 -8px 16px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,255,255,0.15), 0 0 ${gs}px rgba(160,208,122,${go}), 0 0 ${gs * 2}px rgba(74,122,42,${go * 0.6})`;
    }

    if (S.wakingUp) {
      const elapsed = now - S.wakeStart;
      if (elapsed < 200) {
        S.av.style.transform = `translate(${Math.sin(elapsed * 0.1) * 5}px, ${Math.cos(elapsed * 0.08) * 4}px)`;
      } else if (elapsed < 500) {
        S.av.style.transform = '';
        if (S.eye) S.eye.style.transform = `translate(${S.cX}px, ${S.cY}px) scaleY(${S.blinkState})`;
        S.emotion = 0;
        S.wakingUp = false;
      }
    }

    if (!S.drag && !S.sleeping) {
      updatePosition(dt);
    } else if (S.sleeping) {
      updatePosition(dt);
    }

    if (!S.wakingUp && !S.sleeping) {
      if (S.eye) S.eye.style.transform = `translate(${S.cX}px, ${S.cY}px) scaleY(${S.blinkState})`;
    } else if (S.sleeping) {
      if (S.eye) S.eye.style.transform = `translate(${S.cX}px, ${S.cY}px) scaleY(0.05)`;
    }
    if (S.refl) S.refl.style.transform = `translate(${S.cX * 0.3}px, ${S.cY * 0.3}px)`;

    if (Date.now() - S.lastMouseMove > 45000 && !S.sleeping) {
      enterSleep();
    } else if (S.sleeping && Date.now() - S.lastMouseMove < 45000) {
      wakeUp();
    }

    S.cleanupAnimFrame = requestAnimationFrame(loop);
  };
  S.cleanupAnimFrame = requestAnimationFrame(loop);
}