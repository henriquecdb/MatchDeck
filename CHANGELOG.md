# Changelog

As mudanças relevantes são registradas por versão. O projeto usa Semantic Versioning e Conventional Commits.

## [0.9.0] - 2026-11-13

### Adicionado

- Sessões locais no Age of Empires II: DE e Age of Empires IV, com início e encerramento manuais, placar, aproveitamento e dez últimos resultados salvos por jogo e perfil.
- Faixa opcional da sessão nos overlays dos dois jogos, com vitórias, derrotas, empates e sequência de resultados.
- Resumo pós-partida com resultado confirmado pela fonte, adversário ou equipe, mapa, duração e variação publicada quando disponíveis. Tempo de exibição configurável.
- Demonstração de vitória, derrota e empate no pós-partida dos dois jogos, sem alterar sessões reais; no Age 2, acompanha o formato de 1v1 a 4v4.
- Layout compacto vertical no Age 4, selecionável na aba Overlay e compatível com os perfis de layout.

### Corrigido

- Resultados atrasados enriquecem a mesma partida sem duplicar a contagem da sessão; partidas sem decisão confirmada não viram derrotas.
- O resumo respeita perfil, jogo, foco e ocultação manual, sem abrir partidas antigas ao iniciar ou substituir uma nova partida em andamento.
- A duração do Age 4 usa o valor informado pela fonte, sem confundir o horário de atualização do registro com o encerramento da partida.
- O valor false no campo de encerramento do Age 2 não é tratado como fim de partida.

### Cobertura

- Age 2 acompanha as modalidades já detectadas pelo aplicativo, incluindo equipes. Age 4 continua restrito a ranqueadas e rápidas de PC em 1v1.
- A contagem depende dos resultados publicados nas consultas recentes das fontes; não representa um histórico integral de jogos realizados com o aplicativo fechado.

## [0.8.0] - 2026-11-12

### Adicionado

- Resumo pós-partida no overlay do SC2 com resultado confirmado por replay, adversário, mapa, duração e placar da sessão. Tempo configurável de 0 a 30 segundos.
- Demonstração do pós-partida com vitória, derrota ou empate e dados fictícios.
- Histórico local por identidade do personagem, com retrospecto e último encontro no resumo quando o replay confirma um adversário já registrado.
- Placar da sessão por raça adversária e consulta de resultados por mapa sob demanda.
- MMR inicial, última consulta e variação da sessão por raça e temporada, com estados de consulta, falha e ausência de registro inicial, além de atualização manual.
- Perfis de layout por jogo para salvar e restaurar posição, monitor, escala, opacidade e opções de exibição.

### Melhorado

- Cache persistente do SC2 Pulse, reaproveitamento de consultas simultâneas, espera após falhas e respeito ao Retry-After.
- Overlay exibe os jogadores assim que a API local responde e carrega as estatísticas em segundo plano, preservando o estado da partida e a ocultação manual.
- Dados de contingência indicam cache e horário da consulta; falhas no histórico ou gráfico não apagam as estatísticas disponíveis.

### Corrigido

- Proteção contra respostas atrasadas após fim da partida ou troca de perfil.
- Preservação de cache inválido para recuperação, sem sobrescrita ao iniciar.
- Recuperação de consultas de MMR interrompidas e proteção contra tentativas simultâneas e valores iniciais retroativos.
- Proporção do botão de teste pós-partida alinhada aos demais botões.

## [0.7.0] - 2026-11-11

### Adicionado

- Sessões locais do SC2 com início e encerramento manuais, placar e dez últimos resultados confirmados por replay.
- Faixa de sessão no overlay com vitórias, derrotas, aproveitamento e sequência de resultados. Exibição opcional na aba Overlay.
- Placar salvo por perfil, com recuperação após reabrir o aplicativo e proteção contra resultados duplicados.

### Melhorado

- Overlay de confronto do SC2 mais compacto, com raça, nome e MMR em duas linhas.
- Textos mais objetivos no painel de sessão. Detalhes da contagem ficam em Sobre a sessão.
- Demonstração da faixa com resultados fictícios e dimensionamento da janela conforme a exibição da sessão.

### Corrigido

- Cálculo do horário de início dos replays na velocidade Faster, evitando descartar partidas válidas da sessão.
- Atualizações da sessão por eventos, preservando resultados recentes quando uma leitura anterior termina depois.

### Validação

- Overlay de confronto, faixa de sessão e contagem de resultados validados pelo usuário em partidas reais.

## [0.6.0] - 2026-11-06

### Adicionado

- Leitura automática de replays locais do SC2 para confirmar mapa e resultado e exibir até cinco partidas 1v1, com monitor de arquivos, cache e limites de processamento.
- Identificação local do Age 4 (Steam) e do SC2 pela pasta Documentos do Windows, incluindo OneDrive, com validação na fonte e sem escolher entre múltiplos perfis.
- Ícone tradicional do SC2, extraído do executável instalado e distribuído localmente.
- Integração Early Access de StarCraft II com seleção de jogo, demonstração e overlay compacto de duas linhas.
- Perfil SC2 via ID do SC2 Pulse ou link de perfil SC2/Pulse, usando a estrutura de estatísticas, últimas cinco partidas e gráfico dos outros jogos.
- MMR, vitórias, derrotas e empates separados por raça e temporada. Até 30 registros de MMR por gráfico, consultando os últimos 90 dias da temporada publicada.
- Detecção pela API HTTP local do cliente SC2, com capturas de estatísticas no início, confirmação do encerramento e reconhecimento de partidas consecutivas.
- Dados, configurações e cache independentes por jogo. Não exige credenciais privadas da Blizzard.

