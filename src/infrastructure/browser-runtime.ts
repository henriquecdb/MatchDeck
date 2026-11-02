import type { AppState, OverlayRuntime } from '../application/runtime';
import { captureMatch, type MatchSnapshot } from '../domain/match';
import { defaultSettings, parseSettings, type OverlaySettings } from '../domain/settings';
import { defaultDetection, type PlayerProfile } from '../domain/detection';

export class BrowserRuntime implements OverlayRuntime {
  private state: AppState = { match: null, settings: { ...defaultSettings }, detection: structuredClone(defaultDetection), shortcutAvailable: false, visibilityShortcutAvailable: false, hiddenMatchId: null, lastSynced: null };
  private listeners = new Set<(state: AppState) => void>();

  constructor() {
    try {
      this.state.settings = parseSettings(JSON.parse(localStorage.getItem('matchdeck.settings') ?? 'null'));
    } catch {
      this.state.settings = { ...defaultSettings };
    }
  }

  async read() { return structuredClone(this.state); }

  async syncLatest(): Promise<void> {
    throw new Error('A sincronização de partidas está disponível no aplicativo Windows.');
  }

  async identifyLocalProfile(): Promise<PlayerProfile> {
    throw new Error('A identificação local está disponível no aplicativo Windows. Execute npm run desktop.');
  }

  async configureDetection(_enabled: boolean, _profileInput: string): Promise<void> {
    throw new Error('A detecção real está disponível no aplicativo Windows. Execute npm run desktop.');
  }

  async start(match: MatchSnapshot) {
    this.state.match = captureMatch(this.state.match, match);
    this.publish();
  }

  async finish() {
    this.state.match = null;
    this.state.hiddenMatchId = null;
    this.publish();
  }

  async listMonitors() { return []; }

  async toggleVisibility() {
    const id = this.state.match?.id ?? null;
    this.state.hiddenMatchId = this.state.hiddenMatchId === id ? null : id;
    this.publish();
  }

  async configure(settings: OverlaySettings) {
    const normalized = parseSettings(settings);
    localStorage.setItem('matchdeck.settings', JSON.stringify(normalized));
    this.state.settings = normalized;
    this.publish();
  }

  async subscribe(listener: (state: AppState) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private publish() {
    for (const listener of this.listeners) listener(structuredClone(this.state));
  }
}
