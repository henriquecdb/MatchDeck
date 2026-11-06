import type { MatchSnapshot } from '../domain/match';
import type { OverlaySettings } from '../domain/settings';
import type { DetectionStatus, PlayerProfile } from '../domain/detection';
import type { AppPreferences } from '../domain/preferences';
import type { ProfileOverview } from '../domain/profile';

export interface AppState {
  match: MatchSnapshot | null;
  settings: OverlaySettings;
  detection: DetectionStatus;
  shortcutAvailable: boolean;
  lastSynced: MatchSnapshot | null;
  visibilityShortcutAvailable: boolean;
  hiddenMatchId: string | null;
  preferences: AppPreferences;
  autostart: boolean;
  trayAvailable: boolean;
  closeRequested: boolean;
  startupMs: number | null;
  appError: string | null;
}

export interface DiagnosticReport { version: string; platform: string; source: string; detection: { enabled: boolean; phase: string; lastChecked: string | null; failures: number; retrySeconds: number }; startupMs: number | null; trayAvailable: boolean; shortcuts: { lock: boolean; visibility: boolean }; events: Array<{ timestamp: string; category: string; message: string }>; }

export interface DisplayMonitor { id: string; name: string; width: number; height: number; scaleFactor: number; }

export interface OverlayRuntime {
  read(): Promise<AppState>;
  selectGame(gameId: string): Promise<void>;
  start(match: MatchSnapshot): Promise<void>;
  finish(): Promise<void>;
  configure(settings: OverlaySettings, gameId?: string): Promise<void>;
  identifyLocalProfile(): Promise<PlayerProfile>;
  profileOverview(): Promise<ProfileOverview>;
  configureDetection(enabled: boolean, profileInput: string, playerName?: string): Promise<void>;
  syncLatest(completedOnly?: boolean): Promise<void>;
  listMonitors(): Promise<DisplayMonitor[]>;
  toggleVisibility(): Promise<void>;
  configureApp(preferences: AppPreferences): Promise<void>;
  setAutostart(enabled: boolean): Promise<void>;
  closeApp(action: 'minimize' | 'exit' | 'cancel'): Promise<void>;
  initialized(elapsedMs: number): Promise<void>;
  diagnostics(): Promise<DiagnosticReport>;
  retryDetection(): Promise<void>;
  dismissAppError(): Promise<void>;
  subscribe(listener: (state: AppState) => void): Promise<() => void>;
}
