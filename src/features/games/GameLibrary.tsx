import { installedGames } from '../../games/registry';
import { useI18n } from '../../i18n/LanguageProvider';
import { GameIcon } from './GameIcon';

interface Props {
  busy: boolean;
  openLastGame: boolean;
  onSelect(gameId: string): void;
  onOpenLastChange(value: boolean): void;
}

export function GameLibrary({ busy, openLastGame, onSelect, onOpenLastChange }: Props) {
  const { t } = useI18n();
  return <section className="game-library" aria-label={t('Escolha seu jogo')}>
    <h2>{t('Escolha seu jogo')}</h2>
    <div className="game-cards">{installedGames.map(game => <button className="game-card" key={game.id} disabled={busy} onClick={() => onSelect(game.id)}>
      <GameIcon icon={game.icon} gameId={game.id} />
      <span className="game-card-name">{game.shortName}</span>
      <span className="game-card-subtitle">{t(game.subtitle)}</span>
    </button>)}</div>
    <label className="open-last-game"><input type="checkbox" checked={openLastGame} disabled={busy} onChange={event => onOpenLastChange(event.target.checked)} /> {t('Abrir no último jogo usado')}</label>
    <p className="library-hint">{t('Seus perfis e ajustes ficam separados por jogo.')}</p>
  </section>;
}
