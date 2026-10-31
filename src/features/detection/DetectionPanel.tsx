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
    <legend>Detecção real · AoE2 multiplayer</legend>
    {!desktop && <p>Disponível no aplicativo Windows: execute <code>npm run desktop</code>.</p>}
    <label>Profile ID do AoE2 ou Steam ID
      <input className="profile-input" type="text" inputMode="numeric" autoComplete="off" value={profileInput}
        disabled={status.config.enabled} onChange={event => { setInput(event.target.value); setIdentifiedName(null); }} placeholder="ID numérico" />
    </label>
    <div className="actions">
      <button disabled={status.config.enabled} onClick={() => void perform(async () => {
        const profile = await runtime.identifyLocalProfile();
        setInput(profile.profileId.toString());
        setIdentifiedName(profile.name);
      })}>Identificar perfil local</button>
      <button disabled={status.config.enabled || !profileInput.trim()} onClick={() => void perform(() => runtime.configureDetection(true, profileInput))}>Ativar detecção</button>
      <button disabled={!status.config.enabled} onClick={() => void perform(() => runtime.configureDetection(false, profileInput))}>Desativar detecção</button>
    </div>
    {identifiedName && !status.config.enabled && <p>Perfil identificado: {identifiedName}. Clique em Ativar detecção.</p>}
    {status.config.profile && <p>Perfil configurado: <strong>{status.config.profile.name}</strong> · {status.config.profile.profileId}</p>}
    <p role="status">{busy ? 'Processando…' : status.message}</p>
    {status.lastChecked && <p>Última consulta concluída: {new Date(status.lastChecked).toLocaleTimeString('pt-BR')}</p>}
    {error && <p role="alert" className="error">{error}</p>}
    <p>Consultas a cada 20 segundos. O início e o fim dependem da publicação pela fonte externa e podem atrasar. Skirmish offline e campanhas não são detectados nesta etapa.</p>
  </fieldset>;
}
