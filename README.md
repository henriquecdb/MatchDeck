# MatchDeck

Aplicativo modular de overlays para jogos. Primeira integração: Age of Empires II: Definitive Edition. Nome provisório, sem pesquisa de marca.

## Instalar no Windows

Baixe o instalador **MatchDeck_0.4.3_x64-setup.exe** na [página de releases](https://github.com/henriquecdb/MatchDeck/releases/latest) e execute-o. O usuário final não precisa instalar Node, Rust ou Visual Studio. Depois, siga a configuração guiada, identifique seu perfil na aba **Partida** e ative a detecção com o AoE2 em janela sem bordas.

Veja o [changelog da versão](CHANGELOG.md). O aplicativo verifica novas versões ao abrir e mostra as notas e o progresso da atualização. A instalação automática é opcional e exige que a detecção esteja desligada e não haja partida de demonstração ativa. Pacotes de atualização são verificados por assinatura. O executável ainda não possui certificado Authenticode de editor Windows.

Para contribuir, consulte [CONTRIBUTING.md](CONTRIBUTING.md). Para publicar versões, consulte [docs/releases.md](docs/releases.md).

## Estado atual

Protótipo com detecção real de multiplayer e partidas simuladas para testar posicionamento, opacidade e passagem de cliques. Ranqueadas e partidas rápidas são detectadas quando publicadas pela fonte. Lobbies convencionais dependem da cobertura da fonte. Skirmish offline continua disponível somente na demonstração; campanhas estão fora do escopo.

No navegador há uma prévia simulada. No Tauri há uma janela transparente, sempre no topo, arrastável e com passagem de cliques. Ctrl+Shift+O alterna a trava e Ctrl+Shift+H mostra/oculta somente a partida atual. Conflitos de atalhos são informados no painel e não impedem a inicialização; os controles também estão disponíveis no aplicativo. Ao fechar o painel, escolha continuar na bandeja ou encerrar todo o aplicativo. A preferência pode ser lembrada e alterada em Configurações.

Em **Configurações → Atalhos globais**, altere os modificadores e a tecla de cada ação, desative uma combinação ou restaure os padrões. **Salvar atalhos** aplica e persiste a mudança. Combinações duplicadas são rejeitadas; conflitos com outros aplicativos ou falhas ao salvar restauram os atalhos anteriores. Os controles do painel e da bandeja continuam disponíveis.

O modo **Compacto vertical** usa 360 px de largura e empilha os jogadores; o compacto horizontal existente usa 720 px e mantém as equipes lado a lado. Em duelos 1v1, os dois compactos dispensam os títulos de equipe. Os overlays não exibem horários de sincronização; a data continua disponível nos dados da demonstração e no diagnóstico.

Por padrão, partidas reais aparecem somente com o executável do Age 2 DE em primeiro plano. Desmarque essa opção em **Overlay** para continuar vendo os dados ao usar Alt+Tab. A demonstração permanece visível fora do jogo. Ocultar uma partida não encerra a detecção e não oculta automaticamente a próxima.

Estatísticas e rating vêm da fila correspondente à partida, sem substituir por rating ranqueado de outra modalidade. Dados não disponíveis aparecem como “—”. O catálogo inclui imagens transparentes e nomes em inglês e português de unidades de 56 civilizações, distribuídos localmente. Bordas e rating usam a cor informada para cada jogador na partida. Origem das imagens e traduções em `public/units/NOTICE.md`.

Em **Configurações → Idioma**, escolha português brasileiro ou inglês para a interface. O idioma de **Civilizações e unidades** é independente e começa em inglês, inclusive com a interface em português. As alterações são imediatas na prévia e no overlay e ficam salvas para a próxima abertura. A troca usa os catálogos locais e preserva os dados sincronizados da partida.

O painel usa navegação lateral recolhível, com ícones e a seção ativa em destaque. A barra se adapta à largura da janela, lembra sua escolha e permite navegar com as setas do teclado sem encerrar a demonstração ou a detecção.

## Demonstração com dados sincronizados

As funcionalidades ficam nas abas **Partida**, **Overlay**, **Demonstração**, **Atualizações**, **Configurações** e **Diagnóstico**. Trocar de aba não encerra a partida nem o monitoramento. A página de carregamento acompanha a inicialização e permite nova tentativa em caso de falha ou demora. Ela pode desaparecer rapidamente em uma abertura normal; não existe espera artificial. Em Configurações, use **Visualizar tela de carregamento** para inspecioná-la e consulte o tempo de inicialização da interface.

Desative a detecção real e escolha **Jogadores fictícios** ou **Última partida sincronizada** antes de clicar em **Iniciar demonstração**. A partida sincronizada preserva modalidade, mapa, jogadores, cores e estatísticas. A cópia aparece como **REPLAY DE TESTE**, com a data da sincronização, e não altera o registro original. A última fotografia é salva em `last-match.json` e continua disponível após reiniciar o app. A opção fictícia sempre usa dados de exemplo, mesmo que exista uma partida salva.

Com jogadores fictícios, selecione **Formato da demonstração** para testar 1v1, 2v2, 3v3 ou 4v4. As equipes e as cores são distintas, sem consultas à API. Os layouts de equipe preservam seus títulos para distinguir os lados.

## Layout e variação de rating

Na aba **Overlay → Modo de exibição**, escolha **Completo** (padrão) ou **Compacto**. A configuração persiste entre execuções. O completo mantém os cards com unidades e estatísticas detalhadas. O compacto é uma faixa horizontal com emblemas das civilizações, uma linha por jogador e colunas por equipe. Mostra cor, nome, rating e variação; o nome da civilização e o histórico de vitórias ficam no texto alternativo e nas dicas do jogador.

Um 1v1 compacto ocupa 720 × 108 pixels lógicos, contra 480 × 436 do completo; um 4v4 compacto ocupa 720 × 198. As equipes vêm da API. Em snapshots antigos de 1v1, os participantes aparecem separadamente; em partidas antigas de equipes sem essa informação, aparecem sob “Jogadores”, preservando os dados sem inventar alianças.

Durante partidas 1v1 de filas reconhecidas, o card apresenta uma projeção orientativa de vitória e derrota (`~+X` / `~−Y`). É um modelo Elo genérico com K=32 e divisor 400; não é o cálculo oficial do jogo. Partidas rápidas, calibração e regras específicas de fila podem produzir valores muito diferentes. Equipes, filas desconhecidas ou ratings ausentes exibem “—”. O card e o rodapé identificam a projeção como não oficial.

Quando a API confirma o término, o resultado efetivo (`ratingDiff`) é salvo na última fotografia sincronizada sem substituir o rating registrado no início. O overlay se esconde normalmente no final; na demonstração de uma partida concluída aparece **Resultado … confirmado**. Para arquivos antigos sem informações de fila/resultado, use **Atualizar últimos dados**.

Se a opção sincronizada estiver selecionada e ainda não houver fotografia salva, o primeiro teste busca a última partida do perfil configurado. Sem perfil ou dados salvos, escolha jogadores fictícios. **Atualizar últimos dados** permite buscar uma fotografia mais recente antes de iniciar o teste. Nos próximos testes com dados sincronizados, o arquivo local é reutilizado sem novas consultas. A prévia de navegador não acessa o arquivo de configuração do desktop.

## Posição, escala e leitura dos dados

Na aba **Overlay**, selecione o monitor e uma das nove posições prontas, com margem ajustável. O modo manual mantém as coordenadas X/Y em pixels físicos e o arraste; arrastar ativa o modo manual e libera a seleção fixa de monitor. A escala de 50% a 150% independe da opacidade. O posicionamento considera a área útil e o DPI do monitor; se a tela selecionada for desconectada, o aplicativo usa o monitor principal. Janelas maiores que a área útil permitem rolagem. **Restaurar posição, escala e opacidade** recupera uma configuração inicial.

O cabeçalho identifica a fila, o rating indica se é de partidas rápidas ou ranqueadas, e o rodapé informa a sincronização. Passe o mouse sobre valores ausentes para entender a limitação da fonte. A opção **Exibir projeção não oficial** controla apenas as estimativas; resultados confirmados continuam disponíveis.

Escolha também a exibição de rating, vitórias/derrotas e porcentagem. No compacto, as duas últimas informações ficam nas dicas dos jogadores. Seu jogador pode receber destaque quando o perfil for identificado. A aba Partida mostra o último resultado confirmado, com vitória/derrota quando informada pela fonte e a variação real, preservando o rating inicial.

## Bandeja, recuperação e diagnóstico

O ícone da bandeja reabre o painel e oferece controles de detecção, visibilidade, teste da última partida e saída. Abrir o MatchDeck novamente traz a instância existente para frente. Em **Configurações**, escolha iniciar com Windows, abrir minimizado e o comportamento ao fechar. Inicialização com Windows é opcional e só pode ser alterada na versão instalada. Se a bandeja falhar, o aplicativo mantém a janela acessível.

Após reiniciar, o monitor consulta a fonte antes de mostrar uma partida. Se a mesma partida salva ainda estiver em andamento, os dados iniciais são reutilizados. Se ela terminou enquanto o app estava fechado e a fonte retornar o resultado, ele é recuperado. Falhas de rede preservam o overlay atual e usam novas tentativas progressivas; **Consultar agora** reinicia a consulta sem apagar a partida.

Em **Diagnóstico**, prepare o relatório, revise a prévia e baixe o JSON localmente para compartilhar por sua escolha. Ele contém versão, plataforma, estado da detecção, última consulta bem-sucedida, atalhos, tempo de inicialização e até 60 eventos desta execução. Não inclui nomes, IDs de perfil/partida, pastas, credenciais ou respostas completas da API, e não é enviado automaticamente.

Na versão 0.4, preferências gerais ficam em `preferences.json` e os dados do Age 2 em `games/aoe2-de/{settings,detection,last-match}.json` no diretório de configuração do aplicativo. Arquivos das versões anteriores continuam sendo lidos quando ainda não existe uma cópia válida no diretório do jogo. A migração preserva perfil, posição, aparência, opção de atualização automática e última fotografia.

## Executar a prévia

Requer Node.js 22.12 ou superior.

```powershell
npm ci
npm run dev
```

Acesse http://127.0.0.1:1420. Inicie uma demonstração, ajuste a opacidade e encerre a partida. X/Y e passagem de cliques são funções da janela desktop; não reposicionam a prévia.

## Executar no Windows

Além do Node, instale Rust com toolchain MSVC, Visual Studio Build Tools com a carga de trabalho “Desktop development with C++” e o WebView2 Runtime. Consulte https://v2.tauri.app/start/prerequisites/.

```powershell
npm ci
npm run desktop
```

No painel, clique em **Identificar perfil local** e depois em **Ativar detecção**. Também é possível informar um Profile ID do AoE2 ou Steam ID numérico de 17 dígitos. O nome retornado permite verificar a conta selecionada. Inicie uma partida multiplayer no jogo em janela sem bordas e aguarde a publicação pela API. Consulte [detalhes e limitações da detecção](docs/real-detection.md).

Se o terminal não encontrar Cargo após instalar Rust, reabra o terminal ou execute `$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"` antes de iniciar.

Para gerar o instalador por usuário:

```powershell
npm run desktop:build
```

O instalador NSIS será gerado em `src-tauri/target/release/bundle/nsis/`. Para gerar os artefatos assinados de atualização, configure a chave conforme [docs/releases.md](docs/releases.md). A assinatura de atualização é distinta de assinatura de código Windows.

## Organização

```text
src/
  domain/          Modelos e regras independentes de interface
  application/     Contrato de runtime e sincronização do estado
  games/aoe2/      Dados de demonstração da integração AoE2
  infrastructure/ Adaptadores de navegador e Tauri
  features/
    detection/    Configuração e status da detecção real
    overlay/      Exibição da partida
    settings/     Painel de controle
src-tauri/src/
  detection/      Monitoramento, decisões de ciclo e tentativas
  games/aoe2/     Provedor HTTP, respostas e catálogo local
  model.rs        Contratos serializáveis
  commands.rs     Operações de início, fim e configuração
  overlay.rs      Controle da janela e publicação do estado
  storage.rs      Persistência de preferências
  main.rs         Composição e eventos nativos
```

O frontend depende de `OverlayRuntime`; o adaptador do navegador permite experimentar sem compilação nativa. `src/games/registry.ts` fornece contratos para arte, demonstração e capacidades, mantendo o código do Age 2 em seu adaptador. Apenas Age 2 está registrado; SC2 e Age IV ainda não estão implementados. O backend mantém uma fotografia da partida e ignora novos dados com o mesmo identificador. O monitoramento usa uma tarefa assíncrona cancelável, sem loop de renderização. A fotografia salva só é retomada como ativa depois da confirmação da fonte. As gravações são atômicas e a posição é persistida após uma pausa no arraste.

## Validação

```powershell
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo build --manifest-path src-tauri/Cargo.toml
```

Testes cobrem imutabilidade da fotografia, eventos duplicados, cálculo de vitórias, preferências inválidas, seleção de partidas em andamento, confirmação do encerramento e intervalo de tentativas. A compilação web não verifica o código Rust. O teste de API real é opt-in: `cargo test --manifest-path src-tauri/Cargo.toml live_api_smoke_test -- --ignored`.

Teste manual desktop: iniciar uma partida; mover a janela; ajustar opacidade; travar e clicar no aplicativo atrás; destravar com Ctrl+Shift+O; encerrar a partida; reiniciar e verificar preferências. Comece com o jogo em janela sem bordas. Tela cheia exclusiva ainda precisa de validação. As coordenadas são pixels físicos do desktop; use valores negativos para monitores à esquerda e “Restaurar posição” se a janela ficar fora da tela.

## Próximas etapas

1. Validar no uso real a bandeja, o início com Windows, partidas consecutivas, equipes, monitores e atualização da 0.4.
2. Repetir a prova de conceito de lobby personalizado com dois humanos; o teste com um humano e IA não produziu confirmação de partida em andamento.
3. Investigar as integrações de Age IV e StarCraft II; skirmish offline está adiado.
