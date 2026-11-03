import type { MatchSnapshot } from './match';
import type { OverlaySettings } from './settings';
import { isDuel } from './teams';

export function resolveOverlayLayout(layout: OverlaySettings['layout'], match: MatchSnapshot): OverlaySettings['layout'] {
  return layout === 'detailed' && !isDuel(match) ? 'stacked' : layout;
}
