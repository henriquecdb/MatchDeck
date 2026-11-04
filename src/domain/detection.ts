export interface PlayerProfile {
  profileId: number;
  name: string;
}

export interface DetectionConfig {
  gameId?: string;
  enabled: boolean;
  profile: PlayerProfile | null;
}

export interface DetectionStatus {
  config: DetectionConfig;
  phase: 'disabled' | 'waiting' | 'loading' | 'in-match' | 'error';
  message: string;
  lastChecked: string | null;
  failures?: number;
}

export const defaultDetection: DetectionStatus = {
  config: { enabled: false, profile: null, gameId: 'aoe2-de' },
  phase: 'disabled',
  message: 'Detecção desativada',
  lastChecked: null,
};
