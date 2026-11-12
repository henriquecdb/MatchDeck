// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createSc2Demo, sc2DemoSession } from './demo';
import { Sc2PostGameCard } from './Sc2PostGameCard';

afterEach(cleanup);

it('renders confirmed result, real duration and canonical head-to-head without a guessed MMR gain', () => {
  const game = createSc2Demo('ranked');
  game.players[0].won = false;
  game.durationSeconds = 385;
  render(<Sc2PostGameCard game={game} opponentId="1-S2-1-99" session={sc2DemoSession} history={{ profileId: 42, matches: [
    { ...sc2DemoSession.matches[0], opponentId: '1-S2-1-99', won: false },
    { ...sc2DemoSession.matches[0], id: 'other', opponentId: '1-S2-2-99', won: true },
  ] }} />);
  expect(screen.getByRole('region', { name: 'Resumo pós-partida' }).textContent).toContain('Derrota');
  expect(screen.getByText('6:25')).toBeTruthy();
  expect(screen.getByText('0V · 1D')).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Sessão de StarCraft II' })).toBeTruthy();
  expect(screen.queryByText('4417')).toBeNull();
});
