import { expect, it } from 'vitest';
import { defaultSettings, parseSettings } from './settings';

it('recovers missing settings and validates persisted coordinates and opacity', () => {
  expect(parseSettings(null)).toEqual(defaultSettings);
  expect(parseSettings({ opacity: 8, x: NaN, y: -500, locked: 'yes' }))
    .toEqual({ ...defaultSettings, opacity: 1, x: 40, y: -500 });
});

it('migrates old preferences and bounds scale, margin and placement', () => {
  expect(parseSettings({ opacity: 0.8 })).toMatchObject({ scale: 1, focusOnly: true, showProjection: true, anchor: 'manual', monitorId: null, margin: 16 });
  expect(parseSettings({ scale: Infinity, margin: -10, anchor: '__proto__' })).toMatchObject({ scale: 1, margin: 0, anchor: 'manual' });
  expect(parseSettings({ scale: 8, margin: 999, anchor: 'bottom-right', monitorId: 'display', focusOnly: false, showProjection: false }))
    .toMatchObject({ scale: 1.5, margin: 200, anchor: 'bottom-right', monitorId: 'display', focusOnly: false, showProjection: false });
});

it('migrates old preferences and preserves compact mode', () => {
  expect(parseSettings({ opacity: 0.8 }).layout).toBe('detailed');
  expect(parseSettings({ layout: 'compact' }).layout).toBe('compact');
  expect(parseSettings({ layout: 'unknown' }).layout).toBe('detailed');
  expect(parseSettings({}).showSession).toBe(true);
  expect(parseSettings({ showSession: false }).showSession).toBe(false);
});

it('migrates and clamps post-game duration including explicit disable', () => {
  expect(parseSettings({}).postGameSeconds).toBe(8);
  expect(parseSettings({ postGameSeconds: 0 }).postGameSeconds).toBe(0);
  expect(parseSettings({ postGameSeconds: 99 }).postGameSeconds).toBe(30);
  expect(parseSettings({ postGameSeconds: -5 }).postGameSeconds).toBe(0);
  expect(parseSettings({ postGameSeconds: NaN }).postGameSeconds).toBe(8);
});
