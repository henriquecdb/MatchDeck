import { expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { gameIntegration, installedGames } from './registry';
import catalog from './aoe2/unit-catalog.json';
import labels from './aoe2/pt-BR.json';
import { createDemoMatch } from './aoe2/demo';

it('registers only installed integrations and preserves explicit capability limits', () => {
  expect(installedGames.map(game => game.id)).toEqual(['aoe2-de', 'aoe4', 'sc2']);
  expect(gameIntegration('sc2')?.capabilities).toMatchObject({ liveMultiplayer: true, offline: false });
  expect(gameIntegration('unknown')).toBeUndefined();
  expect(gameIntegration('aoe2-de')?.capabilities).toMatchObject({ offline: false, customLobbies: 'unverified' });
  expect(gameIntegration('aoe2-de')?.artwork(createDemoMatch('ranked').players[0])?.units[0]).toBe('Throwing Axeman');
  expect(gameIntegration('aoe2-de')?.artwork(createDemoMatch('ranked').players[0], 'pt-BR')?.units[0]).toBe('Lançador de Machado');
});

it('covers all bundled civilizations with localized labels and existing image assets', () => {
  expect(Object.keys(labels).sort()).toEqual(Object.keys(catalog).sort());
  for (const [id, value] of Object.entries(catalog)) {
    const translated = labels[id as keyof typeof labels];
    expect(translated.units).toHaveLength(value.units.length);
    expect([translated.name, ...translated.units].every(label => label.trim() && !label.includes('<'))).toBe(true);
    expect(existsSync(`public${value.image}`)).toBe(true);
    expect(existsSync(`public${value.emblem}`)).toBe(true);
  }
});
