import { expect, it, vi } from 'vitest';
import { ProfileRepository } from './profile-repository';
import type { ProfileOverview } from '../domain/profile';

const profile = (profileId = 42): ProfileOverview => ({ profileId, name: 'Player', leaderboards: [], recentMatches: [], fetchedAt: '2026-11-03T10:00:00Z' });

it('deduplicates in-flight requests and caches each profile for a minute without polling', async () => {
  let now = 0;
  let resolve!: (value: ProfileOverview) => void;
  const fetch = vi.fn(() => new Promise<ProfileOverview>(done => { resolve = done; }));
  const repository = new ProfileRepository(fetch, () => now);
  const first = repository.load(42);
  expect(repository.load(42)).toBe(first);
  resolve(profile());
  await first;
  now = 59_999;
  expect(await repository.load(42)).toEqual(profile());
  expect(fetch).toHaveBeenCalledTimes(1);
  now = 60_000;
  const next = repository.load(42);
  resolve(profile());
  await next;
  const manual = repository.load(42, true);
  resolve(profile());
  await manual;
  expect(fetch).toHaveBeenCalledTimes(3);
});

it('rejects responses for another profile and does not expose previous users through the cache', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(profile()).mockResolvedValueOnce(profile());
  const repository = new ProfileRepository(fetch);
  await repository.load(42);
  expect(repository.peek(99)).toBeNull();
  await expect(repository.load(99)).rejects.toThrow('perfil foi alterado');
  expect(repository.peek(99)).toBeNull();
});

it('keeps cached data after a failed refresh and permits retry', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(profile()).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(profile());
  const repository = new ProfileRepository(fetch);
  await repository.load(42);
  await expect(repository.load(42, true)).rejects.toThrow('Offline');
  expect(repository.peek(42)).toEqual(profile());
  await expect(repository.load(42, true)).resolves.toEqual(profile());
});
