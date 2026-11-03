# Desenvolvimento

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

No GitHub, o check obrigatório **Conventional Commits** valida todos os commits do PR e o título do PR, usado no squash merge. A validação também roda nos pushes de `main`. Mensagens inválidas bloqueiam a integração; ignorar o hook local não ignora o GitHub Actions. Abra uma branch e um PR para contribuir.

Ao integrar por squash, valide a mensagem final completa, incluindo o corpo. O limite do corpo é de 100 caracteres por linha. Uma mensagem criada apenas no momento da integração não passa pelo hook local nem pela validação anterior dos commits do PR. Grave a mensagem pretendida em um arquivo e execute `npx --no -- commitlint --edit caminho-do-arquivo` antes do merge.

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
