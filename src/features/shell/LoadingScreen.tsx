export function LoadingScreen({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  return <main className="boot-screen" aria-label={error ? 'Falha ao iniciar' : 'Carregando MatchDeck'}>
    <div className="boot-mark" aria-hidden="true">M</div>
    <strong className="boot-title">MATCH<span>DECK</span></strong>
    {error ? <><p role="alert">Não foi possível iniciar o aplicativo: {error}</p><button onClick={onRetry}>Tentar novamente</button></>
      : <><p role="status">Preparando seu espaço de jogo…</p><progress aria-label="Carregando aplicativo" /></>}
  </main>;
}
