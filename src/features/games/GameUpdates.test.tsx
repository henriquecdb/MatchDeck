// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ControlPanel } from '../settings/ControlPanel';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';

const counts = vi.hoisted(() => ({ mounted: 0, unmounted: 0 }));
vi.mock('../updates/UpdatePanel', async () => {
  const { useEffect } = await import('react');
  return { UpdatePanel: ({ visible }: { visible: boolean }) => {
    useEffect(() => { counts.mounted++; return () => { counts.unmounted++; }; }, []);
    return <div data-testid="update-visibility">{String(visible)}</div>;
  } };
});
afterEach(() => { cleanup(); localStorage.clear(); counts.mounted = 0; counts.unmounted = 0; });

it('keeps update checking mounted on the game library and across game navigation', async () => {
  render(<ControlPanel runtime={new BrowserRuntime()} desktop={false} />);
  await screen.findByRole('heading', { name: 'Escolha seu jogo' });
  await waitFor(() => expect(counts.mounted).toBe(1));
  expect(screen.getByTestId('update-visibility').textContent).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: 'Age of Empires IV Integração em teste' }));
  fireEvent.click(await screen.findByRole('tab', { name: 'Atualizações' }));
  await waitFor(() => expect(screen.getByTestId('update-visibility').textContent).toBe('true'));
  fireEvent.click(screen.getByRole('button', { name: 'Jogos' }));
  await screen.findByRole('heading', { name: 'Escolha seu jogo' });
  expect(screen.getByTestId('update-visibility').textContent).toBe('false');
  expect(counts.mounted).toBe(1);
  expect(counts.unmounted).toBe(0);
});
