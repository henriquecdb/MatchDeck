import { useEffect, useRef, useState } from 'react';
import type { OverlayRuntime } from '../../application/runtime';
import type { Sc2Session, Sc2SessionAction } from '../../domain/sc2-session';
import { useI18n } from '../../i18n/LanguageProvider';
import { raceArtwork } from './catalog';
import { CivilizationEmblem } from '../../features/overlay/CivilizationEmblem';

export function Sc2SessionPanel({ runtime, profileId, active, matchActive }: {
  runtime: OverlayRuntime;
  profileId: number;
  active: boolean;
  matchActive: boolean;
}) {
  const { t, language, gameLanguage } = useI18n();
  const [session, setSession] = useState<Sc2Session | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let updated = false;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        unsubscribe = await runtime.subscribeSc2Session(next => {
          if (!disposed && next.profileId === profileId) {
            updated = true;
            revision.current += 1;
            setSession(next);
          }
        });
        if (disposed) { unsubscribe(); return; }
        const current = await runtime.sc2Session(profileId, 'read');
        if (!disposed) {
          if (!updated) setSession(current);
          setError(null);
          setReady(true);
        }
      } catch (cause) {
        if (!disposed) setError(String(cause));
      }
    })();
    return () => { disposed = true; unsubscribe?.(); };
  }, [runtime, profileId, active]);

  async function changeSession(action: Sc2SessionAction) {
    const requestedRevision = revision.current;
    setBusy(true);
    setError(null);
    try {
      const next = await runtime.sc2Session(profileId, action);
      if (revision.current === requestedRevision) setSession(next);
      setReady(true);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  const matches = session?.matches ?? [];
  const wins = matches.filter(match => match.won === true && !match.draw).length;
  const losses = matches.filter(match => match.won === false && !match.draw).length;
  const draws = matches.filter(match => match.draw).length;
  const running = session != null && session.endedAt == null;
  return <section className="sc2-session" aria-label={t('Sessão de StarCraft II')}>
    <div className="profile-heading">
      <h3>{t('Sessão')}</h3>
      <button disabled={!ready || busy || matchActive}
        onClick={() => void changeSession(running ? 'finish' : 'start')}>
        {t(running ? 'Encerrar sessão' : session ? 'Nova sessão' : 'Iniciar sessão')}
      </button>
    </div>
    {error && <p role="alert" className="error">{t(error)} <button disabled={busy} onClick={() => void changeSession('read')}>{t('Tentar novamente')}</button></p>}
    {session ? <>
      <p className="sc2-session-period">
        {t('Início')} <time dateTime={session.startedAt}>{new Date(session.startedAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}</time>
        {session.endedAt && <> · {t('Fim')} <time dateTime={session.endedAt}>{new Date(session.endedAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}</time></>}
      </p>
      <dl className="sc2-session-score" aria-live="polite">
        <div><dt>{t('Vitórias')}</dt><dd>{wins}</dd></div>
        <div><dt>{t('Derrotas')}</dt><dd>{losses}</dd></div>
        <div><dt>{t('Empates')}</dt><dd>{draws}</dd></div>
        <div><dt>{t('Aproveitamento')}</dt><dd>{matches.length ? (wins / matches.length * 100).toLocaleString(language, { maximumFractionDigits: 1 }) + '%' : '—'}</dd></div>
      </dl>
      {matches.length > 0 ? <>
        <h4>{t('Últimos resultados da sessão')}</h4>
        <ol className="profile-history">{matches.slice(0, 10).map(match => {
          const artwork = raceArtwork({ civilization: match.opponentRace }, gameLanguage);
          return <li key={match.id} className={`history-match ${match.draw ? 'is-draw' : match.won ? 'is-win' : 'is-loss'}`}>
            <span className="history-result">{t(match.draw ? 'Empate' : match.won ? 'Vitória' : 'Derrota')}</span>
            <div className="history-details">
              <strong title={match.opponent}>{match.opponent}</strong>
              <small>{match.map}</small>
              <time dateTime={match.finishedAt}>{new Date(match.finishedAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}</time>
            </div>
            <div className="history-civilization"><CivilizationEmblem image={artwork.emblem} civilization={artwork.name} /><span>{artwork.name}</span></div>
          </li>;
        })}</ol>
      </> : <p>{t('Aguardando resultados confirmados por replay local.')}</p>}
    </> : <p>{t('Inicie a sessão antes de entrar na fila. O placar será salvo neste computador para este perfil.')}</p>}
    <p className="sc2-session-help">{t('Conta partidas 1v1 entre pessoas iniciadas após o começo da sessão, incluindo matchmaking e personalizadas. Replays podem demorar alguns segundos. Nova sessão substitui o placar anterior.')}</p>
    {matchActive && <p>{t('Encerre a partida ou demonstração antes de alterar a sessão.')}</p>}
  </section>;
}
