import { useI18n } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import type { AppState, OverlayRuntime } from '../../application/runtime';

export function Onboarding({ state, runtime, onStep, perform }: { state: AppState; runtime: OverlayRuntime; onStep(step: 'match' | 'overlay' | 'demo'): void; perform(action: () => Promise<void>): Promise<void> }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const steps = [
    { title: '1. Confira seu perfil', text: 'Identifique seu perfil na aba Partida e confira o nome.', tab: 'match' },
    { title: '2. Ajuste a posição', text: 'Ajuste monitor, posição e escala em Overlay. Use o Age 2 em janela sem bordas.', tab: 'overlay' },
    { title: '3. Teste antes de jogar', text: 'Teste em Demonstração; depois ative a detecção em Partida. Lobbies com IA podem não ser publicados.', tab: 'demo' },
  ] as const;
  return <section className="onboarding" aria-label={t('Configuração guiada')}>
    <strong>{t(steps[step].title)}</strong><p>{t(steps[step].text)}</p>
    <div className="actions"><button onClick={() => onStep(steps[step].tab)}>{t('Abrir')} {steps[step].tab === 'match' ? t('Partida') : steps[step].tab === 'overlay' ? 'Overlay' : t('Demonstração')}</button>
      <button disabled={step === 0} onClick={() => setStep(value => value - 1)}>{t('Anterior')}</button>
      {step < 2 ? <button onClick={() => setStep(value => value + 1)}>{t('Próximo passo')}</button> : <button onClick={() => void perform(() => runtime.configureApp({ ...state.preferences, onboardingComplete: true }))}>{t('Concluir configuração')}</button>}
      <button onClick={() => void perform(() => runtime.configureApp({ ...state.preferences, onboardingComplete: true }))}>{t('Configurar depois')}</button>
    </div>
  </section>;
}
