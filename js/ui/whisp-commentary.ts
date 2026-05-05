// js/ui/whisp-commentary.ts – Legacy wrapper; all messages now go through Zilion (whisp-chat.ts)

import { showBubble } from './whisp-chat.js';

export let whispSay: (message: string) => void = (msg: string) => {
  showBubble(msg);
};

export function setWhispSay(fn: typeof whispSay) { whispSay = fn; }
export function setupWhispReactions() { /* deprecated; no‑op */ }
export function setWhispEnabled(enabled: boolean) { /* controlled via whisp-chat */ }
export function isWhispEnabled() { return true; }