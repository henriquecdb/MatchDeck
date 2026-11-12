import { useState } from 'react';
import { sessionMapRecords, type Sc2Session } from '../../domain/sc2-session';
import { useI18n } from '../../i18n/LanguageProvider';

export function Sc2MapStats({ session }: { session: Sc2Session }) {
  const { t, language } = useI18n();
  const [selected, setSelected] = useState('');
  const maps = sessionMapRecords(session).sort((a, b) => a.map.localeCompare(b.map, language));
  const record = maps.find(row => row.map === selected);
  return <details className="help-details">
    <summary>{t('Consultar mapa')}</summary>
    <label>{t('Mapa')} <select value={record?.map ?? ''} onChange={event => setSelected(event.target.value)}>
      <option value="">{t('Selecionar mapa')}</option>
      {maps.map(row => <option key={row.map} value={row.map}>{row.map}</option>)}
    </select></label>
    {record && <ul className="sc2-opponents" aria-label={t('Por mapa')} aria-live="polite">
      <li><strong>{record.map}</strong>
        <span>{record.wins}{t('V')} · {record.losses}{t('D')}{record.draws > 0 && <> · {record.draws}{t('E')}</>} · {record.winRate == null ? '—' : record.winRate.toLocaleString(language, { maximumFractionDigits: 0 }) + '%'}</span>
        <small>{record.total} {t('partidas')}</small>
      </li>
    </ul>}
  </details>;
}
