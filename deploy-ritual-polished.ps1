# deploy-ritual-polished.ps1 – final deployment of polished, persistent Rite of Binding
$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot

# ── Helper function for safe single‑insert replacement ──
function Insert-IfMissing {
    param([string]$Content, [string]$Pattern, [string]$Insertion)
    if ($Content -notmatch [regex]::Escape($Insertion)) {
        return $Content -replace $Pattern, "$Insertion`r`n`$1"
    }
    return $Content
}

Write-Host "=== Writing js/minigames/rite-of-binding.ts ===" -ForegroundColor Cyan
@'
// js/minigames/rite-of-binding.ts – Modern, persistent Rite of Binding
// Provides: startRiteOfBinding(), drawPersistentEffects(), clearRitualEffects(), riteOfBinding object

import { el } from '../core/dom-helper.js';
import { playSfx } from '../audio/sfx.js';
import { crafted, braidedTracePhases } from '../core/state-signals.js';
import { ritualEngine } from '../systems/ritual-engine.js';
import { addLog } from '../ui/log-manager.js';
import { showBubble } from '../ui/whisp-chat.js';

const CENTER_X = 220, CENTER_Y = 220, GEM_RADIUS = 96, GEM_COUNT = 8;

export const ritualState = {
  activated: false,
  gemTethers: [] as { from: number; to: number }[],
  runeSlots: [] as { x: number; y: number }[],
  runeConnected: false,
  glyphPoints: [] as { x: number; y: number }[],
  glyphComplete: false,
};

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let phase = 0, phaseActive = false, animFrame: number | null = null, lastTime = 0;
let ignitedGems: number[] = [], gemOrder: number[] = [], gemPulses: number[] = [];
let slotPositions: { x: number; y: number }[] = [], currentSlot = 0;
let drawing = false, glyphPoints: { x: number; y: number }[] = [];
let particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string }[] = [];

export function startRiteOfBinding(): void {
  if (crafted.value.phialOfSubjugation < 1 || crafted.value.powderOfWarding < 1) {
    showBubble("You need 1 Powder and 1 Phial. Craft them first!");
    return;
  }
  crafted.value.phialOfSubjugation--;
  crafted.value.powderOfWarding--;
  addLog("You pour the Phial and dust the Powder into the circle. The Rite begins...", false, 'player');
  ritualState.activated = true; ritualState.gemTethers = []; ritualState.runeConnected = false;
  ritualState.glyphPoints = []; ritualState.glyphComplete = false;
  phase = 0; phaseActive = true; braidedTracePhases.value = 0;
  const ritualCircle = el('ritualCircle'); if (!ritualCircle) return;
  const old = document.getElementById('riteCanvas'); if (old) old.remove();
  canvas = document.createElement('canvas'); canvas.id = 'riteCanvas'; canvas.width = 440; canvas.height = 440;
  canvas.style.cssText = 'position:absolute; top:0; left:0; z-index:20; cursor:pointer; border-radius:50%;';
  ritualCircle.appendChild(canvas); ctx = canvas.getContext('2d')!;
  bindEvents(); startPhase(0); playSfx('runeReveal'); startLoop();
  showBubble("Connect all eight gems in order – they'll stay lit!");
}

function startLoop() { function animate() { if (!phaseActive) { animFrame = null; return; } renderFrame(); animFrame = requestAnimationFrame(animate); } animFrame = requestAnimationFrame(animate); }
function stopLoop() { if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; } }

