// js/ai/ai-engine.ts – AI engine (mocked for development)

export async function askOllama(messages: { role: string; content: string }[]): Promise<string> {
  return "I hear you, Acolyte. The shadows listen.";
}

export async function narrateEvent(event: string): Promise<string> {
  // Returns a Promise to match expected .then() usage in minigames
  return "Something stirs in the Undercrypt...";
}

// Add any other exports that the scanner finds, e.g.:
export async function getKalgothAction(state: any, player: any, enemy: any): Promise<{ banter: string }> {
  return { banter: "A distant, mocking laugh echoes." };
}

export function generateTaunt(): string {
  return "Kalgoth watches.";
}