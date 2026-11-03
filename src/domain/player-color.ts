import type { Player } from './match';
const colors = ['#405bff', '#ff3038', '#35d466', '#ffe14b', '#31d9e5', '#ed64b8', '#a3aab5', '#ff963f'];
export function playerColor(player: Player): string {
  if (player.colorHex && /^#[0-9a-f]{6}$/i.test(player.colorHex)) return player.colorHex;
  return player.color ? colors[player.color - 1] ?? '#9aa6b5' : '#9aa6b5';
}
