import { useRef, type KeyboardEvent } from 'react';

export const appTabs = [
  { id: 'match', label: 'Partida' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'demo', label: 'Demonstração' },
  { id: 'updates', label: 'Atualizações' },
  { id: 'settings', label: 'Configurações' },
  { id: 'diagnostics', label: 'Diagnóstico' },
] as const;

export type AppTab = typeof appTabs[number]['id'];

export function AppTabs({ active, onChange }: { active: AppTab; onChange(tab: AppTab): void }) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function navigate(event: KeyboardEvent, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % appTabs.length;
    else if (event.key === 'ArrowLeft') next = (index + appTabs.length - 1) % appTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = appTabs.length - 1;
    else return;
    event.preventDefault();
    onChange(appTabs[next].id);
    buttons.current[next]?.focus();
  }

  return <nav className="app-tabs" role="tablist" aria-label="Funcionalidades">
    {appTabs.map((tab, index) => <button key={tab.id} ref={element => { buttons.current[index] = element; }}
      role="tab" id={`tab-${tab.id}`} aria-controls={`panel-${tab.id}`} aria-selected={active === tab.id}
      tabIndex={active === tab.id ? 0 : -1} onClick={() => onChange(tab.id)} onKeyDown={event => navigate(event, index)}>{tab.label}</button>)}
  </nav>;
}
