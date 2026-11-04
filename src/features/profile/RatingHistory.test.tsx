// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { RatingHistory } from './RatingHistory';
import { availableRatingPoints } from '../../domain/rating-history';

afterEach(cleanup);

it('orders valid records, removes duplicate timestamps and bounds the graph', () => {
  const points = Array.from({ length: 40 }, (_, i) => ({ recordedAt: new Date(Date.UTC(2026, 8, i + 1)).toISOString(), rating: 1000 + i }));
  const result = availableRatingPoints([
    ...points.reverse(), { recordedAt: 'invalid', rating: 99 },
    { recordedAt: '2026-11-01', rating: NaN }, { recordedAt: '2026-11-02', rating: -1 }, points[0],
  ]);
  expect(result).toHaveLength(30);
  expect(result[0].rating).toBe(1010);
  expect(result.at(-1)!.rating).toBe(1039);
});

it('shows actual values on pointer and keyboard focus without another request', () => {
  render(<RatingHistory label="MMR" board={{ leaderboardId: 'mmr', rating: 1100, wins: 1, losses: 1, ratingHistory: [
    { recordedAt: '2026-11-01T10:00:00Z', rating: 1200 },
    { recordedAt: '2026-11-02T10:00:00Z', rating: 1100 },
  ] }} />);
  const bars = within(screen.getByRole('group', { name: 'Registros de rating' })).getAllByRole('button');
  expect(screen.getByText('-100')).toBeTruthy();
  fireEvent.focus(bars[0]);
  expect(screen.getByText('1.200')).toBeTruthy();
  fireEvent.mouseEnter(bars[1]);
  expect(screen.getByText('1.100')).toBeTruthy();
});

it('handles an empty history and a single zero without inventing a trend', () => {
  const board = { leaderboardId: 'rm_solo', rating: null, wins: null, losses: null };
  const view = render(<RatingHistory label="Rating" board={board} />);
  expect(screen.getByText('Sem histórico de rating publicado para esta modalidade.')).toBeTruthy();
  view.rerender(<RatingHistory label="Rating" board={{ ...board, ratingHistory: [{ recordedAt: '2026-11-01T10:00:00Z', rating: 0 }] }} />);
  expect(view.container.querySelector('.rating-history-value strong')?.textContent).toBe('0');
  expect(screen.queryByTitle('Variação entre o primeiro e o último registro')).toBeNull();
});