### Melhorado

- Último resultado vinculado ao perfil configurado em cada jogo, com busca automática e vitória/derrota destacadas por cor e negrito.
- Emblemas locais das raças SC2 e identificação pelo nome do personagem quando o Pulse não publica um nome válido.
- Empates preservados no histórico e considerados no aproveitamento, sem classificá-los como derrotas.
- Diagnóstico, idiomas, atalhos, foco do jogo e demonstração adaptados ao SC2.

### Limitações

- Primeira iteração destinada a 1v1 entre duas pessoas. Replays, IA e formatos com mais jogadores não ativam o overlay. A API local não informa equipe, mapa ou fila; o app não afirma se a partida é ranqueada, rápida ou personalizada.
- MMR e estatísticas do overlay são os valores ranqueados publicados pelo SC2 Pulse para a raça. Correspondências únicas de nome/região aparecem como Perfil sugerido, sem afirmar uma identidade confirmada pelo cliente. Nomes ambíguos e dados ausentes ficam sem estatísticas.
- A variação da partida ao vivo não é estimada; aparece no histórico quando publicada. MMR atual não substitui o MMR inicial de partidas históricas.
- Integração SC2 em Early Access. Mapa e resultado podem ser confirmados por replay local; matchmaking não distingue ranqueadas de não ranqueadas.

## [0.5.2] - 2026-11-04

### Adicionado

- Gráfico no perfil do Age 2 para filas 1v1 ranqueadas e rápidas, usando o histórico publicado de cada modalidade, sem consultas adicionais.
- Aba Perfil do Age 4 com estatísticas por modalidade e até cinco partidas multiplayer encerradas, reutilizando a estrutura e o cache do Age 2.
- Gráfico de evolução com até 30 registros recentes de rating publicados pelo AoE4 World, datas e valores ao passar o mouse ou navegar pelo teclado. Pontos ranqueados, MMR e modalidades permanecem separados; a temporada é indicada quando disponível.

### Corrigido

- Classificação geral não ranqueada identificada como Não ranqueado, sem atribuí-la exclusivamente a lobbies personalizados.

- Seletor de jogos da barra lateral sobrepondo corretamente os botões do painel, inclusive na navegação recolhida.
- Leitura de jogadores encapsulados no campo player e de partidas com estado processed retornados pelo AoE4 World.

### Limitações

- O gráfico usa o histórico recente incluído na resposta do perfil, sem buscar todo o histórico da conta. Não há consultas extras durante a partida.
- As cinco partidas são selecionadas entre as dez mais recentes publicadas. Partidas privadas, em andamento, descartadas e modalidades não suportadas não entram na lista.
- O overlay ao vivo do Age 4 continua limitado a 1v1; consultar estatísticas de equipes não habilita sua detecção.

## [0.5.1] - 2026-11-04

### Corrigido

- Vinculação de perfis do Age 4 por Steam ID ou por links do AoE4 World que usam o Steam ID.
- O aplicativo agora confirma o Steam ID na resposta da fonte e salva o ID interno para detectar partidas corretamente. Respostas de perfis diferentes continuam sendo rejeitadas.
- Testes de regressão para IDs internos, Steam IDs, links e respostas inválidas.

## [0.5.0] - 2026-11-04

### Adicionado

- Integração experimental de Age of Empires IV para 1v1 ranqueado e rápido, quando publicado pelo AoE4 World.
- Overlay horizontal do Age 4 com civilização, liga, nome, posição no ranking, pontos/rating, vitórias, derrotas e aproveitamento. Ícones e bandeiras são distribuídos localmente.
- Vinculação por ID ou link do AoE4 World e demonstração fictícia 1v1. Equipes, lobbies personalizados e histórico do Age 4 ficam fora desta versão.
- Tela inicial com cartões dos jogos, troca rápida pela lateral e preferência para abrir no último jogo usado.
- Perfis, configurações e cache separados por jogo. A troca encerra o monitoramento anterior e fica bloqueada durante partidas e demonstrações.
- Build MatchDeck Local com dados separados da instalação normal para testes de desenvolvimento.

### Melhorado

- Verificação de atualizações preservada na tela inicial e durante a navegação, sem reiniciar o serviço ao trocar de tela.
- Detecção desativada ao abrir a seleção inicial. A retomada do último jogo pode ser habilitada nas configurações.
- Compatibilidade com os dados e as configurações existentes do Age 2.

### Limitações

- A integração do Age 4 depende da cobertura e do tempo de publicação do AoE4 World. Dados ausentes aparecem como —, sem usar estatísticas de outra modalidade.
- No Age 4 ranqueado, o número principal representa pontos ranqueados; não é o MMR de pareamento.

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
