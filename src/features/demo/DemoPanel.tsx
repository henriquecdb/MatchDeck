import { usePostGame } from '../overlay/use-post-game';
import { createPostGameDemo } from './post-game-demo';
import { useI18n } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import type { AppState, OverlayRuntime } from '../../application/runtime';
import { modeLabels, replayMatch, type MatchMode } from '../../domain/match';
import { gameIntegration } from '../../games/registry';
import { OverlayPreview } from '../overlay/OverlayPreview';
import type { DemoTeamSize } from '../../games/aoe2/demo';

interface Props {
  runtime: OverlayRuntime;
  state: AppState;
  desktop: boolean;
  perform(action: () => Promise<void>): Promise<void>;
}

export function DemoPanel({ runtime, state, desktop, perform }: Props) {
  const { t, language } = useI18n();
  const [mode, setMode] = useState<MatchMode>('ranked');
  const [teamSize, setTeamSize] = useState<DemoTeamSize>(1);
  const [result, setResult] = useState<'win' | 'loss' | 'draw'>('win');
  const card = usePostGame(state);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<'synced' | 'fictional'>(state.lastSynced || state.detection.config.profile ? 'synced' : 'fictional');
  const { match, lastSynced, detection, settings } = state;
  const gameId = detection.config.gameId ?? 'aoe2-de';

  function run(action: () => Promise<void>) {
    void perform(async () => {
      setBusy(true);
      try { await action(); } finally { setBusy(false); }
    });
  }

  return <>
    <fieldset disabled={detection.config.enabled || busy}>
      <legend>{t('Dados de teste')}</legend>
      <label>{t('Dados da demonstração')} <select disabled={!!match} value={source} onChange={event => setSource(event.target.value as typeof source)}>
        <option value="fictional">{t('Jogadores fictícios')}</option><option value="synced">{t('Última partida sincronizada')}</option>
      </select></label>
      {source === 'synced' && lastSynced && <p>{t('Última partida:')} <strong>{lastSynced.map}</strong> · {lastSynced.players.map(player => player.name).join(' × ')}{lastSynced.syncedAt ? ` · ${new Date(lastSynced.syncedAt).toLocaleString(language)}` : ''}.</p>}
      {source === 'fictional' && gameId === 'sc2' && <p>{t('SC2 · demonstração 1v1')}</p>}
      {source === 'fictional' && gameId !== 'sc2' && <label>{t('Modalidade fictícia')} <select disabled={!!match} value={mode} onChange={event => setMode(event.target.value as MatchMode)}>
          {Object.entries(modeLabels).filter(([value]) => value !== 'unknown' && (gameId !== 'aoe4' || value === 'ranked' || value === 'quick')).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
        </select></label>}
      {source === 'fictional' && gameId === 'aoe2-de' && <label>{t('Formato da demonstração')} <select disabled={!!match} value={teamSize} onChange={event => setTeamSize(Number(event.target.value) as DemoTeamSize)}>
        {[1, 2, 3, 4].map(size => <option key={size} value={size}>{size}v{size}</option>)}
      </select></label>}
      {<label>{t('Resultado de teste')} <select value={result} onChange={event => setResult(event.target.value as typeof result)}>
          <option value="win">{t('Vitória')}</option><option value="loss">{t('Derrota')}</option><option value="draw">{t('Empate')}</option>
        </select></label>}
      <div className="actions">
        <button className="primary-action" disabled={!!match || (source === 'synced' && !lastSynced && (!desktop || !detection.config.profile))} onClick={() => run(async () => {
          if (source === 'fictional') { await runtime.start(gameIntegration(gameId)!.demo(mode, teamSize)); return; }
          if (!lastSynced) await runtime.syncLatest();
          const latest = (await runtime.read()).lastSynced;
          if (!latest) throw new Error('Nenhuma partida sincronizada disponível. Selecione jogadores fictícios ou sincronize seu perfil.');
          await runtime.start(replayMatch(latest));
        })}>{busy ? t('Carregando…') : t('Iniciar demonstração')}</button>
        {<button disabled={!!match || settings.postGameSeconds === 0} onClick={() => run(() => runtime.start(createPostGameDemo(gameId, result, mode, teamSize)))}>{t('Testar pós-partida')}</button>}
        <button disabled={!match && !card} onClick={() => run(() => runtime.finish())}>{t('Encerrar demonstração')}</button>
        <button disabled={!!match || !desktop || !detection.config.profile} onClick={() => run(() => runtime.syncLatest())}>{t('Atualizar últimos dados')}</button>
      </div>

      {settings.postGameSeconds === 0 && <p>{t('Ative o resumo na aba Overlay.')}</p>}
    </fieldset>
    <p role="status">{detection.config.enabled ? t('Desative a detecção na aba Partida para iniciar um teste.') : match || card ? t('Demonstração ativa. Trocar de aba mantém o overlay.') : t('Pronto para testar o overlay.')}</p>
    <p>{source === 'fictional' ? t('Dados fictícios; seus dados salvos são preservados.') : lastSynced ? t('Usando dados salvos, sem nova consulta.') : desktop && detection.config.profile ? t('O primeiro teste busca sua última partida.') : t('Configure um perfil no aplicativo Windows e sincronize uma partida, ou selecione jogadores fictícios.')}</p>
    <OverlayPreview match={match} settings={settings} postGame={card} />
  </>;
}
