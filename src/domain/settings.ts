export interface OverlaySettings {
  opacity: number;
  x: number;
  y: number;
  locked: boolean;
  layout: 'detailed' | 'compact';
  autoUpdate: boolean;
  scale: number;
  focusOnly: boolean;
  showProjection: boolean;
  monitorId: string | null;
  anchor: 'manual' | 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  margin: number;
}

export const defaultSettings: OverlaySettings = { opacity: 0.9, x: 40, y: 80, locked: false, layout: 'detailed', autoUpdate: false, scale: 1, focusOnly: true, showProjection: true, monitorId: null, anchor: 'manual', margin: 16 };

export const anchorLabels: Record<OverlaySettings['anchor'], string> = {
  manual: 'Manual · arrastar ou informar X/Y', 'top-left': 'Superior esquerdo', 'top-center': 'Superior central', 'top-right': 'Superior direito',
  'center-left': 'Centro esquerdo', center: 'Centro', 'center-right': 'Centro direito', 'bottom-left': 'Inferior esquerdo', 'bottom-center': 'Inferior central', 'bottom-right': 'Inferior direito',
};

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
    scale: typeof candidate.scale === 'number' && Number.isFinite(candidate.scale) ? Math.max(0.5, Math.min(1.5, candidate.scale)) : 1,
    focusOnly: candidate.focusOnly !== false,
    showProjection: candidate.showProjection !== false,
    monitorId: typeof candidate.monitorId === 'string' ? candidate.monitorId : null,
    anchor: typeof candidate.anchor === 'string' && Object.hasOwn(anchorLabels, candidate.anchor) ? candidate.anchor as OverlaySettings['anchor'] : 'manual',
    margin: typeof candidate.margin === 'number' && Number.isFinite(candidate.margin) ? Math.round(Math.max(0, Math.min(200, candidate.margin))) : 16,
  };
}
