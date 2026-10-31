import { expect, it } from 'vitest';
import { createDemoMatch } from '../games/aoe2/demo';
import { projectRating } from './rating';

it('projects standard Elo for equal and unequal 1v1 opponents', () => {
  const match = createDemoMatch('ranked');
  match.players[0].rating = 1200;
  match.players[1].rating = 1200;
  expect(projectRating(match, match.players[0])).toEqual({ win: 16, loss: -16 });
  match.players[1].rating = 1600;
  expect(projectRating(match, match.players[0])).toEqual({ win: 29, loss: -3 });
  expect(projectRating(match, match.players[1])).toEqual({ win: 3, loss: -29 });
});

it('does not estimate unsupported queues, teams, or missing ratings', () => {
  const match = createDemoMatch('ranked');
  expect(projectRating({ ...match, queueId: 'rm_team' }, match.players[0])).toBeNull();
  expect(projectRating({ ...match, queueId: undefined }, match.players[0])).toBeNull();
  match.players[1].rating = null;
  expect(projectRating(match, match.players[0])).toBeNull();
  match.players[1].rating = NaN;
  expect(projectRating(match, match.players[0])).toBeNull();
});
