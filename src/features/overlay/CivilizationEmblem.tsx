import { useState } from 'react';

export function CivilizationEmblem({ image, civilization }: { image?: string; civilization: string }) {
  const [failed, setFailed] = useState(false);
  return image && !failed ? <img className="civilization-emblem" src={image} alt={`Emblema de ${civilization}`} draggable={false} onError={() => setFailed(true)} />
    : <span className="civilization-emblem emblem-fallback" title={civilization}>{civilization.slice(0, 2).toUpperCase()}</span>;
}
