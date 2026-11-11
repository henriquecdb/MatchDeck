# StarCraft II · testes locais

A integração da 0.6.0 está em Early Access. Usa a API local do SC2 durante a partida, replays locais para confirmar resultados e o SC2 Pulse para estatísticas públicas.

## Abrir a versão local

Execute npm run desktop:local na raiz. O executável gerado fica em src-tauri/target/debug/matchdeck.exe e usa os dados separados do MatchDeck Local.

## Perfil e demonstração

1. Escolha StarCraft II na tela inicial.
2. Na aba Partida, use **Identificar perfil local** ou cole um link do SC2 Pulse com type=character e id=…, um ID de personagem do Pulse ou um link oficial SC2 no formato /profile/REGIAO/REINO/ID.
3. Clique em Ativar detecção para validar e salvar o perfil. Para testar somente os dados, desative a detecção em seguida; o perfil permanece vinculado.
4. Abra Perfil para ver MMR, vitórias, derrotas, empates e até cinco partidas 1v1 de replays locais; sem replays compatíveis, usamos as partidas publicadas. Escolha a raça no seletor de modalidade.
5. Em Demonstração, use Jogadores fictícios para testar o layout ou Última partida sincronizada para buscar uma partida publicada desse perfil.

A identificação local examina somente os diretórios Accounts/CONTA/REGIAO-S2-REINO-PERFIL na pasta Documentos do Windows, incluindo Documentos redirecionados para OneDrive e a pasta antiga, quando existe. O identificador de personagem é conferido no SC2 Pulse antes de preencher o campo. Não lê senhas, não escolhe a conta mais recente e não altera os dados do jogo. Mais de um personagem exige informar o perfil manualmente; o perfil encontrado pode ser de um acesso antigo, portanto confira o nome retornado.

O número do SC2 Pulse é diferente do ID Battle.net. BattleTag sozinho não identifica um personagem e não é aceito como ID numérico. O link do perfil resolve também região e reino; estes são conferidos antes de salvar o ID canônico do Pulse.

Um perfil de outra pessoa pode ser usado para conferir estatísticas e demonstrações publicadas. Para a detecção da sua partida, vincule seu próprio personagem e confirme o nome retornado.

## Detecção real

Abra o StarCraft II, ative a detecção e inicie um 1v1 entre duas pessoas. Use janela sem bordas. O aplicativo consulta somente http://127.0.0.1:6119/game, sem proxy ou redirecionamentos, a cada dois segundos.

O cliente fornece nomes, raças, tempo de jogo e resultados. O app captura as estatísticas externas no início e mantém esses dados durante a partida. O fim é confirmado pelo resultado local ou pelo retorno ao menu em duas consultas consecutivas. Falhas de conexão preservam a captura atual; uma falha não vira resultado de derrota.

Partidas consecutivas são reconhecidas pela mudança de participantes ou pelo reinício do relógio. Alterações de raça revelada não criam uma nova captura. Trocar de jogo e encerrar a detecção usam os mesmos controles dos demais jogos.

## Dados e limites

- A API local não expõe o mapa, a equipe, a fila ou os IDs globais dos participantes. Portanto, não distingue com segurança ranqueadas, rápidas e personalizadas. Esta iteração se destina a 1v1 padrão; outros modos com apenas duas pessoas precisam de validação.
- Assistir a um replay não inicia um overlay ao vivo. Para o histórico local, são aceitos replays encerrados 1v1 entre humanos; IA, observadores e equipes ficam fora desta iteração.
- O MMR e o aproveitamento apresentados são os valores ranqueados por raça e temporada publicados pelo SC2 Pulse. Não representam um MMR não ranqueado separado.
- O adversário só recebe uma sugestão de perfil quando a busca exata por nome e região encontra um único personagem nos dados indexados. O overlay marca Perfil sugerido: o cliente não fornece um ID global que confirme a identidade. Homônimos, nomes não encontrados e raças sem dados ficam com —. Não há escolha por MMR aproximado nem exposição de BattleTags de terceiros.
- A variação da partida em andamento não é estimada. O histórico usa a variação publicada pela fonte; partidas antigas não recebem MMR atual como se fosse o inicial.
- O perfil usa cache de um minuto e atualização manual. Os gráficos pedem até 90 dias de dados e mostram os 30 últimos registros da temporada selecionada, sem juntar raças ou temporadas. Perfis inativos podem não ter registros nesse período.
- A consulta de perfil é independente da detecção. Não há monitoramento periódico de estatísticas externas durante a partida.
- Dados públicos podem atrasar. O histórico do Pulse pode estar vazio ou incompleto; o app não apresenta isso como histórico integral da conta.

