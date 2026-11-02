# Changelog

As mudanças relevantes são registradas por versão. O projeto usa Semantic Versioning e Conventional Commits.

## [0.2.0] - 2026-11-02

### Adicionado

- Abas Partida, Overlay, Demonstração e Atualizações, com navegação por teclado.
- Tela de carregamento desde a abertura da página até a inicialização, com recuperação em caso de falha.
- Emblemas locais das 56 civilizações para o modo compacto.
- Identificação e agrupamento das equipes conforme os dados da partida.

### Alterado

- Modo compacto redesenhado como faixa horizontal: uma linha por jogador e colunas por equipe, com cor, emblema, nome, rating e variação.
- Janela compacta com 720 × 108 pixels lógicos em 1v1 e 720 × 198 em 4v4, reduzindo substancialmente a altura ocupada.
- O modo completo mantém os cards com imagens das unidades e estatísticas detalhadas.
- Detecção, demonstração, preferências e verificação de atualizações permanecem ativas ao navegar pelas abas.
- Progresso de instalação permanece visível mesmo quando outra aba estiver selecionada.
- Restauração de posição e opacidade preserva o layout escolhido e a preferência de atualização automática.

### Compatibilidade

- As preferências e partidas sincronizadas de 0.1.0 continuam funcionando. Quando uma partida antiga não contém equipes, a interface não inventa associações entre jogadores.
- Permanecem as limitações de detecção da versão anterior: dependência da API multiplayer, sem skirmish offline ou campanhas, e projeções de rating não oficiais.

## [0.1.0] - 2026-10-31

### Adicionado

- Aplicativo Windows com Tauri, Rust, React e TypeScript, com arquitetura modular para novas integrações.
- Overlay transparente, sempre no topo, com posição e opacidade configuráveis e passagem de cliques para o jogo.
- Layouts completo e compacto com preferências persistidas.
- Detecção de partidas multiplayer de Age of Empires II: Definitive Edition por perfil, com descoberta do perfil Steam local.
- Exibição de jogadores, civilizações, rating da fila, vitórias, derrotas e porcentagem de vitórias.
- Imagens transparentes de unidades únicas de 56 civilizações, incluídas no instalador.
- Identificação visual pela cor do jogador na partida.
- Projeção orientativa de ganho/perda de rating para 1v1 e armazenamento da variação real quando confirmada pela API.
- Demonstração com a última partida sincronizada, preservada localmente entre execuções.
- Consultas com timeout, intervalo progressivo em falhas e proteção contra eventos duplicados.
- Verificação de atualizações pelo GitHub Releases, notas da versão e progresso de download e instalação.
- Instalação automática opcional de atualizações assinadas, com detecção e partidas desativadas.
- Instalador Windows x64 por usuário e pipeline de release com artefatos assinados para o atualizador.

### Corrigido

- Leitura do histórico com jogadores de IA de identificador negativo.
- Inicialização quando o atalho global já está ocupado por outro aplicativo.
- Associação das estatísticas à fila correta, incluindo partidas rápidas.

### Limitações conhecidas

- A publicação de início e fim depende de uma API comunitária e pode atrasar.
- Skirmish offline e campanhas não são detectados; skirmish está disponível na demonstração fictícia.
- A projeção de rating usa Elo genérico K=32 e pode divergir, especialmente em partidas rápidas e calibração.
- O overlay deve ser usado com o jogo em janela sem bordas; tela cheia exclusiva não está validada.
- A assinatura do atualizador valida os pacotes; o executável ainda não tem certificado Authenticode de editor Windows.

[0.1.0]: https://github.com/henriquecdb/MatchDeck/releases/tag/v0.1.0
[0.2.0]: https://github.com/henriquecdb/MatchDeck/compare/v0.1.0...v0.2.0
