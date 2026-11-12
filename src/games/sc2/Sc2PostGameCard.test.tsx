// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createSc2Demo, sc2DemoSession } from './demo';
import { Sc2PostGameCard } from './Sc2PostGameCard';

afterEach(cleanup);

it('renders confirmed result, real duration without a guessed MMR gain', () => {
  const game = createSc2Demo('ranked');
  game.players[0].won = false;
  game.durationSeconds = 385;
  render(<Sc2PostGameCard game={game} session={sc2DemoSession} />);
  expect(screen.getByRole('region', { name: 'Resumo pós-partida' }).textContent).toContain('Derrota');
  expect(screen.getByText('6:25')).toBeTruthy();
  expect(screen.queryByText('Confrontos')).toBeNull();
  expect(screen.getByRole('region', { name: 'Sessão de StarCraft II' })).toBeTruthy();
  expect(screen.queryByText('4417')).toBeNull();
});
