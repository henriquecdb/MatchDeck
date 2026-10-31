import { useState } from 'react';

export function UnitPortrait({ image, name }: { image?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return image && !failed
    ? <img className="unit-portrait" src={image} alt={name} draggable={false} onError={() => setFailed(true)} />
    : <div className="unit-unavailable" aria-label="Imagem da unidade indisponível">?</div>;
}
