// js/ui/log-manager.ts
import { el } from '../core/dom-helper.js';

export type Speaker = 'system' | 'error' | 'player' | 'demon' | 'orbex' | 'whisp' | 'prophet' | 'void';

const colorMap: Record<Speaker, string> = {
  system: '#d4e0c0',
  error: '#ff8a7a',
  player: '#7ea04b',
  demon: '#b4643a',
  orbex: '#6a9ac0',
  whisp: '#a0d07a',
  prophet: '#c0a080',
  void: '#8a2a6a'
};

export function addLog(msg: string, isErr: boolean = false, speaker: Speaker = 'system'): void {
  const logContainer = el("logMessages");
  if (!logContainer) {
    console.warn('Log container not found:', msg);
    return;
  }

  const entry = document.createElement("div");
  entry.innerHTML = `> ${msg}`;

  let color: string;
  if (isErr) {
    color = colorMap.error;
  } else if (speaker && colorMap[speaker]) {
    color = colorMap[speaker];
  } else {
    color = colorMap.system;
  }

  entry.style.color = color;

  if (isErr) {
    entry.style.textShadow = '0 0 5px #ff4a2a';
  }
  if (speaker === 'demon' || speaker === 'orbex' || speaker === 'void') {
    entry.style.fontStyle = 'italic';
  }
  if (speaker === 'orbex') {
    entry.style.textShadow = '0 0 6px #6a9ac0';
  }
  if (speaker === 'prophet') {
    entry.style.fontWeight = 'bold';
  }

  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;

  while (logContainer.children.length > 35) {
    logContainer.removeChild(logContainer.firstChild!);
  }
}

export function clearLog(): void {
  const logContainer = el("logMessages");
  if (logContainer) {
    logContainer.innerHTML = '';
  }
}

export const speakerColors = colorMap;