import { readFileSync, writeFileSync } from 'node:fs';
const headers = { 'User-Agent': 'MatchDeck (https://github.com/henriquecdb/MatchDeck)' };
const commit = { sha: 'e56728e76b7d08301fba7b18d5f16bc8554c109a' };
if (!commit.sha) throw new Error('Missing source revision');
const translations = new Map();
const clean = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
for (const prefix of ['data', 'chronicles/data', 'ror/data']) {
  const responses = await Promise.all(['en', 'br'].map(locale => fetch(`https://raw.githubusercontent.com/SiegeEngineers/aoe2techtree/${commit.sha}/${prefix}/locales/${locale}/strings.json`, { headers })));
  if (responses.some(response => !response.ok)) continue;
  const [english, portuguese] = await Promise.all(responses.map(response => response.json()));
  for (const [id, name] of Object.entries(english)) if (typeof name === 'string' && typeof portuguese[id] === 'string' && !translations.has(clean(name))) translations.set(clean(name), clean(portuguese[id]));
}
const catalog = JSON.parse(readFileSync('src/games/aoe2/unit-catalog.json', 'utf8'));
const missing = new Set();
const aliases = { Incas: 'Inca', Mayans: 'Maya' };
const translate = value => { const key = aliases[value] ?? value; if (!translations.has(key)) missing.add(value); return translations.get(key) ?? value; };
const localized = Object.fromEntries(Object.entries(catalog).map(([key, value]) => [key, { name: translate(value.name), units: value.units.map(translate) }]));
writeFileSync('src/games/aoe2/pt-BR.json', JSON.stringify(localized, null, 2) + '\n');
if (missing.size) throw new Error('Missing translations: ' + [...missing].join(', '));
console.log(JSON.stringify({ revision: commit.sha, civilizations: Object.keys(localized).length, missing: [...missing] }));
