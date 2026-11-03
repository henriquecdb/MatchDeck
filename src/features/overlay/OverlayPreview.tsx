import { useI18n } from '../../i18n/LanguageProvider';
import type { MatchSnapshot } from '../../domain/match';
import type { OverlaySettings } from '../../domain/settings';
import { MatchOverlay } from './MatchOverlay';

export function OverlayPreview({ match, settings }: { match: MatchSnapshot | null; settings: OverlaySettings }) {
  const { t } = useI18n();
  return <section className="preview-section" aria-label={t('Prévia do overlay')}>
    <h2>{t('Prévia')}</h2>
    <div className="preview">{match ? <div style={{ opacity: settings.opacity, zoom: settings.scale }}><MatchOverlay match={match} layout={settings.layout} showProjection={settings.showProjection} display={settings} /></div>
      : <p>{t('Inicie uma demonstração para visualizar os dados.')}</p>}</div>
  </section>;
}
