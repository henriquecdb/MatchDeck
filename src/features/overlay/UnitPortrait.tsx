import { useI18n } from '../../i18n/LanguageProvider';
import { useState } from 'react';

export function UnitPortrait({ image, name }: { image?: string; name: string }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  return image && !failed
    ? <img className="unit-portrait" src={image} alt={name} draggable={false} onError={() => setFailed(true)} />
    : <div className="unit-unavailable" aria-label={t('Imagem da unidade indisponível')}>?</div>;
}
