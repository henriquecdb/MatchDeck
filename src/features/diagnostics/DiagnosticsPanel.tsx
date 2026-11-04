import { useI18n } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import type { AppState, DiagnosticReport, OverlayRuntime } from '../../application/runtime';

export function DiagnosticsPanel({ state, runtime }: { state: AppState; runtime: OverlayRuntime }) {
  const { t, language } = useI18n();
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
  return <fieldset><legend>{t('Diagnóstico e suporte')}</legend>
    <p>{t('Estado:')} <strong>{state.detection.phase}</strong> · {t(state.detection.message)}</p>
    <p>{t('Última consulta bem-sucedida:')} {state.detection.lastChecked ? new Date(state.detection.lastChecked).toLocaleString(language) : t('nenhuma nesta execução')}.</p>
    <p>{t('A fonte é o AoE II Companion. Ranqueadas e partidas rápidas dependem da publicação dos dados; lobbies personalizados e partidas contra IA não têm cobertura garantida.')}</p>
    <div className="actions"><button disabled={busy} onClick={() => void refresh()}>{busy ? t('Coletando…') : t('Preparar diagnóstico')}</button><button disabled={!report || busy} onClick={download}>{t('Baixar diagnóstico revisado')}</button></div>
    {error && <p role="alert" className="error">{t(error)}</p>}
    {report && <><p>{t('Revise antes de compartilhar. Sem nomes, IDs, pastas, credenciais ou respostas completas da API. Eventos só desta execução.')}</p><pre className="diagnostic-preview" tabIndex={0} aria-label={t('Prévia do diagnóstico')}>{JSON.stringify(report, null, 2)}</pre></>}
  </fieldset>;
}
