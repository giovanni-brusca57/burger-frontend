import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en/translation.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇺🇸' },
  { code: 'zh', label: '中文',         flag: '🇨🇳' },
  { code: 'ko', label: '한국어',        flag: '🇰🇷' },
  { code: 'ja', label: '日本語',        flag: '🇯🇵' },
  { code: 'vi', label: 'Tiếng Việt',  flag: '🇻🇳' },
  { code: 'th', label: 'ภาษาไทย',     flag: '🇹🇭' },
  { code: 'ar', label: 'العربية',     flag: '🇸🇦' },
  { code: 'hi', label: 'हिन्दी',       flag: '🇮🇳' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/** Languages that require right-to-left text direction */
export const RTL_LANGUAGES: SupportedLanguage[] = ['ar'];

const STORAGE_KEY = 'app-language';
const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

const savedLanguage =
  (localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null) ??
  DEFAULT_LANGUAGE;

// Explicit dynamic import map — Vite analyses these at build time to create separate locale chunks.
// English is always statically bundled (fallback); every other locale is a separate async chunk.
const LOCALE_LOADERS: Partial<Record<SupportedLanguage, () => Promise<{ default: unknown }>>> = {
  zh: () => import('./locales/zh/translation.json'),
  ko: () => import('./locales/ko/translation.json'),
  ja: () => import('./locales/ja/translation.json'),
  vi: () => import('./locales/vi/translation.json'),
  th: () => import('./locales/th/translation.json'),
  ar: () => import('./locales/ar/translation.json'),
  hi: () => import('./locales/hi/translation.json'),
};

// Build initial resources — always include English as the fallback.
// If the saved language is not English, load it now (top-level await) so the very
// first render already uses the correct locale — no flash of English content.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resources: Record<string, { translation: any }> = {
  en: { translation: enTranslation },
};

if (savedLanguage !== 'en' && LOCALE_LOADERS[savedLanguage]) {
  try {
    const m = await LOCALE_LOADERS[savedLanguage]!();
    resources[savedLanguage] = { translation: m.default };
  } catch {
    // Locale chunk failed to load — fall back to English silently
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
  debug: import.meta.env.DEV,
});

/** Apply text direction to <html> element based on language */
function applyDirection(lang: SupportedLanguage) {
  const dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
}

// Apply direction on initial load
applyDirection(savedLanguage);

/** Persist language choice, lazy-load the locale chunk if needed, then switch */
export async function changeLanguage(lang: SupportedLanguage) {
  localStorage.setItem(STORAGE_KEY, lang);
  applyDirection(lang);
  if (!i18n.hasResourceBundle(lang, 'translation') && LOCALE_LOADERS[lang]) {
    const m = await LOCALE_LOADERS[lang]!();
    i18n.addResourceBundle(lang, 'translation', m.default, true, true);
  }
  return i18n.changeLanguage(lang);
}

export default i18n;
