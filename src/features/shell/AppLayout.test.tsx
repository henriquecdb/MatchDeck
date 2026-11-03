// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { ControlPanel } from '../settings/ControlPanel';
import { createDemoMatch } from '../../games/aoe2/demo';

afterEach(() => { cleanup(); localStorage.clear(); });

it('remembers collapsed navigation without changing an active match and supports vertical keyboard navigation', async () => {
  const runtime = new BrowserRuntime();
  await runtime.start(createDemoMatch('ranked'));
  const snapshot = (await runtime.read()).match;
  const view = render(<ControlPanel runtime={runtime} desktop={false} />);
  const collapse = await screen.findByRole('button', { name: 'Recolher navegação' });
  expect(screen.getByRole('tablist').getAttribute('aria-orientation')).toBe('vertical');
  fireEvent.click(collapse);
  expect(screen.getByRole('button', { name: 'Expandir navegação' }).getAttribute('aria-expanded')).toBe('false');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Partida' }), { key: 'ArrowDown' });
  expect(screen.getByRole('tab', { name: 'Overlay' }).getAttribute('aria-selected')).toBe('true');
  expect((await runtime.read()).match).toEqual(snapshot);
  view.unmount();
  render(<ControlPanel runtime={runtime} desktop={false} />);
  await screen.findByRole('button', { name: 'Expandir navegação' });
  fireEvent.click(screen.getByRole('button', { name: 'Expandir navegação' }));
  await waitFor(() => expect(localStorage.getItem('matchdeck.navigationCollapsed')).toBe('false'));
});
