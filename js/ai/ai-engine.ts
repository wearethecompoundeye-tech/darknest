// js/ai/ai-engine.ts – AI engine (mock for now)

export async function askOllama(messages: { role: string; content: string }[]): Promise<string> {
  // MOCK for testing – no Ollama needed
  return "I hear you, Acolyte. The shadows listen.";
}