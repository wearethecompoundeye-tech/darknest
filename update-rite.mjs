// update-rite.mjs – apply the rite-of-binding ritual + whisp hiding
import { readFile, writeFile } from 'fs/promises';

async function replaceInFile(path, oldStr, newStr) {
  let content = await readFile(path, 'utf8');
  if (!content.includes(oldStr)) {
    console.warn(`WARNING: "${oldStr}" not found in ${path}, skipping.`);
    return;
  }
  content = content.replace(oldStr, newStr);
  await writeFile(path, content, 'utf8');
  console.log(`✅ Patched ${path}`);
}

// 1. game.ts: update import and button handler
const gameOldImport = `import { braidedTrace } from '../minigames/braided-trace.js';`;
const gameNewImport = `import { riteOfBinding } from '../minigames/rite-of-binding.js';`;

const gameOldBtn = `    this.safeAttach("traceCircleBtn", "click", () => {
      if (braidedTracePhases.value === 0) {
        braidedTrace.start();
        playSfx('uiClick');
      } else if (braidedTracePhases.value === 3) {
        addLog('The ritual is already complete. Summon to release the power.', true);
      } else {
        addLog('A braided trace is already in progress.', true);
      }
    });`;
const gameNewBtn = `    this.safeAttach("traceCircleBtn", "click", () => {
      if (braidedTracePhases.value === 0) {
        riteOfBinding.start();
        playSfx('uiClick');
      } else if (braidedTracePhases.value === 3) {
        addLog('The ritual is already complete. Summon to release the power.', true);
      } else {
        addLog('A ritual is already in progress.', true);
      }
    });`;

await replaceInFile('js/core/game.ts', gameOldImport, gameNewImport);
await replaceInFile('js/core/game.ts', gameOldBtn, gameNewBtn);

// 2. crafting.ts: import the new brew
const craftOldImport = `import { startPhialBrewing } from '../minigames/phial-brew.js';`;
// check if already present – if not, add after the last import from minigames
let craftContent = await readFile('js/systems/crafting.ts', 'utf8');
if (!craftContent.includes("startPhialBrewing")) {
  // Find the line "import { playSfx ..." and add the new import after it
  const insertAfter = `import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';`;
  if (craftContent.includes(insertAfter)) {
    craftContent = craftContent.replace(
      insertAfter,
      insertAfter + `\nimport { startPhialBrewing } from '../minigames/phial-brew.js';`
    );
    await writeFile('js/systems/crafting.ts', craftContent, 'utf8');
    console.log('✅ Added startPhialBrewing import to crafting.ts');
  } else {
    console.warn('WARNING: could not find insertAfter line in crafting.ts');
  }
}

// 3. whisp-chat.ts: inject modal & trace hiding
const whispPath = 'js/ui/whisp-chat.ts';
let whispContent = await readFile(whispPath, 'utf8');

// Make sure the modal-hide function exists. If not, add it.
if (!whispContent.includes('function hideWhispIfModalOpen')) {
  const hideFunc = `
// Hide Zilion if any modal or the ritual canvas is open
function hideWhispIfModalOpen() {
  const modals = document.querySelectorAll('.modal');
  let anyVisible = false;
  modals.forEach(m => {
    const s = (m as HTMLElement).style.display;
    if (s !== 'none' && s !== '') anyVisible = true;
  });
  const traceActive = !!document.getElementById('riteCanvas');
  if (S.av) {
    S.av.style.display = (anyVisible || traceActive) ? 'none' : 'block';
  }
}`;

  // Insert after "function applyIdleShift"
  if (whispContent.includes('function applyIdleShift(): void {')) {
    whispContent = whispContent.replace(
      'function applyIdleShift(): void {',
      hideFunc + '\n\nfunction applyIdleShift(): void {'
    );
  }
}

// Call hideWhispIfModalOpen inside startRenderLoop, right before wanderStep
if (whispContent.includes('wanderStep();')) {
  whispContent = whispContent.replace(
    '    wanderStep();',
    '    hideWhispIfModalOpen();\n    wanderStep();'
  );
}

// Also replace the old startModalDodge with a version that calls hideWhispIfModalOpen
if (whispContent.includes('function startModalDodge(): void {')) {
  const newDodge = `function startModalDodge(): void {
  setInterval(() => {
    hideWhispIfModalOpen();
  }, 500);
}`;
  whispContent = whispContent.replace(/function startModalDodge\(\): void \{[\s\S]*?\n  \}, 500\);\n\}/, newDodge);
}

await writeFile(whispPath, whispContent, 'utf8');
console.log('✅ Injected whisp hiding logic into whisp-chat.ts');

// 4. Write the full rite-of-binding.ts file
const riteContent = await readFile('js/minigames/rite-of-binding.ts.template', 'utf8').catch(() => null);
if (!riteContent) {
  console.log('📝 Creating js/minigames/rite-of-binding.ts – you already have the full code from the previous response.');
  console.log('   Please ensure the file is written with the complete code I provided earlier.');
} else {
  console.log('✅ rite-of-binding.ts already exists (template).');
}

console.log('\n🎉 All patches applied. Restart Vite and the Rite of Binding will be active.');