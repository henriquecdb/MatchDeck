export interface AvailableUpdate {
  currentVersion: string;
  version: string;
  notes: string;
}

export type UpdatePhase = 'idle' | 'checking' | 'current' | 'available' | 'downloading' | 'installing' | 'restarting' | 'error';

export interface UpdateProgress {
  phase: 'downloading' | 'installing';
  downloaded: number;
  total?: number;
}

export interface UpdateState {
  phase: UpdatePhase;
  available: AvailableUpdate | null;
  downloaded: number;
  total?: number;
  error: string | null;
}

export interface UpdatePort {
  check(): Promise<AvailableUpdate | null>;
  install(progress: (value: UpdateProgress) => void): Promise<void>;
  dispose(): Promise<void>;
}

export function progressPercent(downloaded: number, total?: number): number | undefined {
  return total && total > 0 ? Math.min(100, Math.max(0, Math.round(downloaded / total * 100))) : undefined;
}
