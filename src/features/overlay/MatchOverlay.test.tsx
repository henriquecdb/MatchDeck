// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createDemoMatch } from '../../games/aoe2/demo';
import { MatchOverlay } from './MatchOverlay';
import { syncLabel } from '../../domain/match-labels';

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
