// js/ui/whisp-chat.ts – Zilion: robust trail, thick base, smooth taper, dense idle particles

import { el } from '../core/dom-helper.js';
import { askOllama } from '../ai/ai-engine.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents, type WhispMessagePayload } from '../core/events.js';
import { corruptionLevel } from '../core/state-signals.js';
import { getZilionMemory } from '../ai/zelionMemory.js';

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
  drag: false, startX: 0, startY: 0, startLeft: 0, startTop: 0,

  tX: 0, tY: 0, cX: 0, cY: 0,
  idleTimer: 0, idleTargetX: 0, idleTargetY: 0, lastMouseMove: 0,

  blinkState: 1, blinkTarget: 1, nextBlink: 0,
  breathPhase: 0,
  glowIntensity: 1, glowTarget: 1, glowDecay: 0,
  emotion: 0,
  sleeping: false,
  lastClick: 0,
  modalOpen: false, dodgeLeft: 0, dodgeTop: 0,
  messageQueue: [] as { sender: string; text: string }[],
  trailParts: null as HTMLElement | null,
};

const EYERANGE = 10;
const idlePositions = [{ x: -8, y: 0 }, { x: 8, y: 0 }, { x: 0, y: -5 }, { x: 0, y: 5 }, { x: 6, y: 3 }, { x: -6, y: -3 }];
let idleIdx = 0;
function pickIdleTarget(): void {
  const pos = idlePositions[idleIdx % idlePositions.length];
  S.idleTargetX = pos.x;
  S.idleTargetY = pos.y;
  idleIdx++;
}

document.addEventListener('mousemove', (e: MouseEvent) => {
  S.lastMouseMove = Date.now();
  if (!S.av) return;
  const r = S.av.getBoundingClientRect();
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  S.tX = Math.max(-EYERANGE, Math.min(EYERANGE, (e.clientX - cx)*0.15));
  S.tY = Math.max(-EYERANGE, Math.min(EYERANGE, (e.clientY - cy)*0.15));
});

export function initWhispChat(): void {
  if (S.av) return;
  createAvatar();
  addStyles();
  setupDrag();
  startRenderLoop();
  startIdleWander();
  startModalDodge();

  gameBus.on<WhispMessagePayload>(GameEvents.WHISP_MESSAGE, (p) => {
    addOrQueue(p.speaker === 'kalgoth' ? 'kalgoth' : 'zelion', p.text);
    getZilionMemory().recordEvent('whisp_msg', p.text);
  });

  setTimeout(() => addOrQueue('zelion', "The Orbex sings its song. I am Zilion, a shard in your skull."), 2000);
}

function addOrQueue(sender: string, text: string): void {
  if (S.chatM) { addChatMsg(sender, text); }
  else { S.messageQueue.push({ sender, text }); }
}

// ========== AVATAR ==========
function createAvatar(): void {
  S.left = window.innerWidth - 110;
  S.top = window.innerHeight - 140;
  const av = document.createElement('div');
  av.id = 'zelion-avatar';
  Object.assign(av.style, {
    position: 'fixed',
    left: S.left + 'px',
    top: S.top + 'px',
    width: '75px', height: '75px',
    zIndex: '100000',
    cursor: 'grab', userSelect: 'none', touchAction: 'none',
    filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
  });
  S.av = av;

  const body = document.createElement('div');
  body.className = 'zelion-body';
  Object.assign(body.style, {
    position: 'absolute', width: '100%', height: '100%',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #d4e8a0, #5a8a3a 60%, #2a4a1a)',
    boxShadow: 'inset 0 -8px 16px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,255,255,0.15), 0 0 20px #8ac060, 0 0 45px #4a7a2a',
    transition: 'transform 0.1s ease-out',
  });
  S.body = body;
  av.appendChild(body);

  const eye = document.createElement('div');
  Object.assign(eye.style, {
    position: 'absolute', top: '21px', left: '24px',
    width: '24px', height: '24px',
    background: 'radial-gradient(circle, #f8fff8, #d4f0a0 90%)',
    borderRadius: '50%', overflow: 'hidden',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 4px rgba(0,0,0,0.3)',
  });
  S.eye = eye;
  const pupil = document.createElement('div');
  Object.assign(pupil.style, {
    position: 'absolute', top: '50%', left: '50%',
    width: '12px', height: '12px', margin: '-6px 0 0 -6px',
    background: '#1a3a0a', borderRadius: '50%',
  });
  S.pupil = pupil; eye.appendChild(pupil);
  const refl = document.createElement('div');
  Object.assign(refl.style, {
    position: 'absolute', top: '50%', left: '50%',
    width: '4px', height: '4px', margin: '-8px 0 0 4px',
    background: 'white', borderRadius: '50%', opacity: 0.9,
  });
  S.refl = refl; eye.appendChild(refl);
  av.appendChild(eye);

  // Trail particle container
  const trailContainer = document.createElement('div');
  trailContainer.className = 'zelion-trail';
  Object.assign(trailContainer.style, {
    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '99999',
  });
  document.body.appendChild(trailContainer);
  S.trailParts = trailContainer;

  // Ambient particle container
  const parts = document.createElement('div');
  parts.className = 'zelion-parts';
  Object.assign(parts.style, {
    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none',
  });
  av.appendChild(parts);

  document.body.appendChild(av);
  // More frequent ambient particles (every 400ms, burst of 2-3)
  setInterval(() => {
    for (let i = 0; i < (2 + Math.floor(Math.random() * 2)); i++) {
      setTimeout(() => spawnAmbientParticle(), i * 50);
    }
  }, 400);
}

