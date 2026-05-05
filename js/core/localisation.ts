// js/core/localisation.ts
// Minimal locale system. Loads JSON from public/locales/ at runtime.

let currentLocale: Record<string, string> = {};

export async function initLocale(lang: string = 'en'): Promise<void> {
  try {
    const res = await fetch(`/locales/${lang}.json`);
    currentLocale = await res.json();
  } catch (error) {
    console.warn(`Locale ${lang} not found, falling back to English.`, error);
    const res = await fetch('/locales/en.json');
    currentLocale = await res.json();
  }
}

export function t(key: string, fallback?: string): string {
  return currentLocale[key] || fallback || key;
}
