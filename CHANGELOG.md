# Changelog

As mudanças relevantes são registradas por versão. O projeto usa Semantic Versioning e Conventional Commits.

## [0.4.5] - 2026-11-03

### Adicionado

- Aba Perfil com rating, vitórias, derrotas e aproveitamento por modalidade do usuário vinculado.
- Histórico das últimas cinco partidas multiplayer encerradas disponíveis, com resultado, mapa, civilização e variação confirmada de rating.
- Cache de um minuto ao abrir o perfil, atualização manual, recuperação de falhas e indicação de dados ausentes. Sem consultas periódicas adicionais.

### Melhorado

- Textos mais objetivos em Partida, Overlay, Demonstração, Configurações, Atualizações e Diagnóstico, em português e inglês.
- Explicações de detecção e layouts em seções expansíveis. Avisos, limitações e controles permanecem acessíveis.

## [0.4.4] - 2026-11-03

### Corrigido

- Overlay completo permitido somente em duelos 1v1, com a opção desabilitada durante partidas de outros formatos.
- Preferência pelo completo usa automaticamente o compacto vertical em equipes e demais formatos, preservando o completo para o próximo 1v1.
- Dimensões da janela nativa acompanham o layout efetivamente exibido, inclusive na demonstração e com preferências salvas em versões anteriores.

## [0.4.3] - 2026-11-03

### Segurança

- Auditorias npm e RustSec no GitHub Actions, sem ignorar vulnerabilidades conhecidas.
- Build Windows independente para PRs e varredura ClamAV do executável e instalador, com hashes e relatório.
- Publicação de releases condicionada à aprovação das auditorias e varredura do pacote final.

### Adicionado

- Configuração independente dos atalhos globais de travar/destravar e mostrar/ocultar o overlay, mantendo Ctrl+Shift+O e Ctrl+Shift+H como padrões.
- Opções para desativar atalhos, restaurar padrões e validar combinações duplicadas, com recuperação dos atalhos anteriores em caso de conflito ou falha ao salvar.
- Compacto vertical com 360 px de largura, mantendo o compacto horizontal existente de 720 px.
- Demonstrações fictícias de 1v1, 2v2, 3v3 e 4v4, com equipes, civilizações e cores distintas.

### Melhorado

- Painel com navegação lateral recolhível, ícones, seleção em destaque, adaptação a janelas menores e preferência de navegação preservada entre aberturas.
- Removidos os horários de sincronização dos overlays e os títulos de equipe em duelos 1v1.
- Textos de ajuda exibem as combinações configuradas pelo usuário.

## [0.4.2] - 2026-11-03

### Adicionado

- Interface em português brasileiro ou inglês, incluindo overlay, carregamento e menu da bandeja.
- Seleção independente do idioma dos nomes das civilizações e unidades únicas, com inglês como padrão em ambos os idiomas da interface.
- Troca de idioma imediata e persistida entre reinícios, preservando configurações e dados das partidas.
- Notas da versão bilíngues, exibidas no idioma escolhido para a interface.

## [0.4.1] - 2026-11-03

### Corrigido

- Overlay de demonstração e partidas exibido acima das janelas comuns no Windows, sem roubar o foco.
- Recuperação da posição sempre no topo quando o Windows remove essa condição da janela.

## [0.4.0] - 2026-11-03

### Adicionado

- Ícone na bandeja para reabrir o painel, controlar a detecção, mostrar/ocultar o overlay, testar a última partida e sair.
- Inicialização opcional com Windows, abertura minimizada e escolha entre perguntar, continuar na bandeja ou encerrar ao fechar a janela.
- Proteção contra múltiplas instâncias e recuperação de acesso ao painel ao abrir o aplicativo novamente.
- Configuração guiada com perfil, posicionamento e demonstração, acessível novamente pelas configurações.
- Abas Configurações e Diagnóstico, com relatório revisável e download local sem nomes, IDs, pastas ou respostas completas da API.
- Resumo da última partida com resultado e variação de rating confirmados pela fonte, preservando o rating inicial.
- Escolha de exibição de rating, vitórias/derrotas e porcentagem de vitórias, além de destaque do próprio jogador.

### Melhorado

- Tela de carregamento com tratamento de erro da interface, aviso de inicialização demorada, nova tentativa e prévia manual nas configurações, sem atraso artificial na abertura.
- Tempo de inicialização da interface disponível nas configurações e no diagnóstico.
- Retomada da fotografia da mesma partida após reinício e recuperação do resultado de uma partida encerrada enquanto o app estava fechado.
- Consulta manual para retomar o monitoramento após falhas, mantendo a partida atual até confirmação positiva do fim.
- Preferências gerais separadas das configurações, perfil e partida salva do Age 2; arquivos antigos continuam sendo lidos na migração.
- Gravações atômicas de configuração e gravação de posição após o arraste, reduzindo operações de disco.
- Registro de integrações e capacidades, com arte e demonstração fornecidas pelo adaptador do jogo; somente Age 2 está disponível nesta versão.
- Nomes em português para as 56 civilizações e suas unidades, com origem fixada e verificação dos arquivos de imagem locais.

