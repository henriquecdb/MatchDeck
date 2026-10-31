# Desenvolvimento

## Identidade dos commits

Configure sua identidade antes de criar commits. Neste repositório, a identidade inicial solicitada pelo proprietário é:

```powershell
git config user.name "Henrique Junqueira"
git config user.email "henriquecamposj@gmail.com"
git config user.useConfigOnly true
```

Os commits desta entrega usam essa identidade como autor e committer, sem trailers de coautoria. Os workflows não criam commits.

## Conventional Commits

Use `tipo(escopo opcional): descrição`, por exemplo:

```text
feat(overlay): add compact layout
fix(aoe2): handle negative AI profile identifiers
docs: document Windows installation
chore(release): prepare v0.2.0
```

Tipos aceitos incluem `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `style`, `revert` e `chore`. Mudanças incompatíveis usam `!` ou `BREAKING CHANGE:` no corpo.

`npm ci` instala um hook de `commit-msg` que valida o padrão com commitlint. Para um fluxo guiado semelhante ao Commitizen, execute `npm run commit`.

## Verificações

```powershell
npm ci
npm test
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Consulte [Publicação de versões](docs/releases.md) antes de criar uma tag de release.
