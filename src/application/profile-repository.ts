import type { ProfileOverview } from '../domain/profile';

export class ProfileRepository {
  private cache = new Map<number, { value: ProfileOverview; loadedAt: number }>();
  private pending = new Map<number, Promise<ProfileOverview>>();

  constructor(private fetch: () => Promise<ProfileOverview>, private now = Date.now) {}

  peek(profileId: number) { return this.cache.get(profileId)?.value ?? null; }

  load(profileId: number, refresh = false): Promise<ProfileOverview> {
    const pending = this.pending.get(profileId);
    if (pending) return pending;
    const saved = this.cache.get(profileId);
    if (!refresh && saved && this.now() - saved.loadedAt < 60_000) return Promise.resolve(saved.value);
    const request = this.fetch().then(value => {
      if (value.profileId !== profileId) throw new Error('O perfil foi alterado. Atualize para tentar novamente.');
      this.cache.set(profileId, { value, loadedAt: this.now() });
      return value;
    }).finally(() => { this.pending.delete(profileId); });
    this.pending.set(profileId, request);
    return request;
  }
}
