# FixGrimoireFullArt.ps1
$ErrorActionPreference = "Stop"
Write-Host "=== Fixing full‑art modal, frame alignment & reflection ===" -ForegroundColor Green

Copy-Item "js\ui\grimoire.ts" "js\ui\grimoire.ts.bak_fullart"

$file = "js\ui\grimoire.ts"
$code = Get-Content $file -Raw

# 1. Replace showFullArt with a version that includes the frame, drop shadow, and laminated reflection
$oldFullArt = [regex]::Escape('function showFullArt(card: Card): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.9); backdrop-filter:blur(12px); z-index:6000; display:flex; align-items:center; justify-content:center; cursor:pointer;';
  overlay.innerHTML = `<img src="${card.image}" style="max-width:90vw; max-height:90vh; border-radius:20px; box-shadow:0 0 50px rgba(200,180,120,0.5); border:2px solid #c8b890;">`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}')

$newFullArt = @'
function showFullArt(card: Card): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.9); backdrop-filter:blur(12px); z-index:6000; display:flex; align-items:center; justify-content:center; cursor:pointer;';
  const container = document.createElement('div');
  container.style.cssText = 'position:relative; max-width:90vw; max-height:90vh;';
  // Drop shadow wrapper
  const shadowWrapper = document.createElement('div');
  shadowWrapper.style.cssText = 'position:relative; border-radius:24px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.8), 0 0 80px rgba(200,180,120,0.4);';
  // Card image
  const img = document.createElement('img');
  img.src = card.image;
  img.style.cssText = 'display:block; max-width:min(500px, 80vw); max-height:min(667px, 80vh); width:auto; height:auto; border-radius:24px; position:relative; z-index:1;';
  shadowWrapper.appendChild(img);
  // Frame overlay (correctly positioned to cover the card)
  const frameImg = document.createElement('img');
  frameImg.src = card.frame;
  frameImg.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; z-index:2; pointer-events:none; border-radius:24px;';
  shadowWrapper.appendChild(frameImg);
  // Laminated reflection (subtle diagonal shine)
  const reflection = document.createElement('div');
  reflection.style.cssText = 'position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.05) 100%); z-index:3; border-radius:24px; pointer-events:none;';
  shadowWrapper.appendChild(reflection);
  container.appendChild(shadowWrapper);
  overlay.appendChild(container);
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}
'@

$code = $code -replace $oldFullArt, $newFullArt

# 2. Fix selected card panel – ensure frame overlay is properly positioned
$oldSelectedInner = [regex]::Escape('<div style="position:relative; width:90px; aspect-ratio:3/4; border-radius:10px; overflow:hidden; flex-shrink:0;">
        <img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:1;">
        <img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:2; pointer-events:none;">
      </div>')

$newSelectedInner = @'
<div style="position:relative; width:90px; aspect-ratio:3/4; border-radius:10px; overflow:hidden; flex-shrink:0; box-shadow:0 6px 20px rgba(0,0,0,0.5);">
        <img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; z-index:1; border-radius:10px;">
        <img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; z-index:2; pointer-events:none;">
      </div>
'@

$code = $code -replace $oldSelectedInner, $newSelectedInner

Set-Content $file -Value $code -Encoding UTF8 -NoNewline
Write-Host "Full‑art modal now shows tier frame, drop shadow, and laminated reflection." -ForegroundColor Green
Write-Host "Selected card panel frame overlay aligned correctly." -ForegroundColor Green