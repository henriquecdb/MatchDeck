import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { defaultPreferences, type AppPreferences } from '../domain/preferences';
import { translate, translateRuntimeMessage, type TranslationValues } from './translate';

const LanguageContext = createContext(defaultPreferences);
const startupLanguageKey = 'matchdeck.interfaceLanguage';

export function startupPreferences(): AppPreferences {
  try { return { ...defaultPreferences, language: localStorage.getItem(startupLanguageKey) === 'en' ? 'en' : 'pt-BR' }; }
  catch { return defaultPreferences; }
}

export function LanguageProvider({ preferences, children }: { preferences: AppPreferences; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = preferences.language;
    try { localStorage.setItem(startupLanguageKey, preferences.language); } catch { /* Native preferences remain authoritative. */ }
  }, [preferences.language]);
  return <LanguageContext.Provider value={preferences}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const { language, gameLanguage } = useContext(LanguageContext);
  return { language, gameLanguage, t: (message: string, values?: TranslationValues) => values ? translate(message, language, values) : translateRuntimeMessage(message, language) };
}
