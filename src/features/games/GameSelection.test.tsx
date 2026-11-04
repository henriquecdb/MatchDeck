// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { ControlPanel } from '../settings/ControlPanel';
import { createAoe4Demo } from '../../games/aoe4/demo';
import { defaultPreferences, parsePreferences } from '../../domain/preferences';
import { GamePicker } from './GamePicker';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it('opens the library by default and remembers the startup preference and last selected game', async () => {
  const runtime = new BrowserRuntime();
  const select = vi.spyOn(runtime, 'selectGame');
  const view = render(<ControlPanel runtime={runtime} desktop={false} />);
  await screen.findByRole('heading', { name: 'Escolha seu jogo' });
  expect(screen.queryByRole('tab')).toBeNull();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Abrir no último jogo usado' }));
  await waitFor(() => expect(screen.getByRole('checkbox')).toHaveProperty('disabled', false));
  fireEvent.click(screen.getByRole('button', { name: 'Age of Empires IV Integração em teste' }));
  await screen.findByRole('tab', { name: 'Partida' });
  expect(select).toHaveBeenCalledWith('aoe4');
  expect((await runtime.read()).preferences.openLastGame).toBe(true);
  view.unmount();
  render(<ControlPanel runtime={new BrowserRuntime()} desktop={false} />);
  await screen.findByRole('button', { name: 'Trocar jogo: Age of Empires IV' });
  expect(screen.queryByRole('heading', { name: 'Escolha seu jogo' })).toBeNull();
});

it('returns to the library and keeps the library default when remembering is disabled', async () => {
  const runtime = new BrowserRuntime();
  const view = render(<ControlPanel runtime={runtime} desktop={false} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Age of Empires II Definitive Edition' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Jogos' }));
  await screen.findByRole('heading', { name: 'Escolha seu jogo' });
  view.unmount();
  render(<ControlPanel runtime={new BrowserRuntime()} desktop={false} />);
  await screen.findByRole('heading', { name: 'Escolha seu jogo' });
  expect(parsePreferences({}).openLastGame).toBe(false);
});

it('keeps active sessions visible and locks game changes until the demo finishes', async () => {
  const runtime = new BrowserRuntime();
  await runtime.selectGame('aoe4');
  await runtime.start(createAoe4Demo());
  render(<ControlPanel runtime={runtime} desktop={false} />);
  expect(await screen.findByRole('button', { name: 'Trocar jogo: Age of Empires IV' })).toHaveProperty('disabled', true);
  expect(screen.getByRole('button', { name: 'Jogos' })).toHaveProperty('disabled', true);
  await act(async () => runtime.finish());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Trocar jogo: Age of Empires IV' })).toHaveProperty('disabled', false));
});

it('closes the picker on Escape and returns focus to its trigger', () => {
  render(<GamePicker gameId="aoe2-de" locked={false} busy={false} onSelect={vi.fn()} />);
  const trigger = screen.getByRole('button', { name: 'Trocar jogo: Age of Empires II' });
  fireEvent.click(trigger);
  expect(screen.getByRole('group', { name: 'Escolher jogo' })).toBeTruthy();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('group')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it('stops waiting detection before returning to the library', async () => {
  const runtime = new BrowserRuntime();
  const state = await runtime.read();
  state.preferences = { ...defaultPreferences, openLastGame: true };
  state.detection.config.enabled = true;
  state.detection.config.profile = { profileId: 42, name: 'Player' };
  vi.spyOn(runtime, 'read').mockResolvedValue(state);
  vi.spyOn(runtime, 'initialized').mockResolvedValue();
  const configure = vi.spyOn(runtime, 'configureDetection').mockResolvedValue();
  render(<ControlPanel runtime={runtime} desktop />);
  fireEvent.click(await screen.findByRole('button', { name: 'Jogos' }));
  await screen.findByRole('heading', { name: 'Escolha seu jogo' });
  expect(configure).toHaveBeenCalledWith(false, '42');
});