## Validação antes da release

Conferir o perfil, histórico e demonstração; depois testar início/fim de um 1v1 real, duas partidas consecutivas, Alt+Tab, hotkeys e encerramento inesperado do cliente. A integração ainda não foi publicada; os testes do estado local usam respostas controladas enquanto essa validação manual estiver pendente.

Fontes: [SC2 Pulse API](https://sc2pulse.nephest.com/sc2/v3/api-docs), [cliente HTTP usado pelo projeto SC2 Pulse](https://github.com/sc2-pulse/reveal-sc2-opponent). Os contratos foram implementados no MatchDeck sem incorporar o código desses projetos. Créditos dos ícones em [NOTICE](../public/sc2/NOTICE.md).

Se o SC2 Pulse retornar um marcador de nome indisponível, como f#1, o perfil continua disponível pelo ID e aparece como SC2 #ID. As estatísticas publicadas continuam acessíveis. Para reconhecer seu jogador na partida, preencha Nome no jogo com o nome exato do personagem. A BattleTag pode ser diferente. O nome informado não altera o ID consultado, não recupera dados ausentes e não confirma a identidade de adversários.


## Sessão local

Na aba Partida, com seu perfil SC2 vinculado, use **Iniciar sessão** antes de entrar na fila.
O painel conta vitórias, derrotas, empates e aproveitamento e mostra os dez últimos resultados
confirmados por replays locais, com adversário, raça adversária, mapa e horário.
Inclui 1v1 entre pessoas de matchmaking e partidas personalizadas iniciadas após o começo da sessão.
A API local e as demonstrações não alimentam esse placar.

O início é explícito e a sessão continua após fechar o aplicativo ou passar da meia-noite.
Use **Encerrar sessão** depois de terminar a partida. Replays gravados com atraso ainda podem
completar o placar se a partida terminou antes do encerramento da sessão.
**Nova sessão** substitui o placar anterior. Cada perfil tem seu próprio arquivo local.
O monitor continua examinando até 32 replays recentes, portanto partidas jogadas com o app fechado
dependem dessa janela de recuperação. O painel usa os eventos do monitor para atualizar os resultados.

## Replays automáticos

Com o perfil SC2 vinculado e selecionado, o app acompanha Accounts/CONTA/REGIAO-S2-REINO-PERFIL/Replays/Multiplayer na pasta Documentos. Não é preciso ativar a detecção para consultar o histórico. Na primeira vinculação, o Pulse confirma o identificador Battle.net correspondente ao ID do perfil; arquivos de outros personagens são descartados.

O monitor usa notificações do Windows, espera a gravação estabilizar e lê somente os metadados, os dados dos participantes e o cabeçalho inicial. Não reproduz a partida nem lê o fluxo inteiro de eventos. Um cache por tamanho e data evita repetir a decodificação; a verificação de recuperação ocorre a cada minuto. São examinados até 32 arquivos recentes, com limite de 4096 entradas por pasta e 16 MiB por arquivo. Se o jogo estiver fechado, arquivos existentes continuam disponíveis.

O replay confirma mapa, raça e resultado. O campo competitivo do protocolo moderno não prova ranked/unranked: mostramos “matchmaking” para a fila automática. Protocolos sem um esquema de modalidade validado mostram “replay local”. Não usamos MMR negativo ou estatísticas atuais como se fossem o rating inicial daquela partida.

Dados são processados localmente, sem upload. O decoder tem limites de tamanho, profundidade e saída descomprimida; arquivos incompletos e formatos não suportados são ignorados sem encerrar a detecção ao vivo. O esquema inicial Base98310 deriva do s2protocol oficial da Blizzard sob MIT, com licença preservada em src-tauri/src/games/sc2/replay/LICENSE-Blizzard.txt.

Teste local: abrir o SC2 no MatchDeck, conferir as partidas na aba Perfil, jogar um 1v1 e voltar ao menu. O resultado deve ser confirmado poucos segundos após a gravação do replay. Para atualizar uma aba Perfil já aberta, use Atualizar perfil (cache de um minuto).
