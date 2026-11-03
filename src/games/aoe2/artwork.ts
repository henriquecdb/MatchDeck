import catalogData from './unit-catalog.json';
import type { Player } from '../../domain/match';
import translations from './pt-BR.json';
import type { Language } from '../../domain/preferences';

interface UnitArtwork {
  name: string;
  units: string[];
  image: string;
  emblem: string;
}

const catalog: Record<string, UnitArtwork> = catalogData;
const localized: Record<string, { name: string; units: string[] }> = translations;

export function unitArtwork(player: Player, language: Language = 'en'): UnitArtwork | undefined {
  const key = (player.civilizationId ?? player.civilization).toLowerCase();
  const entry = catalog[key] ?? Object.values(catalog).find(entry => entry.units.some(unit => player.uniqueUnits.includes(unit)));
  if (!entry) return undefined;
  const translated = localized[key] ?? Object.entries(catalog).map(([id, value]) => value === entry ? localized[id] : undefined).find(Boolean);
  return { ...entry, ...(language === 'pt-BR' ? translated : undefined) };
}

export { playerColor } from '../../domain/player-color';
