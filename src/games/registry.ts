import { createAoe4Demo } from './aoe4/demo';
import { civilizationArtwork } from './aoe4/catalog';
import { createDemoMatch, type DemoTeamSize } from './aoe2/demo';
import { unitArtwork } from './aoe2/artwork';
import type { MatchMode, Player } from '../domain/match';
import games from './games.json';
import type { Language } from '../domain/preferences';

export interface FactionArtwork { name: string; units: string[]; image?: string; emblem?: string; }
export interface GameIntegration {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  icon: string;
  experimental: boolean;
  capabilities: { liveMultiplayer: boolean; offline: boolean; customLobbies: 'unverified' | 'supported'; };
  demo(mode: MatchMode, teamSize?: DemoTeamSize): ReturnType<typeof createDemoMatch>;
  artwork(player: Pick<Player, 'civilizationId' | 'civilization' | 'uniqueUnits'>, language?: Language): FactionArtwork | undefined;
}

const integrations: GameIntegration[] = [{ ...games[0], capabilities: { ...games[0].capabilities, customLobbies: 'unverified' }, demo: createDemoMatch, artwork: unitArtwork }, { ...games[1], capabilities: { ...games[1].capabilities, customLobbies: 'unverified' }, demo: createAoe4Demo, artwork: civilizationArtwork }];
export function gameIntegration(gameId: string): GameIntegration | undefined { return integrations.find(game => game.id === gameId); }
export const installedGames = integrations.map(({ id, name, shortName, subtitle, icon, experimental, capabilities }) => ({ id, name, shortName, subtitle, icon, experimental, capabilities }));
