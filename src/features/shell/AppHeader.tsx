import metadata from '../../../package.json';
import { useI18n } from '../../i18n/LanguageProvider';

export function AppHeader({ status, sessionActive = false, onGames, locked = false }: { status?: string; sessionActive?: boolean; onGames?(): void; locked?: boolean }) {
  const { t } = useI18n();
  return <header className="app-heading">
    <div className="app-brand"><h1>Match<span>Deck</span></h1><small>v{metadata.version}</small></div>
    <div className="heading-actions">
      {onGames && <button className="library-link" disabled={locked} onClick={onGames} title={locked ? t('Encerre a partida ou demonstração para trocar de jogo.') : undefined}>{t('Jogos')}</button>}
      {status && <span className={`connection-badge${sessionActive ? ' is-active' : ''}`}>{status}</span>}
    </div>
  </header>;
}