// ========== DRAG (robust trail) ==========
function setupDrag(): void {
  const av = S.av; if (!av) return;

  const moveHandler = (e: MouseEvent) => {
    if (!S.drag) return;
    const newLeft = S.startLeft + e.clientX - S.startX;
    const newTop = S.startTop + e.clientY - S.startY;
    const dx = newLeft - S.left;
    const dy = newTop - S.top;
    const dist = Math.sqrt(dx*dx + dy*dy);
    // Spawn trail particles every 2px for a dense, robust trail
    if (dist > 2) {
      const steps = Math.floor(dist / 2);
      const stepX = dx / steps, stepY = dy / steps;
      for (let i = 1; i <= steps; i++) {
        const tx = S.left + i * stepX + 37;
        const ty = S.top + i * stepY + 37;
        const life = i / steps; // 0 at base (newest), 1 at tail (oldest)
        spawnTrailParticle(tx, ty, life);
      }
    }
    S.left = newLeft;
    S.top = newTop;
    av.style.left = S.left + 'px';
    av.style.top = S.top + 'px';
    if (S.chatM) posChatModal();
  };

  const upHandler = (e: MouseEvent) => {
    if (!S.drag) return;
    S.drag = false;
    av.style.cursor = 'grab';
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
    S.left = Math.max(0, Math.min(window.innerWidth - 75, S.left));
    S.top = Math.max(0, Math.min(window.innerHeight - 75, S.top));
    av.style.left = S.left + 'px';
    av.style.top = S.top + 'px';
    const dx = e.clientX - S.startX, dy = e.clientY - S.startY;
    if (Math.sqrt(dx*dx + dy*dy) < 3) {
      const now = Date.now();
      if (now - S.lastClick < 350) {
        S.lastClick = 0;
        toggleChat();
      } else {
        S.lastClick = now;
      }
    }
  };

  av.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    S.startX = e.clientX; S.startY = e.clientY;
    S.startLeft = S.left; S.startTop = S.top;
    S.drag = true;
    av.style.cursor = 'grabbing';
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  });
}

// ========== TRAIL PARTICLES (robust, thick base, taper) ==========
function spawnTrailParticle(x: number, y: number, life: number = 0): void {
  if (!S.trailParts) return;
  const p = document.createElement('div');
  // Thick at base (14px), thin at tail (3px)
  const size = 14 - life * 11;
  const opacity = 0.9 - life * 0.6; // 0.9 at base, 0.3 at tail
  const hue = life > 0.5 ? '#ffd700' : (Math.random() > 0.5 ? '#ffd700' : '#a0d07a');
  Object.assign(p.style, {
    position: 'fixed',
    left: (x - size/2) + 'px',
    top: (y - size/2) + 'px',
    width: size + 'px',
    height: size + 'px',
    borderRadius: '50%',
    background: hue,
    opacity: opacity.toString(),
    boxShadow: `0 0 ${4 + life * 4}px ${hue}`,
    animation: 'zelionTrailFade 0.6s ease-out forwards',
    pointerEvents: 'none',
  });
  S.trailParts.appendChild(p);
  setTimeout(() => p.remove(), 600);
}

// ========== IDLE SHIFT (subtle movement) ==========
let shiftPhase = 0;
function applyIdleShift(): void {
  if (!S.body || S.drag || S.sleeping) return;
  shiftPhase += 0.015;
  const sx = Math.sin(shiftPhase * 1.3) * 1.5;
  const sy = Math.cos(shiftPhase * 1.7) * 1.2;
  const scale = 1 + Math.sin(shiftPhase) * 0.005;
  S.body.style.transform = `translate(${sx}px, ${sy}px) scale(${scale})`;
}

