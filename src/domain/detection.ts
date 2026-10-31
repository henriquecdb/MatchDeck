export interface PlayerProfile {
  profileId: number;
  name: string;
}

export interface DetectionConfig {
  enabled: boolean;
  profile: PlayerProfile | null;
}

export interface DetectionStatus {
  config: DetectionConfig;
  phase: 'disabled' | 'waiting' | 'loading' | 'in-match' | 'error';
  message: string;
  lastChecked: string | null;
}

export const defaultDetection: DetectionStatus = {
  config: { enabled: false, profile: null },
  phase: 'disabled',
  message: 'Detecção desativada',
  lastChecked: null,
};
