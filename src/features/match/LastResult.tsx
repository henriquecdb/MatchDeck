import type { MatchSnapshot } from '../../domain/match';
import { queueLabel } from '../../domain/match-labels';

export function LastResult({ match }: { match: MatchSnapshot | null }) {
  if (!match?.finishedAt || match.source !== 'live') return null;
  return <section className="session-summary" aria-label="Último resultado confirmado"><h2>Último resultado confirmado</h2><strong>{match.map} · {queueLabel(match)}</strong>
    <span>{new Date(match.finishedAt).toLocaleString('pt-BR')}</span>
    <ul>{match.players.map(player => <li key={player.id}>{player.id === match.selfPlayerId && <strong>Você · </strong>}{player.name}: {player.won === true ? 'vitória' : player.won === false ? 'derrota' : 'resultado não informado'} · Rating inicial {player.rating ?? '—'} · Variação {player.ratingChange == null ? 'não informada' : `${player.ratingChange >= 0 ? '+' : ''}${player.ratingChange}`}</li>)}</ul>
    <p>Resultado informado pela fonte. O rating inicial foi preservado; a variação é a confirmada para esta partida.</p>
    {match.warnings?.map(warning => <p role="status" key={warning}>{warning}</p>)}
  </section>;
}
