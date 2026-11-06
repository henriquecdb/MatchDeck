// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { BrowserRuntime } from '../../infrastructure/browser-runtime';
import { LatestResult } from './LatestResult';
afterEach(() => { cleanup(); localStorage.clear(); });
it.each(['aoe2-de', 'aoe4', 'sc2'])('loads a confirmed result for the linked %s profile without enabling detection', async gameId => {
 const runtime = new BrowserRuntime();
 const state = await runtime.read();
 state.detection.config = { gameId, enabled: false, profile: { profileId: 42, name: 'Nova' } };
 const sync = vi.spyOn(runtime, 'syncLatest').mockResolvedValue();
 const { rerender } = render(<LatestResult runtime={runtime} state={state} active />);
 await waitFor(() => expect(sync).toHaveBeenCalledWith(true));
 rerender(<LatestResult runtime={runtime} state={state} active />);
 expect(sync).toHaveBeenCalledTimes(1);
 expect(state.detection.config.enabled).toBe(false);
});
it('does not query without a linked profile', async () => {
 const runtime = new BrowserRuntime(); const state = await runtime.read();
 const sync = vi.spyOn(runtime, 'syncLatest');
 render(<LatestResult runtime={runtime} state={state} active />);
 expect(sync).not.toHaveBeenCalled();
});
