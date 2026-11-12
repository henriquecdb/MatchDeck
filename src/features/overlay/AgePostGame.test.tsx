// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createPostGameDemo } from '../demo/post-game-demo';
import { PostGameCard } from './PostGameCard';
import { MatchOverlay } from './MatchOverlay';
import { defaultSettings } from '../../domain/settings';
import { DemoPanel } from '../demo/DemoPanel';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';

afterEach(() => { cleanup(); localStorage.clear(); });

it('shows only the opposing team in the Age 2 summary and honors session visibility', () => {
  const game = createPostGameDemo('aoe2-de', 'win', 'ranked', 2);
  const view = render(<PostGameCard game={game} />);
  const summary = screen.getByRole('region', { name: 'Resumo pós-partida' });
  expect(summary.textContent).toContain('Vitória');
  expect(summary.textContent).toContain('Player 3 × Player 4');
  expect(summary.textContent).not.toContain('Player 2');
  expect(screen.getByText('30:05')).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Sessão' })).toBeTruthy();
  view.rerender(<PostGameCard game={game} showSession={false} />);
  expect(screen.queryByRole('region', { name: 'Sessão' })).toBeNull();
});

it('renders the Age 4 vertical layout and adds an optional fictional session bar', () => {
  const game = createPostGameDemo('aoe4', 'loss', 'ranked', 1);
  const view = render(<MatchOverlay match={game} layout="stacked" />);
  expect(screen.getByRole('region', { name: 'Overlay Age of Empires IV' }).classList.contains('is-stacked')).toBe(true);
  expect(screen.getByRole('region', { name: 'Sessão' })).toBeTruthy();
  view.rerender(<MatchOverlay match={game} display={{ ...defaultSettings, showSession: false }} layout="compact" />);
  expect(screen.getByRole('region', { name: 'Overlay Age of Empires IV' }).classList.contains('is-stacked')).toBe(false);
  expect(screen.queryByRole('region', { name: 'Sessão' })).toBeNull();
});

it('starts and closes a post-game demo for each Age without storing fictional results', async () => {
  for (const gameId of ['aoe2-de', 'aoe4']) {
    const runtime = new BrowserRuntime();
    await runtime.selectGame(gameId);
    const state = await runtime.read();
    const view = render(<DemoPanel runtime={runtime} state={state} desktop={false} perform={action => action()} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Resultado de teste' }), { target: { value: 'draw' } });
    fireEvent.click(screen.getByRole('button', { name: 'Testar pós-partida' }));
    await waitFor(async () => expect((await runtime.read()).postGame?.game.players[0].draw).toBe(true));
    expect((await runtime.read()).lastSynced).toBeNull();
    await runtime.finish();
    expect((await runtime.read()).postGame).toBeNull();
    view.unmount();
  }
});