// ========== IDLE WANDER / RENDER / PARTICLES ==========
function startIdleWander(): void {
  const loop = () => {
    if (Date.now() - S.lastMouseMove > 1500) { pickIdleTarget(); S.tX = S.idleTargetX; S.tY = S.idleTargetY; }
    S.idleTimer = window.setTimeout(loop, 1200 + Math.random()*600);
  };
  S.idleTimer = window.setTimeout(loop, 1500);
}

let rafId = 0;
function startRenderLoop(): void {
  const loop = () => {
    const now = Date.now();
    S.cX += (S.tX - S.cX)*0.2; S.cY += (S.tY - S.cY)*0.2;
    if (now > S.nextBlink) {
      S.nextBlink = now + 2500 + Math.random()*3000;
      S.blinkTarget = 0.05;
      setTimeout(() => { S.blinkTarget = 1; }, 120);
      if (Math.random() < 0.3) setTimeout(() => { S.blinkTarget = 0.05; setTimeout(() => { S.blinkTarget = 1; }, 80); }, 200);
    }
    S.blinkState += (S.blinkTarget - S.blinkState)*0.5;
    S.breathPhase += 0.02;
    if (S.glowDecay > 0) { S.glowTarget += (1 - S.glowTarget)*0.05; S.glowDecay -= 16; } else S.glowTarget = 1;
    S.glowIntensity += (S.glowTarget - S.glowIntensity)*0.1;
    const emo = [ ['#d4e8a0','#5a8a3a'], ['#ffd6a5','#ff8c37'], ['#c0e0a0','#4a7a2a'] ];
    const [c1,c2] = emo[S.emotion];
    if (now - S.lastMouseMove > 30000 && !S.sleeping) { S.sleeping = true; S.blinkTarget = 0.35; }
    else if (now - S.lastMouseMove < 30000 && S.sleeping) { S.sleeping = false; S.blinkTarget = 1; }
    if (S.body) {
      const breathScale = 1 + Math.sin(S.breathPhase)*0.01;
      S.body.style.background = `radial-gradient(circle at 35% 35%, ${c1}, ${c2})`;
      const gs = 18 + S.glowIntensity*20, go = 0.2 + S.glowIntensity*0.3;
      S.body.style.boxShadow = `inset 0 -8px 16px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,255,255,0.15), 0 0 ${gs}px rgba(160,208,122,${go}), 0 0 ${gs*2}px rgba(74,122,42,${go*0.6})`;
    }
    applyIdleShift();
    if (S.eye) S.eye.style.transform = `translate(${S.cX}px, ${S.cY}px) scaleY(${S.blinkState})`;
    if (S.refl) S.refl.style.transform = `translate(${S.cX*0.3}px, ${S.cY*0.3}px)`;
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

function spawnAmbientParticle(): void {
  const c = S.av?.querySelector('.zelion-parts') as HTMLElement;
  if (!c) return;
  const p = document.createElement('div');
  const a = Math.random()*Math.PI*2, d=25+Math.random()*35;
  Object.assign(p.style, {
    position:'absolute', top:'50%', left:'50%',
    width:'4px', height:'4px',
    borderRadius:'50%',
    background:Math.random()>0.7?'#ffd700':'#a0d07a',
    boxShadow: '0 0 4px currentColor',
    animation:`zelionParticle ${1.5+Math.random()*2}s linear forwards`,
  });
  p.style.setProperty('--tx',`${Math.cos(a)*d}px`);
  p.style.setProperty('--ty',`${Math.sin(a)*d}px`);
  c.appendChild(p); setTimeout(()=>p.remove(),3000);
}

// ========== CHAT MODAL ==========
function toggleChat(): void { S.chatM ? closeChat() : openChat(); }

function openChat(): void {
  if (S.chatM) return;
  const md = document.createElement('div');
  Object.assign(md.style, {
    position:'fixed', width:'340px', maxHeight:'450px',
    background:'rgba(5,2,8,0.95)', border:'2px solid #7ea04b',
    borderRadius:'20px 20px 20px 4px', boxShadow:'0 0 25px rgba(126,160,75,0.5)',
    display:'flex', flexDirection:'column', zIndex:'2147483647',
    fontFamily:'"Courier New",monospace', color:'#e0d8cc',
  });
  md.innerHTML = '<div style="padding:8px 16px;border-bottom:1px solid #5a4a3a;display:flex;justify-content:space-between;"><span style="color:#a0d07a;">🌀 Zilion</span><span style="color:#8a7a6a;font-size:0.7rem;">Esc to close</span></div>'
    + '<div id="zelionChatMsgs" style="flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;max-height:300px;"></div>'
    + '<div style="display:flex;border-top:1px solid #5a4a3a;"><input id="zelionChatInp" type="text" placeholder="Ask Zilion..." style="flex:1;background:transparent;border:none;padding:10px;color:#e0d8cc;font-family:inherit;outline:none;"></div>';
  document.body.appendChild(md);
  S.chatM = md;
  S.chatMsgs = document.getElementById('zelionChatMsgs') as HTMLElement;
  S.chatInp = document.getElementById('zelionChatInp') as HTMLInputElement;
  S.messageQueue.forEach(m => addChatMsg(m.sender, m.text));
  S.messageQueue = [];
  S.chatInp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && S.chatInp?.value.trim()) {
      const txt = S.chatInp.value.trim(); S.chatInp.value = '';
      addChatMsg('player', txt);
      handleChatSend(txt);
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
  S.chatM.style.top = Math.max(10, r.top) + 'px';
}
function addChatMsg(sender: string, text: string): void {
  if (!S.chatMsgs) return;
  const isPlayer = sender === 'player', isKalgoth = sender === 'kalgoth';
  const d = document.createElement('div');
  Object.assign(d.style, {
    alignSelf: isKalgoth ? 'center' : (isPlayer ? 'flex-end' : 'flex-start'),
    maxWidth:'80%', padding:'6px 10px',
    borderRadius: isPlayer ? '10px 10px 2px 10px' : (isKalgoth ? '0' : '10px 10px 10px 2px'),
    background: isKalgoth ? '#4a1a1a' : (isPlayer ? '#2a1a0a' : '#1a2a0a'),
    border:`1px solid ${isKalgoth?'#ff4444':(isPlayer?'#8a7a5a':'#5a7a3a')}`,
    fontSize:'0.8rem', fontStyle: isPlayer?'normal':'italic',
    fontWeight: isKalgoth?'bold':'normal', textShadow: isKalgoth?'0 0 5px red':'none',
  });
  d.textContent = `${isKalgoth?'KALGOTH':(isPlayer?'You':'Zilion')}: ${text}`;
  S.chatMsgs.appendChild(d); S.chatMsgs.scrollTop = S.chatMsgs.scrollHeight;
}

async function handleChatSend(userText: string): Promise<void> {
  const corr = corruptionLevel.value;
  if (corr > 50 && Math.random() < (corr - 30)/70) { addChatMsg('kalgoth', "I hear your thoughts."); return; }
  if (corr > 80 && Math.random() < 0.2) { addChatMsg('zelion', "Kalgoth's shadow..."); return; }
  try {
    const mem = getZilionMemory(); const prompt = mem.getPersonalityPrompt();
    const reply = await askOllama([{ role:'user', content:`${prompt}\n\nUser message: ${userText}` }]);
    addChatMsg('zelion', reply);
  } catch (error) { 
    console.warn('Zelion chat generation failed:', error);
    addChatMsg('zelion', "*static*"); 
  }
}

export function showBubble(text: string, isKalgoth: boolean = false): void { addOrQueue(isKalgoth ? 'kalgoth' : 'zelion', text); }

// ========== MODAL DODGE ==========
function startModalDodge(): void {
  setInterval(() => {
    const modals = document.querySelectorAll('.modal');
    let any = false;
    modals.forEach(m => { const s = (m as HTMLElement).style.display; if (s !== 'none' && s !== '') any = true; });
    if (any && !S.modalOpen) {
      S.dodgeLeft = S.left; S.dodgeTop = S.top;
      S.left = 20; S.top = 20;
      if (S.av) { S.av.style.left = '20px'; S.av.style.top = '20px'; }
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
  const s = document.createElement('style');
  s.id = 'zelion-final-styles';
  s.textContent = `
    @keyframes zelionParticle { 0% { transform: translate(0,0) scale(0); opacity:1; } 100% { transform: translate(var(--tx),var(--ty)) scale(1.5); opacity:0; } }
    @keyframes zelionTrailFade { 0% { opacity:0.9; transform: scale(1); } 100% { opacity:0; transform: scale(0.1); } }
  `;
  document.head.appendChild(s);
}
