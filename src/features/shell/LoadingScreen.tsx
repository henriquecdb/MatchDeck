import { useI18n } from '../../i18n/LanguageProvider';
export function LoadingScreen({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  const { t } = useI18n();
  return <main className="boot-screen" aria-label={error ? t('Falha ao iniciar') : t('Carregando MatchDeck')}>
    <div className="boot-mark" aria-hidden="true">M</div>
    <strong className="boot-title">MATCH<span>DECK</span></strong>
    {error ? <><p role="alert">{t('Não foi possível iniciar o aplicativo:')} {t(error)}</p><button onClick={onRetry}>{t('Tentar novamente')}</button></>
      : <><p role="status">{t('Preparando seu espaço de jogo…')}</p><progress aria-label={t('Carregando aplicativo')} /></>}
  </main>;
}
