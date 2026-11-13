import { useI18n } from '../../i18n/LanguageProvider';
import type { MatchSnapshot } from '../../domain/match';
import type { OverlaySettings } from '../../domain/settings';
import { demoEncounter } from '../../games/sc2/use-sc2-encounter';
import { PostGameCard } from './PostGameCard';
import type { GameSession } from '../../domain/game-session';
import { sc2DemoSession } from '../../games/sc2/demo';
import type { AppState } from '../../application/runtime';
import { MatchOverlay } from './MatchOverlay';
import type { Sc2Session } from '../../domain/sc2-session';

export function OverlayPreview({ match, settings, session = null, gameSession = null, postGame = null }: { match: MatchSnapshot | null; settings: OverlaySettings; session?: Sc2Session | null; postGame?: AppState['postGame']; gameSession?: GameSession | null }) {
  const { t } = useI18n();
  return <section className="preview-section" aria-label={t('Prévia do overlay')}>
    <h2>{t('Prévia')}</h2>
    <div className="preview">{postGame ? <div style={{ opacity: settings.opacity, zoom: settings.scale }}><PostGameCard showSession={settings.showSession} gameSession={gameSession} encounter={postGame.game.source === 'demo' ? demoEncounter(postGame.game.finishedAt) : null} game={postGame.game} session={settings.showSession ? postGame.game.source === 'demo' ? sc2DemoSession : session : null} /></div> : match ? <div style={{ opacity: settings.opacity, zoom: settings.scale }}><MatchOverlay gameSession={gameSession} match={match} layout={settings.layout} showProjection={settings.showProjection} display={settings} session={session} /></div>
      : <p>{t('Inicie uma demonstração para visualizar os dados.')}</p>}</div>
  </section>;
}
