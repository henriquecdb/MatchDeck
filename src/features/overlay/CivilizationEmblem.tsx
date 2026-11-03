import { useState } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';

export function CivilizationEmblem({ image, civilization }: { image?: string; civilization: string }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  return image && !failed ? <img className="civilization-emblem" src={image} alt={t('Emblema de {0}', { 0: civilization })} draggable={false} onError={() => setFailed(true)} />
    : <span className="civilization-emblem emblem-fallback" title={civilization}>{civilization.slice(0, 2).toUpperCase()}</span>;
}
