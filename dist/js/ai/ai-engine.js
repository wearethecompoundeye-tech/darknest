// js/ai/ai-engine.ts
const OLLAMA_URL = 'http://localhost:11434/api/chat';
// Prevent repeated connection attempts if Ollama is known to be offline.
let ollamaOffline = false;
const DEFAULT_MODEL = 'zelion-rp';
export async function askOllama(messages, model = DEFAULT_MODEL) {
    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                stream: false,
                options: { temperature: 0.8, num_predict: 100 }
            })
        });
        if (!response.ok)
            throw new Error('Ollama API error: ' + response.status);
        const data = await response.json();
        return data.message.content.trim();
    }
    catch (error) {
        if (!ollamaOffline) {
            ollamaOffline = true;
            console.warn('Ollama offline, switching to fallbacks.');
        }
        const fallbacks = {
            demon: ['"You dare summon me, mortal?"', '"I will devour your soul."', '"Pathetic."'],
            whisp: ['The shadows whisper...', 'I sense danger.', 'Interesting.'],
            room: ['A damp corridor stretches ahead.', 'The air is thick with decay.', 'Ancient runes flicker on the walls.']
        };
        const content = messages[0]?.content || '';
        if (content.includes('demon'))
            return fallbacks.demon[Math.floor(Math.random() * fallbacks.demon.length)];
        if (content.includes('Whisp'))
            return fallbacks.whisp[Math.floor(Math.random() * fallbacks.whisp.length)];
        if (content.includes('undercrypt'))
            return fallbacks.room[Math.floor(Math.random() * fallbacks.room.length)];
        return 'The darkness offers no reply...';
    }
}
export async function narrateEvent(eventDescription) {
    const messages = [
        { role: 'system', content: 'You are the Seed of Orbex. Narrate in one atmospheric sentence.' },
        { role: 'user', content: eventDescription }
    ];
    return await askOllama(messages);
}
export async function getDemonDialogue(demonName, demonTrait, situation) {
    const traitGuidance = {
        Cunning: 'You are deceptive, manipulative, and speak in riddles laced with veiled threats. Your words drip with false courtesy. Keep under 2 sentences. Be vulgar and cruel.',
        Feral: 'You are animalistic, aggressive, and speak in short, guttural bursts. Refer to the summoner as "meat" or "prey". Keep under 2 sentences.',
        Ancient: 'You are old, wise, and utterly bored. Speak condescendingly, as if to a child. Keep under 2 sentences.',
        Volatile: 'You are unpredictable, manic. Your mood swings wildly. Laugh, then threaten to eat their soul. Keep under 2 sentences.',
        'Shadow-touched': 'You whisper madness. Your words are fragmented, unsettling. Refer to the "void" as your lover. Keep under 2 sentences.'
    };
    const guidance = traitGuidance[demonTrait] || 'You are a bound demon, resentful but compelled. Be vulgar and cruel. Keep under 2 sentences.';
    const messages = [
        { role: 'system', content: `You are ${demonName}, a ${demonTrait} demon. ${guidance}` },
        { role: 'user', content: situation }
    ];
    return await askOllama(messages);
}
export async function getWhispCommentary(context, stateSummary) {
    const messages = [
        { role: 'system', content: 'You are Whisp, a sarcastic, darkly humorous familiar bonded to an acolyte in a dark fantasy world. You are loyal but mocking. Keep responses under 15 words. Be witty and grim.' },
        { role: 'user', content: `Context: ${context}. Current state: ${stateSummary}. Provide a short, darkly humorous commentary.` }
    ];
    return await askOllama(messages);
}
export async function getMazeRoomDescription(cellType, demonTrait) {
    const messages = [
        { role: 'system', content: 'You describe a single room in a dark fantasy undercrypt. Use 8-12 words. Be evocative and grim.' },
        { role: 'user', content: `Describe a ${cellType} room encountered by a ${demonTrait} demon.` }
    ];
    return await askOllama(messages);
}
export async function getAcolyteMemory(acolyteName) {
    const messages = [
        { role: 'system', content: 'You are a fragment of a corrupted acolyte\'s memory. Speak in 1-2 sentences. Reveal a hint of betrayal or regret.' },
        { role: 'user', content: `You are ${acolyteName}. Share a memory.` }
    ];
    return await askOllama(messages);
}
export async function getOrbexVision() {
    const messages = [
        { role: 'system', content: 'You are the Orbex Seed, whispering cryptic guidance. Give a short, cryptic hint about the undercrypt maze in 10 words or fewer.' },
        { role: 'user', content: 'Provide a vision.' }
    ];
    return await askOllama(messages);
}
export async function testOllamaConnection() {
    if (ollamaOffline)
        return false;
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        return response.ok;
    }
    catch {
        return false;
    }
}
