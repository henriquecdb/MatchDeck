import { expect, it } from 'vitest';
import { defaultSettings, parseSettings } from './settings';

it('recovers missing settings and validates persisted coordinates and opacity', () => {
  expect(parseSettings(null)).toEqual(defaultSettings);
  expect(parseSettings({ opacity: 8, x: NaN, y: -500, locked: 'yes' }))
    .toEqual({ opacity: 1, x: 40, y: -500, locked: false, layout: 'detailed', autoUpdate: false });
});

it('migrates old preferences and preserves compact mode', () => {
  expect(parseSettings({ opacity: 0.8 }).layout).toBe('detailed');
  expect(parseSettings({ layout: 'compact' }).layout).toBe('compact');
  expect(parseSettings({ layout: 'unknown' }).layout).toBe('detailed');
});