function bindEvents() { canvas!.addEventListener('mousedown', onDown); canvas!.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }
function unbindEvents() { canvas!.removeEventListener('mousedown', onDown); canvas!.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
function getPos(e: MouseEvent): { x: number; y: number } { const rect = canvas!.getBoundingClientRect(); return { x: (e.clientX - rect.left) * (440 / rect.width), y: (e.clientY - rect.top) * (440 / rect.height) }; }

const onDown = (e: MouseEvent) => { if (!phaseActive) return; const p = getPos(e); if (phase===0) handleGemClick(p); else if (phase===1) handleTetherMove(p); else handleGlyphDown(p); };
const onMove = (e: MouseEvent) => { if (!phaseActive) return; const p = getPos(e); if (phase===1) handleTetherMove(p); else if (phase===2 && drawing) handleGlyphMove(p); };
const onUp = () => { if (phase===2 && drawing) handleGlyphUp(); };

function startPhase(idx: number) {
  phase = idx; phaseActive = true; lastTime = performance.now(); particles = [];
  if (idx===0) { gemOrder = [0,1,2,3,4,5,6,7]; ignitedGems = []; gemPulses = Array(GEM_COUNT).fill(0); showBubble("Connect the gems in order!"); }
  else if (idx===1) { slotPositions = []; for (let i=0;i<3;i++) { const slotDiv = el(`slot${i+1}`); if (slotDiv) { const rect = slotDiv.getBoundingClientRect(); const cr = canvas!.getBoundingClientRect(); slotPositions.push({ x: rect.left+rect.width/2 - cr.left, y: rect.top+rect.height/2 - cr.top }); } else { slotPositions.push({ x: 220 + Math.cos(-Math.PI/2 + i*2*Math.PI/3)*120, y: 220 + Math.sin(-Math.PI/2 + i*2*Math.PI/3)*120 }); } } ritualState.runeSlots = slotPositions; currentSlot = 0; showBubble("Trace the triangle to awaken the runes!"); }
  else { drawing = false; glyphPoints = []; showBubble("Paint freely – your strokes will mirror!"); }
}
function phaseComplete(success: boolean) { phaseActive = false; stopLoop(); if (success) { braidedTracePhases.value = Math.min(3, braidedTracePhases.value+1); playSfx('circleTraceComplete'); if (phase<2) { setTimeout(()=>startPhase(phase+1), 600); setTimeout(()=>startLoop(), 600); } else endRitual(true); } else endRitual(false); }
function endRitual(success: boolean) { unbindEvents(); if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); canvas=null; ctx=null; if (success) { braidedTracePhases.value = 3; ritualEngine.recordAction('rite-of-binding', 1.0); addLog('The Rite is complete! The circle hums with power.', false, 'orbex'); playSfx('True_Name_Complete'); showBubble("The circle is empowered! Press SUMMON."); } else { braidedTracePhases.value = 0; ritualState.activated = false; } }

function renderFrame() { if (!ctx) return; const now = performance.now(); const dt = Math.min(0.1, (now - lastTime)/1000); lastTime = now; ctx.clearRect(0,0,440,440); drawBaseCircle(); if (phase===0) renderGemPhase(dt); else if (phase===1) renderTetherPhase(dt); else if (phase===2) renderGlyphPhase(dt); renderParticles(dt); }
function drawBaseCircle() { if (!ctx) return; ctx.beginPath(); ctx.arc(CENTER_X, CENTER_Y, 155, 0, Math.PI*2); ctx.strokeStyle = 'rgba(200,180,120,0.25)'; ctx.lineWidth = 3; ctx.stroke(); }

function drawEnergyBeam(x1:number,y1:number,x2:number,y2:number,color:string) {
  if (!ctx) return; ctx.save(); ctx.shadowColor=color; ctx.shadowBlur=15; ctx.strokeStyle=color; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.shadowBlur=8; ctx.strokeStyle='#ffffff'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.restore();
  if (Math.random()<0.25) { const t=Math.random(); particles.push({ x:x1+(x2-x1)*t, y:y1+(y2-y1)*t, vx:(Math.random()-0.5)*40, vy:(Math.random()-0.5)*40, life:0.6, maxLife:0.6, size:2+Math.random()*3, color }); }
}

