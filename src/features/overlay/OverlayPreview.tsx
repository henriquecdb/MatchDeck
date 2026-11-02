import type { MatchSnapshot } from '../../domain/match';
import type { OverlaySettings } from '../../domain/settings';
import { MatchOverlay } from './MatchOverlay';

export function OverlayPreview({ match, settings }: { match: MatchSnapshot | null; settings: OverlaySettings }) {
  return <section className="preview-section" aria-label="Prévia do overlay">
    <h2>Prévia</h2>
    <div className="preview">{match ? <div style={{ opacity: settings.opacity, zoom: settings.scale }}><MatchOverlay match={match} layout={settings.layout} showProjection={settings.showProjection} /></div>
      : <p>Inicie uma demonstração para visualizar os dados.</p>}</div>
  </section>;
}
