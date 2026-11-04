import { useI18n } from '../../i18n/LanguageProvider';
import { useRef, type KeyboardEvent } from 'react';

export const appTabs = [
  { id: 'match', label: 'Partida' },
  { id: 'profile', label: 'Perfil' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'demo', label: 'Demonstração' },
  { id: 'updates', label: 'Atualizações' },
  { id: 'settings', label: 'Configurações' },
  { id: 'diagnostics', label: 'Diagnóstico' },
] as const;

export type AppTab = typeof appTabs[number]['id'];

const iconPaths: Record<AppTab, string> = {
  profile: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  match: 'M6 4h12v4a6 6 0 0 1-12 0V4Zm0 1H3v3a4 4 0 0 0 4 4m11-7h3v3a4 4 0 0 1-4 4m-5 2v6m-4 0h8',
  overlay: 'M3 4h18v13H3V4Zm5 17h8m-4-4v4M6 7h6v5H6V7Z',
  demo: 'm9 5 11 7-11 7V5Z',
  updates: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-8 0v6',
  diagnostics: 'M4 3h16v18H4V3Zm4 6h8m-8 4h8m-8 4h4',
};

export function AppTabs({ active, onChange }: { active: AppTab; onChange(tab: AppTab): void }) {
  const { t } = useI18n();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function navigate(event: KeyboardEvent, index: number) {
    let next: number;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % appTabs.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + appTabs.length - 1) % appTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = appTabs.length - 1;
    else return;
    event.preventDefault();
    onChange(appTabs[next].id);
    buttons.current[next]?.focus();
  }

  return <nav id="app-navigation" className="app-tabs" role="tablist" aria-orientation="vertical" aria-label={t('Funcionalidades')}>
    {appTabs.map((tab, index) => <button key={tab.id} ref={element => { buttons.current[index] = element; }}
      role="tab" id={`tab-${tab.id}`} aria-controls={`panel-${tab.id}`} aria-selected={active === tab.id}
      aria-label={t(tab.label)} title={t(tab.label)} tabIndex={active === tab.id ? 0 : -1} onClick={() => onChange(tab.id)} onKeyDown={event => navigate(event, index)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[tab.id]} /></svg><span className="navigation-label">{t(tab.label)}</span></button>)}
  </nav>;
}
