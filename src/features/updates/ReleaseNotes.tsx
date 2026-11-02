import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ReleaseNotes({ notes, version, title = 'O que mudou' }: { notes: string; version: string; title?: string }) {
  return <details className="release-notes-card" open>
    <summary>{title} <span className="release-version">v{version}</span></summary>
    <div className="release-notes" role="region" aria-label={`Notas da versão ${version}`} tabIndex={0}>
      <Markdown remarkPlugins={[remarkGfm]} skipHtml disallowedElements={['img']}
        components={{
          h1: ({ children }) => <h3>{children}</h3>,
          h2: ({ children }) => <h3>{children}</h3>,
          h3: ({ children }) => <h4>{children}</h4>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        }}>
        {notes.trim() || 'As notas desta versão ainda não estão disponíveis.'}
      </Markdown>
    </div>
  </details>;
}