function renderGemPhase(dt:number) {
  for (let i=0;i<GEM_COUNT;i++) gemPulses[i] += dt*5;
  for (let i=0;i<GEM_COUNT;i++) {
    const a = (i/GEM_COUNT)*Math.PI*2-Math.PI/2; const x = CENTER_X+Math.cos(a)*GEM_RADIUS, y = CENTER_Y+Math.sin(a)*GEM_RADIUS;
    const ignited = ignitedGems.includes(i); const pulse = 1+0.2*Math.sin(gemPulses[i]); const size = 12*pulse;
    ctx!.beginPath(); ctx!.arc(x,y,size,0,Math.PI*2); ctx!.fillStyle = ignited ? '#ffd700' : '#4a3a2a'; ctx!.shadowColor = ignited ? '#ffd700' : 'transparent'; ctx!.shadowBlur = ignited ? 20*pulse : 0; ctx!.fill();
    ctx!.strokeStyle = ignited ? '#ffffff' : '#c8b890'; ctx!.lineWidth = 2; ctx!.stroke();
    if (ignited) { ctx!.beginPath(); ctx!.arc(x-2,y-2,size*0.2,0,Math.PI*2); ctx!.fillStyle='#ffffff'; ctx!.shadowColor='#ffffff'; ctx!.shadowBlur=8; ctx!.fill(); }
  }
  if (ignitedGems.length>=2) { for (let i=1;i<ignitedGems.length;i++) { const f=ignitedGems[i-1],t=ignitedGems[i]; const a1=(f/GEM_COUNT)*Math.PI*2-Math.PI/2,a2=(t/GEM_COUNT)*Math.PI*2-Math.PI/2; drawEnergyBeam(CENTER_X+Math.cos(a1)*GEM_RADIUS,CENTER_Y+Math.sin(a1)*GEM_RADIUS,CENTER_X+Math.cos(a2)*GEM_RADIUS,CENTER_Y+Math.sin(a2)*GEM_RADIUS,'#ffd700'); } }
  if (ignitedGems.length===GEM_COUNT) { const a1=(ignitedGems[GEM_COUNT-1]/GEM_COUNT)*Math.PI*2-Math.PI/2,a2=(ignitedGems[0]/GEM_COUNT)*Math.PI*2-Math.PI/2; drawEnergyBeam(CENTER_X+Math.cos(a1)*GEM_RADIUS,CENTER_Y+Math.sin(a1)*GEM_RADIUS,CENTER_X+Math.cos(a2)*GEM_RADIUS,CENTER_Y+Math.sin(a2)*GEM_RADIUS,'#ffd700'); }
}
function handleGemClick(p:{x:number;y:number}) { if (phase!==0||!phaseActive) return; for (let i=0;i<GEM_COUNT;i++) { const a=(i/GEM_COUNT)*Math.PI*2-Math.PI/2; const gx=CENTER_X+Math.cos(a)*GEM_RADIUS,gy=CENTER_Y+Math.sin(a)*GEM_RADIUS; if (Math.hypot(p.x-gx,p.y-gy)<22) { if (gemOrder.indexOf(i)===ignitedGems.length) { ignitedGems.push(i); playSfx('runeApply'); if (ignitedGems.length===GEM_COUNT) { ritualState.gemTethers=[]; for (let j=1;j<GEM_COUNT;j++) ritualState.gemTethers.push({from:gemOrder[j-1],to:gemOrder[j]}); ritualState.gemTethers.push({from:gemOrder[GEM_COUNT-1],to:gemOrder[0]}); phaseComplete(true); } } else playSfx('phialFail'); break; } } }

function renderTetherPhase(dt:number) { for (let i=0;i<3;i++) { const pos=slotPositions[i]; ctx!.beginPath(); ctx!.arc(pos.x,pos.y,16,0,Math.PI*2); ctx!.fillStyle=i<currentSlot?'#f0a85a':'rgba(240,168,90,0.3)'; ctx!.fill(); ctx!.strokeStyle='#f0a85a'; ctx!.lineWidth=2; ctx!.stroke(); } if (currentSlot>=2) for (let i=1;i<currentSlot;i++) drawEnergyBeam(slotPositions[i-1].x,slotPositions[i-1].y,slotPositions[i].x,slotPositions[i].y,'#f0a85a'); if (currentSlot===3) { drawEnergyBeam(slotPositions[0].x,slotPositions[0].y,slotPositions[1].x,slotPositions[1].y,'#f0a85a'); drawEnergyBeam(slotPositions[1].x,slotPositions[1].y,slotPositions[2].x,slotPositions[2].y,'#f0a85a'); drawEnergyBeam(slotPositions[2].x,slotPositions[2].y,slotPositions[0].x,slotPositions[0].y,'#f0a85a'); } }
function handleTetherMove(p:{x:number;y:number}) { if (phase!==1||!phaseActive) return; if (currentSlot>=3) return; const target=slotPositions[currentSlot]; if (Math.hypot(p.x-target.x,p.y-target.y)<28) { playSfx('runeApply'); currentSlot++; if (currentSlot===3) { ritualState.runeConnected=true; phaseComplete(true); } } }

