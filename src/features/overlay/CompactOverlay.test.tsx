// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createDemoMatch } from '../../games/aoe2/demo';
import { MatchOverlay } from './MatchOverlay';
import { matchTeams } from '../../domain/teams';

afterEach(cleanup);

it('does not show detailed cards for a known team queue with only two reported players', () => {
  const match = { ...createDemoMatch('ranked'), queueId: 'rm_team' };
  const { container } = render(<MatchOverlay match={match} layout="detailed" />);
  expect(container.querySelector('.layout-detailed')).toBeNull();
  expect(container.querySelector('.linear-overlay.is-stacked')).not.toBeNull();
});

it.each([2, 3, 4] as const)('uses vertical compact when detailed is preferred in a team demo of size %s', size => {
  const { container } = render(<MatchOverlay match={createDemoMatch('ranked', size)} layout="detailed" />);
  expect(container.querySelector('.layout-detailed')).toBeNull();
  expect(container.querySelector('.linear-overlay.is-stacked')).not.toBeNull();
  expect(container.querySelectorAll('.linear-player')).toHaveLength(size * 2);
});

it.each(['compact', 'stacked'] as const)('keeps both players without team headings or timestamps in %s duels', layout => {
  const match = { ...createDemoMatch('ranked'), syncedAt: '2026-11-02T21:03:33Z' };
  const { container } = render(<MatchOverlay match={match} layout={layout} />);
  expect(container.querySelectorAll('.linear-player')).toHaveLength(2);
  expect(screen.queryByRole('heading')).toBeNull();
  expect(screen.queryByText(/Sincronizado em/)).toBeNull();
  expect(container.querySelector('.is-stacked') !== null).toBe(layout === 'stacked');
});

it.each([2, 3, 4] as const)('demonstrates %sv%s with preserved teams and all player colors', size => {
  const match = createDemoMatch('ranked', size);
  expect(matchTeams(match).map(team => team.players.length)).toEqual([size, size]);
  expect(match.queueId).toBe('rm_team');
  expect(new Set(match.players.map(player => player.color)).size).toBe(size * 2);
  const { container } = render(<MatchOverlay match={match} layout="stacked" />);
  expect(container.querySelectorAll('.linear-player')).toHaveLength(size * 2);
  expect(screen.getByRole('heading', { name: 'Equipe 1' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Equipe 2' })).toBeTruthy();
});
