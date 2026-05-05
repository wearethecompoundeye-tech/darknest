# FixGrimoire.ps1
$ErrorActionPreference = "Stop"
Write-Host "=== Fixing grimoire loadout + selected panel scroll ===" -ForegroundColor Green

Copy-Item "js\ui\grimoire.ts" "js\ui\grimoire.ts.bak_fix"

$file = "js\ui\grimoire.ts"
$code = Get-Content $file -Raw

# 1. Fix import: add equippedEntitySlots etc. if missing (already imported, but we'll ensure)
# Already present in imports: equippedEntitySlots, equippedSpellSlots, etc. Good.

# 2. Replace renderLoadoutPanel to use slot arrays directly
$oldLoadout = [regex]::Escape(@'
// ---------- Loadout Panel ----------
function renderLoadoutPanel(): void {
  const panel = document.getElementById('loadoutPanel');
  if (!panel) return;

  const types: {label:string; type:CardType; max:number}[] = [
    {label:'Entities', type:'entity', max:maxEntitySlots.value},
    {label:'Spells', type:'spell', max:maxSpellSlots.value},
    {label:'Enhancements', type:'enhancement', max:maxEnhancementSlots.value},
    {label:'Lands', type:'land', max:maxLandSlots.value},
  ];
  let html = '';
  types.forEach(({label,type,max}) => {
    const equipped = getEquippedCards(type);
    html += `<div style="margin-bottom:12px;"><span style="color:#d0c0a0; font-size:0.75rem;">${label} (${equipped.filter(id=>id).length}/${max})</span><div style="display:flex; gap:6px; margin-top:4px; flex-wrap:wrap;">`;
    for (let i=0; i<max; i++) {
      const id = equipped[i] || '';
      const c = id ? getCardById(id) : null;
      html += `<div class="loadout-slot" data-type="${type}" data-index="${i}" style="width:52px; height:69px; background:#1c120c; border:1px solid ${c?'#c8b890':'#5a4a3a'}; border-radius:8px; cursor:pointer; overflow:hidden; position:relative;">`;
      if (c) {
        html += `<img src="${c.image}" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:1;"><img src="${c.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:2; pointer-events:none;">`;
      } else {
        html += `<span style="display:flex; align-items:center; justify-content:center; height:100%; color:#5a4a3a; font-size:1.2rem;">+</span>`;
      }
      html += `</div>`;
    }
    html += `</div></div>`;
  });
  panel.innerHTML = html;
  panel.querySelectorAll('.loadout-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const type = slot.getAttribute('data-type') as CardType;
      const idx = parseInt(slot.getAttribute('data-index')!);
      if (selectedCardId) {
        const card = getCardById(selectedCardId);
        if (card && card.type === type) {
          equipCard(selectedCardId, type, idx);
          renderContent();
          playSfx('equipRelic');
        } else addLog(`Slot requires ${type}.`, true);
      } else addLog('Select a card first.', true);
    });
  });
}
'@)

$newLoadout = @'
// ---------- Loadout Panel (corrected) ----------
function renderLoadoutPanel(): void {
  const panel = document.getElementById('loadoutPanel');
  if (!panel) return;

  const slotArrays: {label:string; slots: string[]; max:number; type:CardType}[] = [
    {label:'Entities', slots: equippedEntitySlots.value, max: maxEntitySlots.value, type:'entity'},
    {label:'Spells',   slots: equippedSpellSlots.value, max: maxSpellSlots.value, type:'spell'},
    {label:'Enhancements', slots: equippedEnhancementSlots.value, max: maxEnhancementSlots.value, type:'enhancement'},
    {label:'Lands',   slots: equippedLandSlots.value, max: maxLandSlots.value, type:'land'},
  ];
  let html = '';
  slotArrays.forEach(({label,slots,max,type}) => {
    const filled = slots.filter(id => id).length;
    html += `<div style="margin-bottom:12px;"><span style="color:#d0c0a0; font-size:0.75rem;">${label} (${filled}/${max})</span><div style="display:flex; gap:6px; margin-top:4px; flex-wrap:wrap;">`;
    for (let i=0; i<max; i++) {
      const id = slots[i] || '';
      const card = id ? getCardById(id) : null;
      html += `<div class="loadout-slot" data-type="${type}" data-index="${i}" style="width:52px; height:69px; background:#1c120c; border:1px solid ${card?'#c8b890':'#5a4a3a'}; border-radius:8px; cursor:pointer; overflow:hidden; position:relative;">`;
      if (card) {
        html += `<img src="${card.image}" style="width:100%; height:100%; object-fit:cover; position:relative; z-index:1;"><img src="${card.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:2; pointer-events:none;">`;
      } else {
        html += `<span style="display:flex; align-items:center; justify-content:center; height:100%; color:#5a4a3a; font-size:1.2rem;">+</span>`;
      }
      html += `</div>`;
    }
    html += `</div></div>`;
  });
  panel.innerHTML = html;
  panel.querySelectorAll('.loadout-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const type = slot.getAttribute('data-type') as CardType;
      const idx = parseInt(slot.getAttribute('data-index')!);
      if (selectedCardId) {
        const card = getCardById(selectedCardId);
        if (card && card.type === type) {
          equipCard(selectedCardId, type, idx);
          renderContent();
          playSfx('equipRelic');
        } else addLog(`Slot requires ${type} card.`, true);
      } else addLog('Select a card first.', true);
    });
  });
}
'@

$code = $code -replace $oldLoadout, $newLoadout

# 3. Make selected card panel scrollable if content is too tall
$oldSelected = 'id="selectedCardPanel" style="min-height:200px;"'
$newSelected = 'id="selectedCardPanel" style="min-height:200px; max-height:360px; overflow-y:auto;"'
$code = $code.Replace($oldSelected, $newSelected)

Set-Content $file -Value $code -Encoding UTF8 -NoNewline
Write-Host "Grimoire fixed. Loadout now reads correct slot IDs, selected panel scrolls." -ForegroundColor Green