import { expect, it } from 'vitest';
import { createDemoMatch } from '../games/aoe2/demo';
import { matchTeams } from './teams';

it('keeps real teams together even when participants arrive interleaved', () => {
  const match = createDemoMatch('ranked');
  match.queueId = 'rm_team';
  match.players = Array.from({ length: 8 }, (_, index) => ({ ...match.players[index % 2], id: `${index}`, teamId: index % 2 + 1 }));
  const teams = matchTeams(match);
  expect(teams.map(team => team.players.length)).toEqual([4, 4]);
  expect(teams[0].players.map(player => player.id)).toEqual(['0', '2', '4', '6']);
});

it('supports old snapshots without inventing team membership', () => {
  const match = createDemoMatch('ranked');
  match.players = match.players.map(player => ({ ...player, teamId: undefined }));
  expect(matchTeams(match).map(team => team.players.length)).toEqual([1, 1]);
  match.queueId = 'rm_team';
  expect(matchTeams(match)).toEqual([{ id: 'players', label: 'Jogadores', players: match.players }]);
});
