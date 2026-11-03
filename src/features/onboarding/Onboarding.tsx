import { useState } from 'react';
import type { AppState, OverlayRuntime } from '../../application/runtime';

export function Onboarding({ state, runtime, onStep, perform }: { state: AppState; runtime: OverlayRuntime; onStep(step: 'match' | 'overlay' | 'demo'): void; perform(action: () => Promise<void>): Promise<void> }) {
  const [step, setStep] = useState(0);
  const steps = [
    { title: '1. Confira seu perfil', text: 'Na aba Partida, identifique seu perfil e confira o nome. A detecção acompanha essa conta.', tab: 'match' },
    { title: '2. Ajuste a posição', text: 'Na aba Overlay, escolha o monitor, a posição e a escala. O Age 2 deve estar em janela sem bordas.', tab: 'overlay' },
    { title: '3. Teste antes de jogar', text: 'Na aba Demonstração, escolha jogadores fictícios ou sua última partida. Depois, ative a detecção na aba Partida. Lobbies com IA podem não ser publicados pela fonte.', tab: 'demo' },
  ] as const;
  return <section className="onboarding" aria-label="Configuração guiada">
    <strong>{steps[step].title}</strong><p>{steps[step].text}</p>
    <div className="actions"><button onClick={() => onStep(steps[step].tab)}>Abrir {steps[step].tab === 'match' ? 'Partida' : steps[step].tab === 'overlay' ? 'Overlay' : 'Demonstração'}</button>
      <button disabled={step === 0} onClick={() => setStep(value => value - 1)}>Anterior</button>
      {step < 2 ? <button onClick={() => setStep(value => value + 1)}>Próximo passo</button> : <button onClick={() => void perform(() => runtime.configureApp({ ...state.preferences, onboardingComplete: true }))}>Concluir configuração</button>}
      <button onClick={() => void perform(() => runtime.configureApp({ ...state.preferences, onboardingComplete: true }))}>Configurar depois</button>
    </div>
  </section>;
}
