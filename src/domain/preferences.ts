import { defaultHotkeys, parseHotkeys, type Hotkeys } from './hotkeys';

export type Language = 'pt-BR' | 'en';

export interface AppPreferences {
  hotkeys: Hotkeys;
  language: Language;
  gameLanguage: Language;
  launchMinimized: boolean;
  closeAction: 'ask' | 'minimize' | 'exit';
  onboardingComplete: boolean;
  autoUpdate: boolean;
}

export const defaultPreferences: AppPreferences = { hotkeys: defaultHotkeys, language: 'pt-BR', gameLanguage: 'en', launchMinimized: false, closeAction: 'ask', onboardingComplete: false, autoUpdate: false };

export function parsePreferences(value: unknown): AppPreferences {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { hotkeys: parseHotkeys(candidate.hotkeys), language: candidate.language === 'en' ? 'en' : 'pt-BR', gameLanguage: candidate.gameLanguage === 'pt-BR' ? 'pt-BR' : 'en', launchMinimized: candidate.launchMinimized === true, closeAction: candidate.closeAction === 'minimize' || candidate.closeAction === 'exit' ? candidate.closeAction : 'ask', onboardingComplete: candidate.onboardingComplete === true, autoUpdate: candidate.autoUpdate === true };
}
