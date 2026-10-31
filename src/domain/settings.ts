export interface OverlaySettings {
  opacity: number;
  x: number;
  y: number;
  locked: boolean;
  layout: 'detailed' | 'compact';
  autoUpdate: boolean;
}

export const defaultSettings: OverlaySettings = { opacity: 0.9, x: 40, y: 80, locked: false, layout: 'detailed', autoUpdate: false };

export function parseSettings(value: unknown): OverlaySettings {
  if (!value || typeof value !== 'object') return { ...defaultSettings };
  const candidate = value as Record<string, unknown>;
  const coordinate = (key: string, fallback: number) =>
    typeof candidate[key] === 'number' && Number.isFinite(candidate[key])
      ? Math.round(Math.max(-32000, Math.min(32000, candidate[key])))
      : fallback;
  return {
    opacity: typeof candidate.opacity === 'number' && Number.isFinite(candidate.opacity)
      ? Math.max(0.2, Math.min(1, candidate.opacity)) : defaultSettings.opacity,
    x: coordinate('x', defaultSettings.x),
    y: coordinate('y', defaultSettings.y),
    locked: typeof candidate.locked === 'boolean' ? candidate.locked : false,
    layout: candidate.layout === 'compact' ? 'compact' : 'detailed',
    autoUpdate: candidate.autoUpdate === true,
  };
}
