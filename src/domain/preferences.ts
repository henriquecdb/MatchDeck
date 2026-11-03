export interface AppPreferences {
  launchMinimized: boolean;
  closeAction: 'ask' | 'minimize' | 'exit';
  onboardingComplete: boolean;
  autoUpdate: boolean;
}

export const defaultPreferences: AppPreferences = { launchMinimized: false, closeAction: 'ask', onboardingComplete: false, autoUpdate: false };

export function parsePreferences(value: unknown): AppPreferences {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { launchMinimized: candidate.launchMinimized === true, closeAction: candidate.closeAction === 'minimize' || candidate.closeAction === 'exit' ? candidate.closeAction : 'ask', onboardingComplete: candidate.onboardingComplete === true, autoUpdate: candidate.autoUpdate === true };
}