function renderGlyphPhase(dt:number) { if (glyphPoints.length>1) { ctx!.save(); ctx!.strokeStyle='#b388eb'; ctx!.lineWidth=3; ctx!.lineCap='round'; ctx!.shadowColor='#b388eb'; ctx!.shadowBlur=15; for (const [sx,sy] of [[1,1],[1,-1],[-1,1],[-1,-1]]) { ctx!.beginPath(); let first=true; for (const pt of glyphPoints) { const px=CENTER_X+(pt.x-CENTER_X)*sx, py=CENTER_Y+(pt.y-CENTER_Y)*sy; if (first) { ctx!.moveTo(px,py); first=false; } else ctx!.lineTo(px,py); } ctx!.stroke(); } ctx!.restore(); } }
function handleGlyphDown(p:{x:number;y:number}) { if (phase!==2||!phaseActive) return; drawing=true; glyphPoints=[p]; }
function handleGlyphMove(p:{x:number;y:number}) { if (!drawing) return; glyphPoints.push(p); if (Math.random()<0.4) particles.push({ x:p.x,y:p.y, vx:(Math.random()-0.5)*20, vy:(Math.random()-0.5)*20, life:0.3, maxLife:0.3, size:1+Math.random()*2, color:'#b388eb' }); }
function handleGlyphUp() { if (!drawing) return; drawing=false; ritualState.glyphPoints=glyphPoints; ritualState.glyphComplete=true; phaseComplete(true); }
function renderParticles(dt:number) { particles = particles.filter(p=>{p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; return p.life>0;}); for (const p of particles) { ctx!.save(); ctx!.globalAlpha=Math.min(1,p.life/p.maxLife); ctx!.beginPath(); ctx!.arc(p.x,p.y,p.size,0,Math.PI*2); ctx!.fillStyle=p.color; ctx!.shadowColor=p.color; ctx!.shadowBlur=6; ctx!.fill(); ctx!.restore(); } }