### Compatibilidade

- Mantidas as correções de ocultação da 0.3.1, os atalhos Ctrl+Shift+H e Ctrl+Shift+O e a assinatura do atualizador.
- Início com Windows é opcional e só pode ser alterado na versão instalada; opções de bandeja são desativadas se o ícone não estiver disponível.
- Ranqueadas e partidas rápidas continuam dependendo da API. Lobbies personalizados, especialmente contra IA, não têm cobertura garantida; skirmish offline permanece adiado.
- Diagnóstico registra eventos limitados à execução atual; não envia dados automaticamente.

## [0.3.1] - 2026-11-02

### Corrigido

- Ocultação do overlay no Windows por Ctrl+Shift+H, pelo botão da partida e pela mudança de foco: exibir e ocultar agora usam a mesma API nativa, evitando que o cache de visibilidade do Tauri ignore o comando de esconder.
- A exibição permanece sem ativação de foco e a ocultação não desliga a detecção.

### Melhorado

- Explicação da opção de projeção de rating: ela controla somente as estimativas com ~, enquanto resultados reais confirmados continuam visíveis.
- Teste nativo Windows para ciclos de exibir/ocultar sem roubar foco e testes de alteração da projeção durante uma demonstração nos dois layouts.

## [0.3.0] - 2026-11-02

### Adicionado

- Visibilidade de partidas reais acompanhando o foco do Age of Empires II: DE, com opção de manter o overlay no Alt+Tab.
- Atalho Ctrl+Shift+H e botão para mostrar ou ocultar somente a partida atual, sem encerrar a detecção.
- Seleção de monitor, nove posições prontas, margens e escala de 50% a 150%, independentes da opacidade.
- Recuperação de posições fora da área útil e adaptação a mudanças de monitor ou escala do Windows.
- Escolha explícita entre demonstração com jogadores fictícios e a última partida sincronizada.

### Melhorado

- Identificação da fila e do tipo de rating, horário da sincronização e explicações para estatísticas indisponíveis.
- Projeção não oficial de rating pode ser desativada sem ocultar resultados confirmados.
- Demonstrações permanecem visíveis fora do jogo; arrastar o overlay ativa o posicionamento manual.
- Preferências das versões anteriores são migradas com valores padrão para as novas opções.
- Janelas maiores que a área útil do monitor permitem rolagem.

### Publicação

- Checks e release usam a mesma chave de cache Rust para reaproveitar as dependências do perfil de testes da main.
- Testes, otimizações do executável, assinatura e formato de instalação foram preservados.

### Limitações conhecidas

- Início e fim das partidas continuam dependendo da API multiplayer. Skirmish offline permanece fora do escopo.
- O controle de foco reconhece o executável do Age 2 DE; tela cheia exclusiva continua sem validação.

## [0.2.1] - 2026-11-02

### Melhorado

- Changelog na aba Atualizações renderizado como Markdown, com títulos, listas, negrito, código e tabelas.
- Área de leitura com hierarquia visual, maior espaço, foco por teclado e rolagem adaptada à janela.
- Identificação da versão nas notas e mensagem alternativa quando não houver changelog disponível.
- Notas da versão instalada continuam acessíveis mesmo sem atualização pendente; o renderizador carrega apenas ao abrir a aba.

### Segurança

- Notas externas não executam HTML e não carregam imagens remotas.

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
[0.2.1]: https://github.com/henriquecdb/MatchDeck/compare/v0.2.0...v0.2.1
[0.3.0]: https://github.com/henriquecdb/MatchDeck/compare/v0.2.1...v0.3.0
[0.3.1]: https://github.com/henriquecdb/MatchDeck/compare/v0.3.0...v0.3.1
[0.4.0]: https://github.com/henriquecdb/MatchDeck/compare/v0.3.1...v0.4.0

[0.4.1]: https://github.com/henriquecdb/MatchDeck/compare/v0.4.0...v0.4.1

[0.4.2]: https://github.com/henriquecdb/MatchDeck/compare/v0.4.1...v0.4.2

[0.4.3]: https://github.com/henriquecdb/MatchDeck/compare/v0.4.2...v0.4.3

[0.4.4]: https://github.com/henriquecdb/MatchDeck/compare/v0.4.3...v0.4.4
