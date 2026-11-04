import { useEffect, useRef, useState } from 'react';
import { gameIntegration, installedGames } from '../../games/registry';
import { useI18n } from '../../i18n/LanguageProvider';
import { GameIcon } from './GameIcon';

export function GamePicker({ gameId, locked, busy, onSelect }: { gameId: string; locked: boolean; busy: boolean; onSelect(gameId: string): Promise<void> }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const current = gameIntegration(gameId)!;
  const available = open && !locked && !busy;
  useEffect(() => { trigger.current?.focus(); }, []);
  useEffect(() => { if (locked || busy) setOpen(false); }, [locked, busy]);
  useEffect(() => {
    if (restoreFocus.current && !open && !busy) { restoreFocus.current = false; trigger.current?.focus(); }
  }, [open, busy]);

  useEffect(() => {
    if (!available) return;
    first.current?.focus();
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [available]);

  async function select(id: string) {
    restoreFocus.current = true;
    setOpen(false);
    await onSelect(id);
  }

  return <div className="game-picker" ref={container}>
    <button className="game-picker-trigger" ref={trigger} disabled={locked || busy} onClick={() => setOpen(value => !value)} aria-expanded={available} aria-controls="game-picker-choices" aria-label={t('Trocar jogo: {0}', { 0: current.shortName })} title={locked ? t('Encerre a partida ou demonstração para trocar de jogo.') : t('Trocar jogo')}>
      <GameIcon key={gameId} icon={current.icon} gameId={gameId} />
      <span className="navigation-label"><strong>{current.shortName}</strong><small>{t(busy ? 'Carregando…' : 'Trocar jogo')}</small></span>
      <span className="picker-chevron navigation-label" aria-hidden="true">⌄</span>
    </button>
    {available && <div className="game-picker-choices" id="game-picker-choices" role="group" aria-label={t('Escolher jogo')}>
      {installedGames.map((game, index) => <button key={game.id} ref={index === 0 ? first : undefined} aria-pressed={game.id === gameId} onClick={() => void select(game.id)}>
        <GameIcon icon={game.icon} gameId={game.id} /><span><strong>{game.shortName}</strong><small>{t(game.subtitle)}</small></span>
      </button>)}
    </div>}
  </div>;
}
