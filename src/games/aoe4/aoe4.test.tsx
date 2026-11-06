// @vitest-environment happy-dom
import { beforeEach } from 'vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { defaultSettings } from '../../domain/settings';
import { ControlPanel } from '../../features/settings/ControlPanel';
import { createAoe4Demo } from './demo';
import { createDemoMatch } from '../aoe2/demo';
import { MatchOverlay } from '../../features/overlay/MatchOverlay';
import { projectRating } from '../../domain/rating';
import { existsSync } from 'node:fs';
import { civilizationArtwork, leagueBadge } from './catalog';

afterEach(() => { cleanup(); localStorage.clear(); });

it('isolates settings and rejects game changes during a match or writes from a stale game', async () => {
  const runtime = new BrowserRuntime();
  await runtime.configure({ ...defaultSettings, opacity: 0.55 });
  await runtime.selectGame('aoe4');
  expect((await runtime.read()).settings.opacity).toBe(0.9);
  await runtime.configure({ ...defaultSettings, opacity: 0.75 });
  await runtime.selectGame('aoe2-de');
  expect((await runtime.read()).settings.opacity).toBe(0.55);
  await expect(runtime.configure(defaultSettings, 'aoe4')).rejects.toThrow('jogo foi alterado');
  await expect(runtime.start(createAoe4Demo())).rejects.toThrow('jogo selecionado');
  await runtime.start(createDemoMatch('ranked'));
  await expect(runtime.selectGame('aoe4')).rejects.toThrow('encerre a demonstração');
  await runtime.finish();
  await runtime.selectGame('aoe4');
  expect((await runtime.read()).settings.opacity).toBe(0.75);
  expect((await new BrowserRuntime().read()).detection.config.gameId).toBe('aoe4');
});

it('switches the demo to Age 4 and restricts this iteration to ranked and quick-play 1v1', async () => {
  const runtime = new BrowserRuntime();
  render(<ControlPanel runtime={runtime} desktop={false} />);
  await screen.findByRole('button', { name: /Trocar jogo:/ });
  fireEvent.click(screen.getByRole('button', { name: /Trocar jogo:/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Age of Empires IV Early Access' }));
  await screen.findByRole('textbox', { name: 'ID ou link do perfil no AoE4 World' });
  fireEvent.click(screen.getByRole('tab', { name: 'Demonstração' }));
  expect(screen.queryByRole('combobox', { name: 'Formato da demonstração' })).toBeNull();
  expect(screen.queryByRole('option', { name: 'Skirmish' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar demonstração' }));
  await screen.findByRole('region', { name: 'Overlay Age of Empires IV' });
  expect((await runtime.read()).match?.players).toHaveLength(2);
  await waitFor(() => expect(screen.getByRole('button', { name: /Trocar jogo:/ })).toHaveProperty('disabled', true));
});

it('renders the reference strip with local assets and never applies the AoE2 Elo projection', () => {
  const match = createAoe4Demo();
  render(<MatchOverlay match={match} display={defaultSettings} />);
  expect(screen.getByText('#1430')).toBeTruthy();
  expect(screen.getByText('1421')).toBeTruthy();
  expect(screen.getByText('48.8%')).toBeTruthy();
  expect(screen.getByAltText('English')).toBeTruthy();
  expect(screen.queryByText(/Projeção Elo/)).toBeNull();
  expect(projectRating(match, match.players[0])).toBeNull();
  for (const player of match.players) {
    expect(existsSync(`public${civilizationArtwork(player).emblem}`)).toBe(true);
    expect(existsSync(`public${leagueBadge(player.rankLevel)}`)).toBe(true);
  }
  expect(leagueBadge('../../unsafe')).toBe('/aoe4/badges/solo_unranked.png');
});

beforeEach(() => { localStorage.setItem('matchdeck.preferences', JSON.stringify({ openLastGame: true })); });
