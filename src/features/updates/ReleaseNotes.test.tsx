// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ReleaseNotes } from './ReleaseNotes';

afterEach(cleanup);

it('renders release headings, lists, emphasis, code and GitHub tables', () => {
  render(<ReleaseNotes version="0.2.1" notes={'## Instalar no Windows\n\nBaixe **MatchDeck** e execute `setup.exe`.\n\n### Alterado\n\n- Notas formatadas\n- Leitura mais confortável\n\n| Versão | Estado |\n| --- | --- |\n| 0.2.1 | Disponível |'} />);
  const region = screen.getByRole('region', { name: 'Notas da versão 0.2.1' });
  expect(within(region).getByRole('heading', { name: 'Instalar no Windows' })).toBeTruthy();
  expect(within(region).getAllByRole('listitem')).toHaveLength(2);
  expect(within(region).getByText('MatchDeck').tagName).toBe('STRONG');
  expect(within(region).getByText('setup.exe').tagName).toBe('CODE');
  expect(within(region).getByRole('table')).toBeTruthy();
});

it('does not execute raw HTML, load remote images or allow script links', () => {
  const { container } = render(<ReleaseNotes version="0.2.1" notes={'<script>alert(1)</script>\n\n![tracking](https://example.com/tracking.png)\n\n[link](javascript:alert(1))'} />);
  expect(container.querySelector('script')).toBeNull();
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('a')?.getAttribute('href')).not.toContain('javascript:');
});

it('shows a useful fallback for empty release notes', () => {
  render(<ReleaseNotes notes="  " version="0.2.1" />);
  expect(screen.getByText('As notas desta versão ainda não estão disponíveis.')).toBeTruthy();
});
