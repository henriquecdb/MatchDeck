import { useI18n } from '../../i18n/LanguageProvider';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { localizedReleaseNotes } from '../../domain/changelog';

export function ReleaseNotes({ notes, version, title = 'O que mudou' }: { notes: string; version: string; title?: string }) {
  const { t, language } = useI18n();
  return <details className="release-notes-card" open>
    <summary>{t(title)} <span className="release-version">v{version}</span></summary>
    <div className="release-notes" role="region" aria-label={t('Notas da versão {0}', { 0: version })} tabIndex={0}>
      <Markdown remarkPlugins={[remarkGfm]} skipHtml disallowedElements={['img']}
        components={{
          h1: ({ children }) => <h3>{children}</h3>,
          h2: ({ children }) => <h3>{children}</h3>,
          h3: ({ children }) => <h4>{children}</h4>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        }}>
        {localizedReleaseNotes(notes, language).trim() || t('As notas desta versão ainda não estão disponíveis.')}
      </Markdown>
    </div>
  </details>;
}
