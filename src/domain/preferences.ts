export type Language = 'pt-BR' | 'en';

export interface AppPreferences {
  language: Language;
  gameLanguage: Language;
  launchMinimized: boolean;
  closeAction: 'ask' | 'minimize' | 'exit';
  onboardingComplete: boolean;
  autoUpdate: boolean;
}

export const defaultPreferences: AppPreferences = { language: 'pt-BR', gameLanguage: 'en', launchMinimized: false, closeAction: 'ask', onboardingComplete: false, autoUpdate: false };

export function parsePreferences(value: unknown): AppPreferences {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { language: candidate.language === 'en' ? 'en' : 'pt-BR', gameLanguage: candidate.gameLanguage === 'pt-BR' ? 'pt-BR' : 'en', launchMinimized: candidate.launchMinimized === true, closeAction: candidate.closeAction === 'minimize' || candidate.closeAction === 'exit' ? candidate.closeAction : 'ask', onboardingComplete: candidate.onboardingComplete === true, autoUpdate: candidate.autoUpdate === true };
}
