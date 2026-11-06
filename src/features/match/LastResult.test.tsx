// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createDemoMatch } from '../../games/aoe2/demo';
import { LastResult } from './LastResult';

afterEach(cleanup);
it('shows confirmed wins and rating changes without inferring unknown results', () => {
  const match = createDemoMatch('ranked');
  match.source = 'live'; match.finishedAt = '2026-11-03T10:00:00Z'; match.players[0].won = true; match.players[0].ratingChange = 17;
  render(<LastResult match={match} />);
  expect(screen.getByRole('region', { name: 'Último resultado confirmado' })).toBeTruthy();
  expect(screen.getAllByRole('listitem')[0].textContent).toContain('Jogador 1: vitória');
  expect(screen.getByText('vitória').tagName).toBe('STRONG');
  expect(screen.getByText('vitória').className).toBe('match-result-win');
  expect(screen.getByText(/Jogador 2: resultado não informado/)).toBeTruthy();
  expect(screen.getByText(/Variação \+17/)).toBeTruthy();
});
