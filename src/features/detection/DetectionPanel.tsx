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
  const [input, setInput] = useState<string | null>(null);
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
    <legend>{t('Detecção real · AoE2 multiplayer')}</legend>
    {!desktop && <p>{t('Disponível no aplicativo Windows: execute')} <code>npm run desktop</code>.</p>}
    <label>{t('Profile ID do AoE2 ou Steam ID')} <input className="profile-input" type="text" inputMode="numeric" autoComplete="off" value={profileInput}
        disabled={status.config.enabled} onChange={event => { setInput(event.target.value); setIdentifiedName(null); }} placeholder={t('ID numérico')} />
    </label>
    <div className="actions">
      <button disabled={status.config.enabled} onClick={() => void perform(async () => {
        const profile = await runtime.identifyLocalProfile();
        setInput(profile.profileId.toString());
        setIdentifiedName(profile.name);
      })}>{t('Identificar perfil local')}</button>
      <button disabled={status.config.enabled || !profileInput.trim()} onClick={() => void perform(() => runtime.configureDetection(true, profileInput))}>{t('Ativar detecção')}</button>
      <button disabled={!status.config.enabled} onClick={() => void perform(() => runtime.configureDetection(false, profileInput))}>{t('Desativar detecção')}</button>
      <button disabled={!status.config.enabled} onClick={() => void perform(() => runtime.retryDetection())}>{t('Consultar agora')}</button>
    </div>
    {identifiedName && !status.config.enabled && <p>{t('Perfil identificado:')} {identifiedName}{t('. Clique em Ativar detecção.')}</p>}
    {status.config.profile && <p>{t('Perfil configurado:')} <strong>{status.config.profile.name}</strong> · {status.config.profile.profileId}</p>}
    <p role="status">{busy ? t('Processando…') : status.message}</p>
    {status.lastChecked && <p>{t('Última consulta bem-sucedida:')} {new Date(status.lastChecked).toLocaleTimeString(language)}</p>}
    {error && <p role="alert" className="error">{t(error)}</p>}
    <p>{t('Consultas a cada 20 segundos, com intervalo progressivo após falhas. Ranqueadas e partidas rápidas dependem da publicação pela fonte. Lobbies personalizados, especialmente contra IA, não têm cobertura garantida. Skirmish offline e campanhas não são detectados.')}</p>
  </fieldset>;
}
