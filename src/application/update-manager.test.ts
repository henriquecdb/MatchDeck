import { expect, it, vi } from 'vitest';
import { UpdateManager } from './update-manager';
import { progressPercent, type UpdatePort } from '../domain/updates';

const available = { currentVersion: '0.1.0', version: '0.2.0', notes: 'New features' };

it('reports the version transition and real download progress', async () => {
  const phases: string[] = [];
  const port: UpdatePort = {
    check: async () => available,
    install: async report => {
      report({ phase: 'downloading', downloaded: 50, total: 100 });
      report({ phase: 'installing', downloaded: 100, total: 100 });
    },
    dispose: async () => {},
  };
  const manager = new UpdateManager(port);
  manager.subscribe(() => phases.push(manager.snapshot().phase));
  await manager.check();
  expect(manager.snapshot().available).toEqual(available);
  await manager.install();
  expect(phases).toEqual(['checking', 'available', 'downloading', 'downloading', 'installing', 'restarting']);
  expect(progressPercent(50, 100)).toBe(50);
  expect(progressPercent(1, undefined)).toBeUndefined();
});

it('keeps failed updates recoverable and blocks concurrent operations', async () => {
  const install = vi.fn(async () => { throw new Error('Invalid signature'); });
  const check = vi.fn(async () => available);
  const manager = new UpdateManager({ check, install, dispose: async () => {} });
  await Promise.all([manager.check(), manager.check()]);
  expect(check).toHaveBeenCalledTimes(1);
  await manager.install();
  expect(manager.snapshot().phase).toBe('error');
  expect(manager.snapshot().error).toContain('Invalid signature');
  expect(manager.snapshot().available?.version).toBe('0.2.0');
});
