import { expect, it } from 'vitest';
import { releaseSection } from './changelog';

it('extracts only the installed version and omits older releases and reference links', () => {
  const source = '# Changelog\n\n## [0.2.1] - 2026-11-02\n\n### Melhorado\n\n- Markdown\n\n## [0.2.0] - 2026-11-02\n\n- Abas\n\n[0.2.0]: https://example.com';
  expect(releaseSection(source, '0.2.1')).toBe('### Melhorado\n\n- Markdown');
  expect(releaseSection(source, '0.2.0')).toBe('- Abas');
  expect(releaseSection(source, '1.0.0')).toBe('');
});
