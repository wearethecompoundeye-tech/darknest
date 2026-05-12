// js/minigames/circle-trace.ts – Bulletproof Circle Tracing
// No DPI scaling, no coordinate mismatch, no sibling interference.

import {
  circleQuality, circleIntegrity, circlePower, runeSlots, tutorial,
} from '../core/state-signals.js';
import { addLog } from '../ui/log-manager.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import { narrateEvent } from '../ai/ai-engine.js';
import { el } from '../core/dom-helper.js';
import { updateRuneSlots } from '../ui/ui-renderer.js';
import { getGuidanceHitZoneMultiplier } from '../systems/familiar-manager.js';

// ── Fixed canvas size ──────────────────────────────────────────
const SIZE = 440;
const CX = SIZE / 2;          // 220
const CY = SIZE / 2;          // 220
const RADIUS = 150;
const TRACE_WIDTH = 8;

const RUNES = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ'];
const SMOOTH_WINDOW = 5;

// ── State ──────────────────────────────────────────────────────
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let active = false;
let traced = false;
let dragging = false;

let progress = 0;
let quality = 0;
let lastAngle: number | null = null;
let cursorPos: { x: number; y: number } | null = null;
let angleHistory: number[] = [];

interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; }
let particles: Particle[] = [];
interface TrailPoint { x: number; y: number; quality: number; }
let trail: TrailPoint[] = [];

let animFrame: number | null = null;
let idleFrame: number | null = null;
let runePhase = 0;

// ── Public API ─────────────────────────────────────────────────
export function initCircleTracing(): void {
  canvas = el('circleCanvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  // Force exact size, ignoring any CSS that may try to scale
  canvas.style.width  = SIZE + 'px';
  canvas.style.height = SIZE + 'px';
  canvas.width  = SIZE;
  canvas.height = SIZE;

  ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);  // identity matrix, no device‑pixel scaling

  // Events
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('mouseleave', onPointerUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  const btn = el('traceCircleBtn');
  if (btn) {
    btn.onclick = () => {
      if (traced) { resetTrace(); }
      else { startTrace(); }
    };
  }

  drawIdle();
  startIdleLoop();
}

export function resetCircleAfterSummon(): void {
  runeSlots.value = ['', '', ''];
  circleIntegrity.value = Math.max(0, circleIntegrity.value - 15);
  circlePower.value = Math.max(0, circlePower.value - 15);
  traced = false;
  circleQuality.value = 0;
  stopLoop('circleTraceLoop');
  stopLoop('runeTetherAmbient');
  resetTrace();
  drawIdle();
}

// ── Lock siblings while tracing ─────────────────────────────────
function setCanvasOnly(enabled: boolean): void {
  const circle = document.getElementById('ritualCircle');
  if (!circle) return;
  const children = circle.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement;
    if (child === canvas) continue;
    child.style.pointerEvents = enabled ? 'auto' : 'none';
  }
  // Also bring canvas to front visually, but keep other elements visible
  if (canvas) canvas.style.zIndex = enabled ? '20' : '';
  // Visual debug border when tracing is active
  if (canvas) canvas.style.outline = enabled ? 'none' : '2px solid red';
}

// ── Idle / completion loop ─────────────────────────────────────
function startIdleLoop(): void {
  const loop = () => {
    if (active) { idleFrame = requestAnimationFrame(loop); return; }
    runePhase += 0.005;
    if (traced) drawCompletedCircle();
    else drawIdle();
    updateAndDrawParticles();
    idleFrame = requestAnimationFrame(loop);
  };
  if (idleFrame) cancelAnimationFrame(idleFrame);
  idleFrame = requestAnimationFrame(loop);
}