export function drawPersistentEffects(ctx: CanvasRenderingContext2D): void {
  if (!ritualState.activated) return;
  if (ritualState.gemTethers.length) {
    for (const t of ritualState.gemTethers) {
      const a1 = (t.from/GEM_COUNT)*Math.PI*2-Math.PI/2, a2 = (t.to/GEM_COUNT)*Math.PI*2-Math.PI/2;
      const x1 = CENTER_X+Math.cos(a1)*GEM_RADIUS, y1 = CENTER_Y+Math.sin(a1)*GEM_RADIUS, x2 = CENTER_X+Math.cos(a2)*GEM_RADIUS, y2 = CENTER_Y+Math.sin(a2)*GEM_RADIUS;
      ctx.save(); ctx.shadowColor='#ffd700'; ctx.shadowBlur=12; ctx.strokeStyle='#ffd700'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.restore();
    }
  }
  if (ritualState.runeConnected && ritualState.runeSlots.length===3) {
    const s = ritualState.runeSlots;
    ctx.save(); ctx.shadowColor='#f0a85a'; ctx.shadowBlur=10; ctx.strokeStyle='#f0a85a'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(s[0].x,s[0].y); ctx.lineTo(s[1].x,s[1].y); ctx.lineTo(s[2].x,s[2].y); ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  if (ritualState.glyphComplete && ritualState.glyphPoints.length>1) {
    ctx.save(); ctx.strokeStyle='#b388eb'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.shadowColor='#b388eb'; ctx.shadowBlur=10;
    for (const [sx,sy] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
      ctx.beginPath(); let first=true;
      for (const pt of ritualState.glyphPoints) {
        const px = CENTER_X + (pt.x-CENTER_X)*sx, py = CENTER_Y + (pt.y-CENTER_Y)*sy;
        if (first) { ctx.moveTo(px,py); first=false; } else ctx.lineTo(px,py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function clearRitualEffects() {
  ritualState.activated = false; ritualState.gemTethers = [];
  ritualState.runeConnected = false; ritualState.glyphPoints = []; ritualState.glyphComplete = false;
}

export const riteOfBinding = { start: startRiteOfBinding };
'@ | Set-Content -Path "js/minigames/rite-of-binding.ts"

# ── 2. Patch ui-renderer.ts ──
Write-Host "Patching js/ui/ui-renderer.ts ..." -ForegroundColor Cyan
$ui = Get-Content "js/ui/ui-renderer.ts" -Raw
$importLine = 'import { drawPersistentEffects, ritualState } from "../minigames/rite-of-binding.js";'
# Add import if missing
if ($ui -notmatch [regex]::Escape($importLine)) {
    $ui = $ui -replace "(import .* from '../systems/ritual-engine.js';)", "`$1`r`n$importLine"
}
# Remove any previous broken attempt at persistent rendering
$ui = $ui -replace "// --- Persistent ritual effects ---[\s\S]*?^\s*\}\);", ""
$ui = $ui -replace "effect\(\(\) => \{\s*if \(typeof ritualState !== 'undefined'[\s\S]*?^\s*\}\);", ""
# Insert fresh effect block after the last renderCardSlots effect
$insertBlock = @'

  // --- Persistent ritual effects ---
  effect(() => {
    if (typeof ritualState !== 'undefined' && ritualState.activated) {
      const pc = getEl('persistentRitualCanvas') as HTMLCanvasElement | null;
      if (!pc) {
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'persistentRitualCanvas';
        newCanvas.width = 440; newCanvas.height = 440;
        newCanvas.style.cssText = 'position:absolute; top:0; left:0; pointer-events:none; z-index:10; border-radius:50%;';
        const circle = getEl('ritualCircle');
        if (circle) circle.appendChild(newCanvas);
      }
      const canvas = getEl('persistentRitualCanvas') as HTMLCanvasElement | null;
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0,0,440,440);
        if (typeof drawPersistentEffects === 'function') drawPersistentEffects(ctx);
      }
    } else {
      const pc = getEl('persistentRitualCanvas');
      if (pc) pc.remove();
    }
  });
'@
if ($ui -match 'effect\(\(\) => renderCardSlots\(\)\);') {
    $ui = $ui -replace "(effect\(\(\) => renderCardSlots\(\)\);)", "$insertBlock`r`n  `$1"
}
Set-Content "js/ui/ui-renderer.ts" -Value $ui

# ── 3. Patch whisp-chat.ts to hide on modals ──
Write-Host "Patching js/ui/whisp-chat.ts ..." -ForegroundColor Cyan
$whisp = Get-Content "js/ui/whisp-chat.ts" -Raw
$hideFunc = @'
function hideWhispIfNeeded() {
  const modals = document.querySelectorAll('.modal');
  let anyVisible = false;
  modals.forEach(m => {
    const s = (m as HTMLElement).style.display;
    if (s !== 'none' && s !== '') anyVisible = true;
  });
  const traceActive = !!document.getElementById('riteCanvas');
  if (S.av) {
    const shouldHide = anyVisible || traceActive;
    S.av.style.display = shouldHide ? 'none' : 'block';
    if (shouldHide && S.tipBubble) { S.tipBubble.remove(); S.tipBubble = null; S.tipActive = false; }
  }
}

'@
if ($whisp -notmatch 'function hideWhispIfNeeded') {
    $whisp = $whisp -replace "(function startRenderLoop\(\): void \{)", "$hideFunc`r`n$1"
}
if ($whisp -notmatch 'hideWhispIfNeeded\(\)') {
    $whisp = $whisp -replace "(const loop = \(\) => \{)", "`$1`r`n    hideWhispIfNeeded();"
}
Set-Content "js/ui/whisp-chat.ts" -Value $whisp

# ── 4. Patch summoning.ts to clear effects after summon ──
Write-Host "Patching js/systems/summoning.ts ..." -ForegroundColor Cyan
$sum = Get-Content "js/systems/summoning.ts" -Raw
if ($sum -notmatch 'clearRitualEffects') {
    $sum = $sum -replace "(import .* from './card-acquisition.js';)", "`$1`r`nimport { clearRitualEffects } from '../minigames/rite-of-binding.js';"
    $sum = $sum -replace "(resetCircleAfterSummon\(\);)", "`$1`r`n  clearRitualEffects();"
    Set-Content "js/systems/summoning.ts" -Value $sum
}

Pop-Location
Write-Host "`n✅ All patches applied. Now run: Remove-Item -Recurse -Force node_modules\.vite" -ForegroundColor Green
Write-Host "Then restart Vite and hard‑reload the browser." -ForegroundColor Green