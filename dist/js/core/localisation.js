// js/core/localisation.ts
// Minimal locale system. Loads JSON from public/locales/ at runtime.
let currentLocale = {};
export async function initLocale(lang = 'en') {
    try {
        const res = await fetch(`/locales/${lang}.json`);
        currentLocale = await res.json();
    }
    catch {
        console.warn(`Locale ${lang} not found, falling back to English.`);
        const res = await fetch('/locales/en.json');
        currentLocale = await res.json();
    }
}
export function t(key, fallback) {
    return currentLocale[key] || fallback || key;
}