// ── Draw functions (unchanged visuals) ──────────────────────────
function drawIdle(): void {
  if (!ctx) return;
  ctx.clearRect(0, 0, SIZE, SIZE);
  // ... (identical to previous, with ambient glow, guide circle, runes, start marker)
  // For brevity I'll include a compact version that still looks good.
  const grad = ctx.createRadialGradient(CX, CY, 20, CX, CY, RADIUS+40);
  grad.addColorStop(0, 'rgba(16,40,20,0.4)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(CX,CY,RADIUS+40,0,Math.PI*2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle='#2f4a2f'; ctx.lineWidth=2; ctx.shadowColor='#2f5a2f'; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(CX,CY,RADIUS,0,Math.PI*2); ctx.stroke(); ctx.restore();
  drawRunes(runePhase);
  const sx = CX + Math.cos(-Math.PI/2)*RADIUS, sy = CY + Math.sin(-Math.PI/2)*RADIUS;
  ctx.save(); ctx.shadowColor='#d4af37'; ctx.shadowBlur=20; ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.arc(sx,sy,14,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(sx,sy,6,0,Math.PI*2); ctx.fill(); ctx.restore();
}

function drawRunes(phase: number): void {
  if (!ctx) return;
  const r = RADIUS + 24;
  ctx.save(); ctx.font="bold 18px 'Courier New', monospace"; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.shadowColor='#6a8a4a'; ctx.shadowBlur=4;
  for (let i=0; i<RUNES.length; i++) {
    const angle = (i/RUNES.length)*Math.PI*2 - Math.PI/2 + phase;
    const x = CX + Math.cos(angle)*r, y = CY + Math.sin(angle)*r;
    const glow = 0.5+0.5*Math.sin(phase*3+i);
    ctx.fillStyle=`rgba(180,220,150,${glow})`; ctx.fillText(RUNES[i],x,y);
  }
  ctx.restore();
}

function drawCompletedCircle(): void {
  if (!ctx) return;
  ctx.clearRect(0,0,SIZE,SIZE);
  const pulse = 0.6+0.4*Math.sin(Date.now()*0.003);
  const grad = ctx.createRadialGradient(CX,CY,0,CX,CY,RADIUS+80);
  grad.addColorStop(0,`rgba(0,255,100,${0.25*pulse})`); grad.addColorStop(0.4,`rgba(0,60,0,${0.15*pulse})`); grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(CX,CY,RADIUS+80,0,Math.PI*2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle=`rgba(212,175,55,${0.7*pulse})`; ctx.lineWidth=3; ctx.shadowColor='#d4af37'; ctx.shadowBlur=25*pulse; ctx.beginPath(); ctx.arc(CX,CY,RADIUS,0,Math.PI*2); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(CX,CY,RADIUS-40,0,Math.PI*2);
  const coreGrad = ctx.createRadialGradient(CX,CY,0,CX,CY,RADIUS-40);
  coreGrad.addColorStop(0,`rgba(255,255,200,${0.9*pulse})`); coreGrad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=coreGrad; ctx.globalCompositeOperation='lighter'; ctx.shadowColor='#ffffaa'; ctx.shadowBlur=40*pulse; ctx.fill(); ctx.restore();
  drawRunes(runePhase);
}

// ── Trace frame (simplified but still nice) ────────────────────
function drawTraceFrame(): void {
  if (!ctx) return;
  ctx.clearRect(0,0,SIZE,SIZE);
  // ambient
  const amb = 0.3+quality*0.4;
  const grad = ctx.createRadialGradient(CX,CY,RADIUS*0.5,CX,CY,RADIUS+30);
  grad.addColorStop(0,`rgba(40,${Math.floor(60+quality*60)},40,${amb})`); grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(CX,CY,RADIUS+30,0,Math.PI*2); ctx.fill(); ctx.restore();
  // guide circle
  ctx.save(); ctx.strokeStyle='#2f4a2f'; ctx.lineWidth=2; ctx.shadowColor='#2f5a2f'; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(CX,CY,RADIUS,0,Math.PI*2); ctx.stroke(); ctx.restore();
  // progress arc
  if (progress > 0) {
    ctx.save();
    const color = quality>0.7?'#ffd700':(quality>0.4?'#a0d07a':'#8a6a3a');
    ctx.strokeStyle=color; ctx.lineWidth=6; ctx.shadowColor=color; ctx.shadowBlur=20*quality; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(CX,CY,RADIUS, -Math.PI/2, -Math.PI/2+progress*Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  // trail
  if (trail.length > 1) {
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for (let i=1; i<trail.length; i++) {
      const p0=trail[i-1], p1=trail[i];
      const q = p1.quality;
      const hue=40+q*80, light=45+q*35;
      ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y);
      ctx.strokeStyle=`hsla(${hue},90%,${light}%,0.85)`; ctx.lineWidth=TRACE_WIDTH*(0.4+q*0.6); ctx.lineCap='round'; ctx.shadowColor=`hsla(${hue},90%,${light}%,0.85)`; ctx.shadowBlur=12*q;
      ctx.stroke();
    }
    ctx.restore();
  }
  drawRunes(runePhase);
  // start marker
  const sx = CX+Math.cos(-Math.PI/2)*RADIUS, sy = CY+Math.sin(-Math.PI/2)*RADIUS;
  ctx.save(); ctx.shadowColor='#ffd700'; ctx.shadowBlur=18; ctx.fillStyle='#ffffcc'; ctx.beginPath(); ctx.arc(sx,sy,14,0,Math.PI*2); ctx.fill(); ctx.restore();
  // cursor
  if (cursorPos) {
    ctx.save(); ctx.shadowColor='#a0d07a'; ctx.shadowBlur=20; ctx.globalCompositeOperation='lighter';
    ctx.beginPath(); ctx.arc(cursorPos.x, cursorPos.y, 10,0,Math.PI*2); ctx.fillStyle='rgba(160,208,122,0.7)'; ctx.fill();
    ctx.restore();
  }
}

// ── Particles ─────────────────────────────────────────────────
function emitParticles(x:number,y:number,count:number,color:string,speed=1.5): void {
  for (let i=0;i<count;i++) {
    const a=Math.random()*Math.PI*2, s=speed*(0.5+Math.random());
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,maxLife:0.6+Math.random()*0.8,size:2+Math.random()*3,color});
  }
}
function updateAndDrawParticles(): void {
  if (!ctx) return;
  ctx.save(); ctx.globalCompositeOperation='lighter';
  particles = particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=0.97;p.vy*=0.97;p.life-=0.02;return p.life>0;});
  for (const p of particles) {
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); ctx.fillStyle=p.color; ctx.shadowColor=p.color; ctx.shadowBlur=6*p.life; ctx.globalAlpha=p.life; ctx.fill();
  }
  ctx.restore();
}

