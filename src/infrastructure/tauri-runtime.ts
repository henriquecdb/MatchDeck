import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AppState, DisplayMonitor, OverlayRuntime } from '../application/runtime';
import type { MatchSnapshot } from '../domain/match';
import type { OverlaySettings } from '../domain/settings';
import type { PlayerProfile } from '../domain/detection';

export class TauriRuntime implements OverlayRuntime {
  read() { return invoke<AppState>('read_state'); }
  start(match: MatchSnapshot) { return invoke<void>('start_match', { incoming: match }); }
  finish() { return invoke<void>('finish_match'); }
  configure(settings: OverlaySettings) { return invoke<void>('configure_overlay', { settings }); }
  syncLatest() { return invoke<void>('sync_latest_match'); }
  listMonitors() { return invoke<DisplayMonitor[]>('list_monitors'); }
  toggleVisibility() { return invoke<void>('toggle_overlay_visibility'); }
  identifyLocalProfile() { return invoke<PlayerProfile>('identify_local_profile'); }
  configureDetection(enabled: boolean, profileInput: string) {
    return invoke<void>('configure_detection', { enabled, profileInput });
  }
  subscribe(listener: (state: AppState) => void) {
    return listen<AppState>('state-changed', event => listener(event.payload));
  }
}
