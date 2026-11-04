import type { Language } from '../../domain/preferences';
import type { Player } from '../../domain/match';

const names: Record<string, [string, string]> = {
  abbasid_dynasty: ['Abbasid Dynasty', 'Dinastia Abássida'], ayyubids: ['Ayyubids', 'Aiúbidas'],
  byzantines: ['Byzantines', 'Bizantinos'], chinese: ['Chinese', 'Chineses'], delhi_sultanate: ['Delhi Sultanate', 'Sultanato de Delhi'],
  english: ['English', 'Ingleses'], french: ['French', 'Franceses'], holy_roman_empire: ['Holy Roman Empire', 'Sacro Império Romano'],
  japanese: ['Japanese', 'Japoneses'], jeanne_darc: ["Jeanne d’Arc", "Joana d’Arc"], malians: ['Malians', 'Malianos'],
  mongols: ['Mongols', 'Mongóis'], order_of_the_dragon: ['Order of the Dragon', 'Ordem do Dragão'],
  ottomans: ['Ottomans', 'Otomanos'], rus: ['Rus', 'Rus'], zhu_xis_legacy: ["Zhu Xi’s Legacy", 'Legado de Zhu Xi'],
  house_of_lancaster: ['House of Lancaster', 'Casa de Lancaster'], knights_templar: ['Knights Templar', 'Cavaleiros Templários'],
  golden_horde: ['Golden Horde', 'Horda Dourada'], jin_dynasty: ['Jin Dynasty', 'Dinastia Jin'],
  macedonian_dynasty: ['Macedonian Dynasty', 'Dinastia Macedônica'], scots: ['Scots', 'Escoceses'],
  sengoku_daimyo: ['Sengoku Daimyo', 'Daimiô Sengoku'], tughlaq_dynasty: ['Tughlaq Dynasty', 'Dinastia Tughlaq'], vikings: ['Vikings', 'Vikings'],
};

export function civilizationArtwork(player: Pick<Player, 'civilizationId' | 'civilization'>, language: Language = 'en') {
  const id = player.civilizationId ?? player.civilization;
  const entry = names[id];
  return { name: entry?.[language === 'pt-BR' ? 1 : 0] ?? player.civilization, units: [], emblem: `/aoe4/flags/${entry ? id : 'unknown'}.png` };
}

export function leagueBadge(level: string | null | undefined): string {
  return `/aoe4/badges/solo_${level && /^(bronze|silver|gold|platinum|diamond|conqueror)_[1-3]$/.test(level) ? level : 'unranked'}.png`;
}