// ── Trace lifecycle ────────────────────────────────────────────
function startTrace(): void {
  active = true; traced = false; dragging = false; progress=0; quality=0; lastAngle=null; cursorPos=null; angleHistory=[]; trail=[]; particles=[];
  setCanvasOnly(false);  // siblings disabled
  startLoop('circleTraceLoop'); playSfx('uiClick');
  window.dispatchEvent(new CustomEvent('darknest:minigame-state',{detail:{active:true,source:'circle-trace'}}));
  const loop = () => {
    if (!active) return;
    runePhase+=0.01; drawTraceFrame(); updateAndDrawParticles(); animFrame=requestAnimationFrame(loop);
  };
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame=requestAnimationFrame(loop);
}
function resetTrace(): void {
  active=false; traced=false; progress=0; quality=0; trail=[]; particles=[];
  stopLoop('runeTetherAmbient'); setCanvasOnly(true);
  if (animFrame) cancelAnimationFrame(animFrame);
  drawIdle(); startIdleLoop();
}
function finishTrace(success:boolean): void {
  active=false; setCanvasOnly(true); stopLoop('circleTraceLoop');
  window.dispatchEvent(new CustomEvent('darknest:minigame-state',{detail:{active:false,source:'circle-trace'}}));
  if (success && quality>=0.3) {
    traced=true; circleQuality.value=quality; circlePower.value=Math.min(100,circlePower.value+25+Math.floor(quality*20));
    circleIntegrity.value=Math.min(100,circleIntegrity.value+25);
    for (let i=0;i<120;i++) { const a=(i/120)*Math.PI*2; const x=CX+Math.cos(a)*RADIUS, y=CY+Math.sin(a)*RADIUS; emitParticles(x,y,3,i%2===0?'#ffd700':'#a0d07a',2.5); }
    addLog(`✨ Circle traced with ${Math.floor(quality*100)}% quality!`,false,'player');
    narrateEvent('The survivor traces a ritual circle in emerald light. The Seed resonates.').then(n=>{if(n)addLog(`🌿 ${n}`,false,'orbex');}).catch(()=>{});
    const circleEl=el('ritualCircle'); if(circleEl) circleEl.classList.add('traced');
    startLoop('runeTetherAmbient'); playSfx('circleTraceComplete');
    if(!tutorial.value.firstTrace){tutorial.value={...tutorial.value,firstTrace:true}; addLog('📖 Tome updated: Circle Tracing.',false,'system');}
    startIdleLoop();
  } else {
    addLog(`Trace impure. Quality: ${Math.floor(quality*100)}%.`,true); playSfx('runeEtchFail'); resetTrace();
  }
}

