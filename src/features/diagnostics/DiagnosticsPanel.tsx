import { useState } from 'react';
import type { AppState, DiagnosticReport, OverlayRuntime } from '../../application/runtime';

export function DiagnosticsPanel({ state, runtime }: { state: AppState; runtime: OverlayRuntime }) {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true); setError(null);
    try { setReport(await runtime.diagnostics()); } catch (cause) { setError(String(cause)); } finally { setBusy(false); }
  }
  function download() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'matchdeck-diagnostico.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <fieldset><legend>Diagnóstico e suporte</legend>
    <p>Estado: <strong>{state.detection.phase}</strong> · {state.detection.message}</p>
    <p>Última consulta bem-sucedida: {state.detection.lastChecked ? new Date(state.detection.lastChecked).toLocaleString('pt-BR') : 'nenhuma nesta execução'}.</p>
    <p>A fonte é o AoE II Companion. Ranqueadas e partidas rápidas dependem da publicação dos dados; lobbies personalizados e partidas contra IA não têm cobertura garantida.</p>
    <div className="actions"><button disabled={busy} onClick={() => void refresh()}>{busy ? 'Coletando…' : 'Preparar diagnóstico'}</button><button disabled={!report || busy} onClick={download}>Baixar diagnóstico revisado</button></div>
    {error && <p role="alert" className="error">{error}</p>}
    {report && <><p>Confira o conteúdo abaixo antes de baixar ou compartilhar. O relatório omite nomes, IDs de perfil e partida, pastas, credenciais e respostas completas da API. Os eventos são limitados a esta execução.</p><pre className="diagnostic-preview" tabIndex={0} aria-label="Prévia do diagnóstico">{JSON.stringify(report, null, 2)}</pre></>}
  </fieldset>;
}
