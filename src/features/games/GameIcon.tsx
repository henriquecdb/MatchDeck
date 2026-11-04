import { useState } from 'react';

export function GameIcon({ icon, gameId }: { icon: string; gameId: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="game-icon game-icon-fallback" aria-hidden="true">{gameId === 'aoe4' ? 'IV' : 'II'}</span>
    : <img className="game-icon" src={icon} alt="" draggable={false} onError={() => setFailed(true)} />;
}
