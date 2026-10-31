import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { expect, it } from 'vitest';
import catalog from './unit-catalog.json';

it('bundles a real transparent cutout for every catalogued civilization', () => {
  for (const entry of Object.values(catalog)) {
    const png = PNG.sync.read(readFileSync(`public${entry.image}`));
    let transparent = false;
    let visible = false;
    for (let offset = 3; offset < png.data.length; offset += 4) {
      if (png.data[offset] === 0) transparent = true;
      if (png.data[offset] > 0) visible = true;
    }
    expect(transparent, `${entry.name}: transparent background`).toBe(true);
    expect(visible, `${entry.name}: visible artwork`).toBe(true);
  }
});
