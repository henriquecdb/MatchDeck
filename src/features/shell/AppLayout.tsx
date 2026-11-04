import { useEffect, useState, type ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { GamePicker } from '../games/GamePicker';
import { useI18n } from '../../i18n/LanguageProvider';
import { AppTabs, type AppTab } from './AppTabs';

const navigationKey = 'matchdeck.navigationCollapsed';

function initialCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(navigationKey);
    if (saved !== null) return saved === 'true';
  } catch {}
  return window.matchMedia('(max-width: 760px)').matches;
}

export function AppLayout({ active, onChange, status, sessionActive, gameId, gameLocked, switchingGame, onSelectGame, onGames, children }: {
  active: AppTab; onChange(tab: AppTab): void; status: string; sessionActive: boolean; gameId: string; gameLocked: boolean; switchingGame: boolean; onSelectGame(gameId: string): Promise<void>; onGames(): void; children: ReactNode;
}) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const resize = () => {
      try { if (localStorage.getItem(navigationKey) !== null) return; } catch {}
      setCollapsed(query.matches);
    };
    query.addEventListener('change', resize);
    return () => query.removeEventListener('change', resize);
  }, []);
  function toggle() {
    setCollapsed(value => {
      try { localStorage.setItem(navigationKey, String(!value)); } catch {}
      return !value;
    });
  }
  return <main className="app-shell">
    <AppHeader status={status} sessionActive={sessionActive} onGames={onGames} locked={gameLocked || switchingGame} />
    <div className={`app-frame${collapsed ? ' is-nav-collapsed' : ''}`}>
      <aside className="app-sidebar" aria-label={t('Navegação principal')}>
        <button className="navigation-toggle" onClick={toggle} aria-label={t(collapsed ? 'Expandir navegação' : 'Recolher navegação')} aria-expanded={!collapsed} aria-controls="app-navigation" title={t(collapsed ? 'Expandir navegação' : 'Recolher navegação')}><span aria-hidden="true">{collapsed ? '›' : '‹'}</span><span className="navigation-label">{t('Recolher')}</span></button>
        <GamePicker gameId={gameId} locked={gameLocked} busy={switchingGame} onSelect={onSelectGame} />
        <AppTabs active={active} onChange={onChange} />
      </aside>
      <div className="app-content">{children}</div>
    </div>
  </main>;
}
