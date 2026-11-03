// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createDemoMatch } from '../../games/aoe2/demo';
import { MatchOverlay } from './MatchOverlay';
import { syncLabel } from '../../domain/match-labels';
import { defaultSettings } from '../../domain/settings';

afterEach(cleanup);

it('identifies quick rating and explains missing queue statistics', () => {
  const match = createDemoMatch('quick');
  render(<MatchOverlay match={match} />);
  expect(screen.getByText('Partida rápida · Mapa aleatório 1v1')).toBeTruthy();
  expect(screen.getAllByTitle('Rating de partidas rápidas')).toHaveLength(2);
  expect(screen.getAllByTitle(/A fonte não forneceu esta estatística/).length).toBeGreaterThan(0);
  expect(screen.getByText('Dados fictícios')).toBeTruthy();
  expect(syncLabel({ ...match, syncedAt: 'invalid' })).toBe('Horário de sincronização indisponível');
});

it('highlights the configured player and hides optional fields in both layouts', () => {
  const match = createDemoMatch('ranked');
  const display = { ...defaultSettings, showRating: false, showRecord: false, showWinRate: false };
  const view = render(<MatchOverlay match={match} display={display} />);
  expect(screen.getByText('Você')).toBeTruthy();
  expect(view.container.querySelector('.player.is-self')).toBeTruthy();
  expect(view.container.querySelector('.rating')).toBeNull();
  expect(view.container.querySelector('.player-results')).toBeNull();
  expect(view.container.querySelector('.win-rate')).toBeNull();
  view.rerender(<MatchOverlay match={match} layout="compact" display={display} />);
  expect(view.container.querySelector('.linear-player.is-self')).toBeTruthy();
  expect(view.container.querySelector('.linear-rating')).toBeNull();
  expect(view.container.querySelector('.linear-player')?.getAttribute('title')).not.toContain('120 V');
});

it('can hide estimates without hiding confirmed rating changes', () => {
  const match = createDemoMatch('ranked');
  const view = render(<MatchOverlay match={match} showProjection={false} />);
  expect(screen.queryByText(/Projeção Elo/)).toBeNull();
  expect(screen.queryByText(/~\+/)).toBeNull();
  match.finishedAt = '2026-11-02T12:00:00Z';
  match.players[0].ratingChange = 15;
  view.rerender(<MatchOverlay match={match} layout="compact" showProjection={false} />);
  expect(screen.getByText('+15')).toBeTruthy();
});