// ── Pointer events (pixel‑perfect) ─────────────────────────────
function pos(e:MouseEvent):{x:number;y:number}{const r=canvas!.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top};}
function tpos(e:TouchEvent):{x:number;y:number}{const r=canvas!.getBoundingClientRect(); const t=e.touches[0]; return {x:t.clientX-r.left, y:t.clientY-r.top};}

function onPointerDown(e:MouseEvent):void{ if(!active||dragging)return; begin(pos(e)); }
function onPointerMove(e:MouseEvent):void{ if(!active||!dragging)return; move(pos(e)); }
function onPointerUp():void{ if(active) end(); }

function onTouchStart(e:TouchEvent):void{ e.preventDefault(); if(!active||dragging)return; begin(tpos(e)); }
function onTouchMove(e:TouchEvent):void{ e.preventDefault(); if(!active||!dragging)return; move(tpos(e)); }
function onTouchEnd(e:TouchEvent):void{ e.preventDefault(); if(active) end(); }

function begin(p:{x:number;y:number}):void{
  const sx=CX, sy=CY-RADIUS;
  if(Math.hypot(p.x-sx,p.y-sy)>80) return;   // very generous
  dragging=true; lastAngle=-Math.PI/2; cursorPos=p; progress=0; quality=0; angleHistory=[]; trail=[{x:p.x,y:p.y,quality:1}];
  emitParticles(p.x,p.y,8,'#ffd700'); playSfx('circleTraceDot');
}

function move(p:{x:number;y:number}):void{
  if(lastAngle===null)return;
  const dx=p.x-CX, dy=p.y-CY;
  let angle=Math.atan2(dy,dx);
  let diff=angle-lastAngle; if(diff>Math.PI)diff-=Math.PI*2; if(diff<-Math.PI)diff+=Math.PI*2;
  const newAngle=lastAngle+diff;
  let raw=(newAngle+Math.PI/2)/(2*Math.PI); if(raw<0)raw+=1;
  if(raw<progress-0.03){ quality=Math.max(0,quality-0.025); emitParticles(p.x,p.y,2,'#8a4a3a'); }
  else { progress=Math.min(1,raw); }
  const idealX=CX+Math.cos(newAngle)*RADIUS, idealY=CY+Math.sin(newAngle)*RADIUS;
  const dist=Math.hypot(p.x-idealX,p.y-idealY);
  const guidance=getGuidanceHitZoneMultiplier();
  const closeness=Math.max(0,1-dist/(35*guidance));
  let smooth=1;
  if(angleHistory.length>=2){
    const avg=angleHistory.reduce((a,b)=>a+b,0)/angleHistory.length;
    const vari=angleHistory.reduce((a,b)=>a+Math.abs(b-avg),0)/angleHistory.length;
    smooth=Math.max(0,1-vari/0.1);
  }
  angleHistory.push(diff); if(angleHistory.length>SMOOTH_WINDOW)angleHistory.shift();
  quality=Math.min(1,quality+closeness*smooth*0.018);
  trail.push({x:p.x,y:p.y,quality:closeness}); if(trail.length>180)trail.shift();
  emitParticles(p.x,p.y,2,closeness>0.7?'#d4af37':'#a0d07a');
  if(Math.random()<0.15)playSfx('circleTraceDot');
  lastAngle=newAngle; cursorPos=p;
}

function end():void{
  if(!active||!dragging)return;
  dragging=false; cursorPos=null;
  if(progress>=0.98 && quality>=0.3){ finishTrace(true); }
  else if(progress>0){ finishTrace(false); }
  lastAngle=null;
}