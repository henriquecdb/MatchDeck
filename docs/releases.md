# Publicação de versões

Consulte também [Verificações de segurança](security.md). A publicação exige auditorias de dependências e varredura do executável e instalador. Uma falha mantém a release em rascunho, sem disponibilizá-la ao atualizador.

O workflow prepara a release em rascunho e não a publica automaticamente. Após a execução aprovada, confira a assinatura do atualizador, os hashes e a verificação do pacote final no antivírus antes de publicar com `gh release edit v<VERSÃO> --draft=false --latest`. Versões já publicadas não podem ser sobrescritas pelo workflow.

## Instalação pelo usuário final

Acesse [Releases](https://github.com/henriquecdb/MatchDeck/releases/latest), baixe `MatchDeck_<versão>_x64-setup.exe` e execute o instalador. A instalação é por usuário. Node, Rust e Visual Studio não são necessários no computador do usuário final. O instalador trata a dependência do WebView2.

O pacote do atualizador é assinado com uma chave própria do MatchDeck. Essa assinatura não equivale a um certificado Authenticode de editor Windows.

## Atualizações dentro do aplicativo

A versão instalada verifica o manifesto HTTPS `releases/latest/download/latest.json` ao abrir e a cada quatro horas, mesmo com outra aba selecionada. A aba **Atualizações** mostra a versão instalada, a nova versão e suas notas. **Instalar versão …** baixa e verifica a assinatura antes de iniciar o instalador.

Uma tela mostra a mudança de versão e o progresso de download. O instalador Windows continua com sua própria barra de progresso e reinicia o aplicativo. No retorno, o painel confirma a mudança de versão. Falhas de rede ou assinatura são exibidas e permitem tentar novamente; pacotes com assinatura inválida não são instalados.

Para instalar sem clicar a cada versão, marque **Instalar automaticamente com a detecção desativada**. Nenhuma instalação começa com uma partida de demonstração ou detecção real ativa. Em desenvolvimento, a instalação fica desativada. Os testes automatizados cobrem o fluxo, progresso e falhas com um provedor controlado; uma instalação entre versões deve ser validada também no aplicativo instalado.

## Chave de assinatura

A chave privada de atualização fica fora do repositório, em `%USERPROFILE%/.matchdeck/keys/updater.key`. Faça uma cópia de segurança privada: a continuidade das atualizações depende dessa chave. Apenas a chave pública está no `tauri.conf.json`.

O workflow recebe a chave privada pelo secret de repositório `TAURI_SIGNING_PRIVATE_KEY`. Não publique a chave, não a adicione ao Git e não a inclua nos arquivos de release. Ela não é um certificado de assinatura de código Windows.

## Criar o próximo release

1. Atualize `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` e `src-tauri/tauri.conf.json` para a mesma versão SemVer.
2. Adicione a seção correspondente no `CHANGELOG.md`.
3. Execute as verificações de `CONTRIBUTING.md` e `node scripts/release-notes.mjs`.
4. Faça um commit Conventional Commit em uma branch, por exemplo `chore(release): prepare v0.3.0`, e abra um PR com título também convencional.
5. Aguarde os checks, integre o PR e atualize sua `main` local. A branch protegida não aceita integração sem o check obrigatório.
6. Crie a tag da versão sobre a `main` integrada e envie a tag.

```powershell
git switch main
git pull --ff-only origin main
git tag -a v0.3.0 -m "MatchDeck v0.3.0"
git push origin v0.3.0
```

O workflow **Release Windows** verifica o projeto, cria um release em rascunho, compila o instalador, assina o pacote do atualizador e envia instalador, assinatura e `latest.json`. Só publica quando todos os arquivos estão prontos. Em caso de falha, o rascunho permanece disponível para diagnóstico. O workflow também pode ser executado manualmente com uma tag existente.

## Build local de distribuição

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "$env:USERPROFILE\.matchdeck\keys\updater.key"
npm run desktop:build
```

Os arquivos ficam em `src-tauri/target/release/bundle/nsis/`. O release público deve conter o instalador, a assinatura `.sig` e o manifesto `latest.json`. O workflow gera esse manifesto automaticamente.
