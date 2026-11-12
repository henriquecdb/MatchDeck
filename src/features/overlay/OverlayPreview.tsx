import { useI18n } from '../../i18n/LanguageProvider';
import type { MatchSnapshot } from '../../domain/match';
import type { OverlaySettings } from '../../domain/settings';
import { Sc2PostGameCard } from '../../games/sc2/Sc2PostGameCard';
import { sc2DemoSession } from '../../games/sc2/demo';
import type { AppState } from '../../application/runtime';
import { MatchOverlay } from './MatchOverlay';
import type { Sc2Session } from '../../domain/sc2-session';

export function OverlayPreview({ match, settings, session = null, postGame = null }: { match: MatchSnapshot | null; settings: OverlaySettings; session?: Sc2Session | null; postGame?: AppState['postGame'] }) {
  const { t } = useI18n();
  return <section className="preview-section" aria-label={t('Prévia do overlay')}>
    <h2>{t('Prévia')}</h2>
    <div className="preview">{postGame ? <div style={{ opacity: settings.opacity, zoom: settings.scale }}><Sc2PostGameCard game={postGame.game} session={settings.showSession ? postGame.game.source === 'demo' ? sc2DemoSession : session : null} /></div> : match ? <div style={{ opacity: settings.opacity, zoom: settings.scale }}><MatchOverlay match={match} layout={settings.layout} showProjection={settings.showProjection} display={settings} session={session} /></div>
      : <p>{t('Inicie uma demonstração para visualizar os dados.')}</p>}</div>
  </section>;
}
