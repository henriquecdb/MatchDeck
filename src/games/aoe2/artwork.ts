import catalogData from './unit-catalog.json';
import type { Player } from '../../domain/match';

interface UnitArtwork {
  name: string;
  units: string[];
  image: string;
  emblem: string;
}

const catalog: Record<string, UnitArtwork> = catalogData;
const playerColors = ['#405bff', '#ff3038', '#35d466', '#ffe14b', '#31d9e5', '#ed64b8', '#a3aab5', '#ff963f'];

export function unitArtwork(player: Player): UnitArtwork | undefined {
  const key = (player.civilizationId ?? player.civilization).toLowerCase();
  return catalog[key] ?? Object.values(catalog).find(entry => entry.units.some(unit => player.uniqueUnits.includes(unit)));
}

export function playerColor(player: Player): string {
  if (player.colorHex && /^#[0-9a-f]{6}$/i.test(player.colorHex)) return player.colorHex;
  return player.color ? playerColors[player.color - 1] ?? '#9aa6b5' : '#9aa6b5';
}
