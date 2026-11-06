import type { Player } from '../../domain/match';
import type { Language } from '../../domain/preferences';
const races: Record<string, [string, string, string]> = { terran: ['Terran','Terran','T'], protoss: ['Protoss','Protoss','P'], zerg: ['Zerg','Zerg','Z'], random: ['Random','Aleatório','R'] };
export function raceArtwork(player: Pick<Player, 'civilizationId' | 'civilization'>, language: Language = 'en') {
  const id = (player.civilizationId ?? player.civilization).toLowerCase();
  const race = races[id];
  return { name: race?.[language === 'pt-BR' ? 1 : 0] ?? (language === 'pt-BR' ? 'Raça indisponível' : 'Race unavailable'), units: [], emblem: '/sc2/races/' + (race ? id + '.png' : 'unknown.svg') };
}
