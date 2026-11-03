import { createDemoMatch } from './aoe2/demo';
import { unitArtwork } from './aoe2/artwork';
import type { MatchMode, Player } from '../domain/match';
import games from './games.json';
import type { Language } from '../domain/preferences';

export interface FactionArtwork { name: string; units: string[]; image?: string; emblem?: string; }
export interface GameIntegration {
  id: string;
  name: string;
  capabilities: { liveMultiplayer: boolean; offline: boolean; customLobbies: 'unverified' | 'supported'; };
  demo(mode: MatchMode): ReturnType<typeof createDemoMatch>;
  artwork(player: Player, language?: Language): FactionArtwork | undefined;
}

const integrations: GameIntegration[] = [{ ...games[0], capabilities: { ...games[0].capabilities, customLobbies: 'unverified' }, demo: createDemoMatch, artwork: unitArtwork }];
export function gameIntegration(gameId: string): GameIntegration | undefined { return integrations.find(game => game.id === gameId); }
export const installedGames = integrations.map(({ id, name, capabilities }) => ({ id, name, capabilities }));
