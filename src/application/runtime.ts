import type { MatchSnapshot } from '../domain/match';
import type { OverlaySettings } from '../domain/settings';
import type { DetectionStatus, PlayerProfile } from '../domain/detection';

export interface AppState {
  match: MatchSnapshot | null;
  settings: OverlaySettings;
  detection: DetectionStatus;
  shortcutAvailable: boolean;
  lastSynced: MatchSnapshot | null;
}

export interface OverlayRuntime {
  read(): Promise<AppState>;
  start(match: MatchSnapshot): Promise<void>;
  finish(): Promise<void>;
  configure(settings: OverlaySettings): Promise<void>;
  identifyLocalProfile(): Promise<PlayerProfile>;
  configureDetection(enabled: boolean, profileInput: string): Promise<void>;
  syncLatest(): Promise<void>;
  subscribe(listener: (state: AppState) => void): Promise<() => void>;
}
