import { useI18n } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import type { OverlayRuntime } from '../../application/runtime';
import type { DetectionStatus } from '../../domain/detection';

interface Props {
  runtime: OverlayRuntime;
  status: DetectionStatus;
  desktop: boolean;
  ready: boolean;
}

export function DetectionPanel({ runtime, status, desktop, ready }: Props) {
  const { t, language } = useI18n();
  const sc2 = status.config.gameId === 'sc2';
  const aoe4 = status.config.gameId === 'aoe4';
  const [input, setInput] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifiedName, setIdentifiedName] = useState<string | null>(null);
  const profileInput = input ?? status.config.profile?.profileId.toString() ?? '';

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try { await action(); } catch (cause) { setError(String(cause)); } finally { setBusy(false); }
  }

  return <fieldset disabled={!desktop || !ready || busy}>
    <legend>{t('Detecção multiplayer')}</legend>
    {!desktop && <p>{t('Disponível no aplicativo Windows.')}</p>}
    <label>{t(sc2 ? 'ID do SC2 Pulse ou link do perfil SC2' : aoe4 ? 'ID ou link do perfil no AoE4 World' : 'Profile ID do AoE2 ou Steam ID')} <input className="profile-input" type="text" inputMode={aoe4 || sc2 ? 'url' : 'numeric'} autoComplete="off" value={profileInput}
        disabled={status.config.enabled} onChange={event => { setInput(event.target.value); setIdentifiedName(null); setPlayerName(''); }} placeholder={t('ID numérico')} />
    </label>
    {sc2 && <label>{t('Nome no jogo')}
      <input className="player-name-input" type="text" autoComplete="off" placeholder={t('Opcional')} title={t('Use o nome do personagem se o Pulse não publicar seu nome. A BattleTag pode ser diferente.')} maxLength={64} disabled={status.config.enabled}
        value={playerName ?? (status.config.profile?.name.startsWith('SC2 #') ? '' : status.config.profile?.name ?? '')}
        onChange={event => setPlayerName(event.target.value)} />
    </label>}
    <div className="actions">
      <button disabled={status.config.enabled} onClick={() => void perform(async () => {
        setIdentifiedName(null);
        const profile = await runtime.identifyLocalProfile();
        setInput(profile.profileId.toString());
        setIdentifiedName(profile.name);
        if (!profile.name.startsWith('SC2 #')) setPlayerName(profile.name);
      })}>{t('Identificar perfil local')}</button>
      <button className="primary-action" disabled={status.config.enabled || !profileInput.trim()} onClick={() => void perform(() => sc2 ? runtime.configureDetection(true, profileInput, playerName ?? (status.config.profile?.name.startsWith('SC2 #') ? '' : status.config.profile?.name)) : runtime.configureDetection(true, profileInput))}>{t('Ativar detecção')}</button>
      <button disabled={!status.config.enabled} onClick={() => void perform(() => runtime.configureDetection(false, profileInput))}>{t('Desativar detecção')}</button>
      <button disabled={!status.config.enabled} onClick={() => void perform(() => runtime.retryDetection())}>{t('Consultar agora')}</button>
    </div>
    {identifiedName && !status.config.enabled && <p>{t('Perfil identificado:')} {identifiedName}</p>}
    {status.config.profile && <p>{t('Perfil configurado:')} <strong>{status.config.profile.name}</strong> · {status.config.profile.profileId}</p>}
    <p role="status">{busy ? t('Processando…') : t(status.message)}</p>
    {error && <p role="alert" className="error">{t(error)}</p>}
    <details className="help-details"><summary>{t('Como funciona')}</summary>
      <p>{t(sc2 ? 'Cliente SC2 consultado localmente a cada 2 s. Estatísticas externas são capturadas no início da partida.' : 'Consultas a cada 20 s; o intervalo aumenta após falhas.')}</p>
      <p>{t(sc2 ? 'SC2: 1v1 entre pessoas. Replays locais confirmam mapa e resultado; MMR vem do SC2 Pulse. Matchmaking inclui ranked e unranked.' : aoe4 ? 'Age 4: apenas 1v1 ranqueado e rápido, publicado pelo AoE4 World. Equipes, lobbies personalizados e campanhas ficam fora desta iteração.' : 'Ranqueadas e partidas rápidas dependem da fonte. Lobbies personalizados e IA não têm cobertura garantida. Sem suporte a skirmish offline ou campanhas.')}</p>
      {status.lastChecked && <p>{t('Última consulta:')} {new Date(status.lastChecked).toLocaleTimeString(language)}</p>}
    </details>
  </fieldset>;
}
