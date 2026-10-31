import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const metadata = JSON.parse(readFileSync('package.json', 'utf8'));
const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const cargo = readFileSync('src-tauri/Cargo.toml', 'utf8').match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const tag = `v${metadata.version}`;
if (config.version !== metadata.version || cargo !== metadata.version) throw new Error('Package, Cargo and Tauri versions must match');
if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== tag) throw new Error(`Release tag must be ${tag}`);
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const escapedVersion = metadata.version.replaceAll('.', '\\.');
const section = changelog.match(new RegExp(`^## \\[${escapedVersion}\\].*\\r?\\n([\\s\\S]*?)(?=^## \\[|^\\[[^\\]]+\\]:|$(?![\\s\\S]))`, 'm'))?.[1]?.trim();
if (!section) throw new Error(`Missing changelog for ${metadata.version}`);
const notes = `## Instalar no Windows\n\nBaixe **MatchDeck_${metadata.version}_x64-setup.exe** nos arquivos deste release e execute o instalador. Não é necessário instalar Node, Rust ou ferramentas de desenvolvimento.\n\n${section}\n`;
writeFileSync('release-notes.md', notes);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\nbody<<MATCHDECK_RELEASE_NOTES\n${notes}\nMATCHDECK_RELEASE_NOTES\n`);
}
console.log(`Prepared ${tag}`);
