import type { UpdatePort, UpdateState } from '../domain/updates';

export class UpdateManager {
  private state: UpdateState = { phase: 'idle', available: null, downloaded: 0, error: null };
  private listeners = new Set<() => void>();
  private working = false;

  constructor(private port: UpdatePort) {}

  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  async check() {
    if (this.working) return;
    this.working = true;
    this.publish({ ...this.state, phase: 'checking', error: null });
    try {
      const available = await this.port.check();
      this.publish({ phase: available ? 'available' : 'current', available, downloaded: 0, error: null });
    } catch (error) {
      this.publish({ ...this.state, phase: 'error', error: String(error) });
    } finally { this.working = false; }
  }

  async install() {
    if (this.working || !this.state.available) return;
    this.working = true;
    this.publish({ ...this.state, phase: 'downloading', downloaded: 0, total: undefined, error: null });
    try {
      await this.port.install(progress => this.publish({ ...this.state, ...progress }));
      this.publish({ ...this.state, phase: 'restarting' });
    } catch (error) {
      this.publish({ ...this.state, phase: 'error', error: String(error) });
    } finally { this.working = false; }
  }

  async dispose() { await this.port.dispose(); }

  private publish(state: UpdateState) {
    this.state = state;
    this.listeners.forEach(listener => listener());
  }
}
