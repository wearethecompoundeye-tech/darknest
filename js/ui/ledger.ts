// js/ui/ledger.ts
import { state, ledgerEntries, totalSummons, totalExplorations, discoveries } from '../core/state-signals.js';
import { askOllama } from '../ai/ai-engine.js';
import { el } from '../core/dom-helper.js';

interface LedgerEntry {
  timestamp: number;
  day: number;
  type: string;
  demonName?: string;
  trait?: string;
  bonus?: number;
  ichor?: number;
  bone?: number;
  items?: string;
  discoveryType?: string;
  name?: string;
  item?: string;
  amount?: number;
  text?: string;
  fromJar?: boolean;
  success?: boolean;
  path?: string;
}

export function addLedgerEntry(type: string, data: Record<string, any>): void {
  const entry: LedgerEntry = {
    timestamp: Date.now(),
    day: Math.floor((600 - state.timerSeconds) / 60) + 1,
    type,
    ...data
  };
  ledgerEntries.value = [...ledgerEntries.value, entry];
  if (ledgerEntries.value.length > 200) {
    ledgerEntries.value = ledgerEntries.value.slice(-200);
  }
}

export async function renderLedger(containerId: string): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div class="ledger-container"><h3>📜 SKALD'S TALE</h3><p style="font-style:italic; opacity:0.8;">The saga weaves...</p></div>`;

  const entries = [...ledgerEntries.value].reverse();
  const recentEntries = entries.slice(0, 10);

  let verse = '';
  if (recentEntries.length > 0) {
    const summary = recentEntries.map(e => {
      const entry = e as LedgerEntry;
      switch (entry.type) {
        case 'summon': return `summoned ${entry.demonName}`;
        case 'release': return `released ${entry.demonName}`;
        case 'destroy': return `destroyed ${entry.demonName}`;
        case 'capture': return `captured ${entry.demonName}`;
        case 'explore': return `sent ${entry.demonName || 'demon'} into the maze`;
        case 'discovery': return `discovered ${entry.name}`;
        case 'craft': return `crafted ${entry.item}`;
        case 'tithe': return `paid the blood tithe`;
        default: return entry.text || 'acted';
      }
    }).join(', ');
    try {
      const prompt = `You are a skald in a dark Norse fantasy world. Write a short epic verse (4-6 lines) in alliterative, kennings-rich style about an acolyte who ${summary}. Use archaic language. Keep under 100 words.`;
      verse = await askOllama([{ role: 'user', content: prompt }]);
    } catch (e) {
      verse = "The ravens watch, but no song comes.\nThe acolyte's deeds echo in silence.";
    }
  } else {
    verse = "The saga begins...\nA new thread in the Norns' loom.";
  }

  let html = `<div class="ledger-container"><h3>📜 SKALD'S TALE</h3><div class="skald-verse">${verse.replace(/\n/g, '<br>')}</div>`;
  html += `<div class="ledger-summary"><span>🔺 Summoned: ${totalSummons.value}</span><span>🕊️ Released: ${releasedDemons.value.length}</span><span>🗺️ Expeditions: ${totalExplorations.value}</span><span>📖 Lore: ${discoveries.value.lore.length}</span></div>`;
  html += `<div class="ledger-filters"><button class="ledger-filter active" data-filter="all">All</button><button class="ledger-filter" data-filter="demon">Demons</button><button class="ledger-filter" data-filter="lore">Lore</button><button class="ledger-filter" data-filter="resource">Resources</button></div>`;
  html += `<div class="ledger-entries" id="ledgerEntriesList">`;
  entries.forEach(entry => { html += formatLedgerEntry(entry as LedgerEntry); });
  html += `</div></div>`;
  container.innerHTML = html;

  container.querySelectorAll('.ledger-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.ledger-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterLedgerEntries((btn as HTMLElement).dataset.filter!);
    });
  });
}

function formatLedgerEntry(entry: LedgerEntry): string {
  const icons: Record<string, string> = {
    summon: '🔺', release: '🕊️', destroy: '💀', capture: '🏺', explore: '🗺️',
    discovery: '📖', lore: '📜', tithe: '💰', craft: '⚗️'
  };
  const icon = icons[entry.type] || '📌';
  let content = '';
  switch (entry.type) {
    case 'summon': content = `Summoned ${entry.demonName} (${entry.trait})`; break;
    case 'release': content = `Released ${entry.demonName}. Max Will +${entry.bonus || 5}`; break;
    case 'destroy': content = `Destroyed ${entry.demonName}. Ichor: +${entry.ichor}, Bone: +${entry.bone}`; break;
    case 'capture': content = `Captured ${entry.demonName}`; break;
    case 'explore': content = `Explored maze. Found: ${entry.items || 'nothing'}`; break;
    case 'discovery': content = `Discovered ${entry.discoveryType}: ${entry.name}`; break;
    case 'lore': content = `Lore: "${entry.text}"`; break;
    case 'tithe': content = `Paid tithe: 5 Ichor`; break;
    case 'craft': content = `Crafted ${entry.item} x${entry.amount}`; break;
    default: content = entry.text || 'Unknown event';
  }
  const date = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `<div class="ledger-entry" data-type="${entry.type}"><span class="ledger-icon">${icon}</span><span class="ledger-content">${content}</span><span class="ledger-time">Day ${entry.day} ${date}</span></div>`;
}

function filterLedgerEntries(filter: string): void {
  const entries = document.querySelectorAll('.ledger-entry');
  entries.forEach(entry => {
    const el = entry as HTMLElement;
    const type = el.dataset.type;
    if (filter === 'all') {
      el.style.display = 'flex';
    } else if (filter === 'demon' && ['summon', 'release', 'destroy', 'capture'].includes(type!)) {
      el.style.display = 'flex';
    } else if (filter === 'lore' && ['lore', 'discovery'].includes(type!)) {
      el.style.display = 'flex';
    } else if (filter === 'resource' && ['tithe', 'craft', 'explore'].includes(type!)) {
      el.style.display = 'flex';
    } else {
      el.style.display = 'none';
    }
  });
}