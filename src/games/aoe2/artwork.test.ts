import { expect, it } from 'vitest';
import { playerColor, unitArtwork } from './artwork';
import { createDemoMatch } from './demo';

it('selects artwork by civilization and accepts valid game colors only', () => {
  const player = createDemoMatch('ranked').players[0];
  expect(unitArtwork(player)?.image).toBe('/units/ThrowingAxeman.png');
  expect(playerColor(player)).toBe('#405BFF');
  expect(playerColor({ ...player, colorHex: 'url(invalid)', color: 2 })).toBe('#ff3038');
  expect(playerColor({ ...player, colorHex: null, color: null })).toBe('#9aa6b5');
  expect(unitArtwork({ ...player, civilizationId: 'unknown', uniqueUnits: [] })).toBeUndefined();
});
