# Detecção real de AoE2

## Como testar

1. Execute `npm run desktop` na pasta do projeto. `npm run dev` sozinho abre apenas a prévia web.
2. Clique em **Identificar perfil local**. O app procura uma única pasta Steam em `%USERPROFILE%/Games/Age of Empires 2 DE` e resolve seu identificador público para Profile ID do AoE2.
3. Confira o nome e clique em **Ativar detecção**. Se a descoberta não funcionar, informe o Profile ID ou Steam ID manualmente.
4. Abra uma ranqueada ou partida rápida multiplayer, com o jogo em janela sem bordas.
5. Aguarde a fonte publicar a partida. O painel informa a última consulta concluída, carregamento e erros.
6. O overlay exibe uma fotografia dos dados e permanece até a fonte confirmar o encerramento. Desativar a detecção também o esconde. A configuração é restaurada na próxima execução.

## Fontes e comportamento

- Partidas: `GET https://data.aoe2companion.com/api/matches?profile_ids=PROFILE_ID`.
- Perfil e estatísticas por fila: `GET https://data.aoe2companion.com/api/profiles/PROFILE_ID`.
- Resolução Steam → Profile ID: `GET https://aoe-api.worldsedgelink.com/community/leaderboard/getpersonalstat?title=age2&profile_names=["/steam/STEAM_ID"]`, com parâmetros codificados pelo cliente HTTP.
- O código não usa o parâmetro `ongoing=true`: a resposta observada continha partidas concluídas mesmo com esse parâmetro. O cliente filtra o campo `finished` e verifica o perfil participante.
- As consultas de partidas ocorrem 20 segundos após a consulta anterior. Falhas aumentam esse intervalo para 40, 80 e no máximo 120 segundos. Cada requisição tem timeout de 15 segundos. Não há requisições sobrepostas do monitor.
- As estatísticas são carregadas em paralelo para até oito participantes somente ao detectar um novo identificador. Falhas de carregamento recebem até duas tentativas adicionais antes da fotografia. Após a captura os números não mudam durante a partida.
- As respostas do histórico são desserializadas e validadas. Somente partidas dos modos convencionais reconhecidos, do perfil selecionado e iniciadas nas últimas 12 horas podem iniciar o overlay. A partida mais recente prevalece sobre registros antigos ainda sem encerramento.
- Um erro HTTP, JSON incompatível ou ausência da partida na resposta não confirma o fim. O overlay atual é preservado. O encerramento requer confirmação positiva do mesmo ID, ou a identificação de uma nova partida para substituí-lo.
- Desativar o monitor cancela consultas e carregamentos em andamento. Trocar o perfil exige desativar e reativar a detecção.

## Limites desta versão

O monitor não lê memória do jogo nem injeta código. Ele acompanha o perfil configurado; portanto pode encontrar a partida mesmo que o jogo esteja aberto em outra máquina. Não há ainda controle de visibilidade baseado no foco do jogo.

A latência depende da fonte externa; não existe garantia de exibição imediata na tela de carregamento nem de ocultação imediata ao sair. Uma confirmação de término atrasada pode manter o overlay após o final. Use **Desativar detecção** quando precisar escondê-lo manualmente.

Ranqueadas e partidas rápidas usam o mesmo mecanismo. Lobbies não publicados pela fonte não são detectados. Skirmish offline, campanhas e cenários personalizados não estão implementados pelo detector. O suporte simulado a skirmish permanece disponível com a detecção desligada.

Os nomes e imagens transparentes das unidades vêm de um catálogo local de 56 civilizações. Civilizações desconhecidas mostram um indicador de imagem indisponível. A cor da API é preservada em cada jogador, inclusive no replay de teste. O rating não é apresentado como ranqueado quando vem de uma fila não ranqueada.

A fotografia sincronizada é salva em `last-match.json` para os testes de demonstração. Ela não é restaurada como partida ativa. O modo demonstração preserva os dados originais e sinaliza **REPLAY DE TESTE**. No primeiro teste com perfil configurado e sem arquivo salvo, o app consulta a última partida disponível; nos seguintes usa o cache local. **Atualizar últimos dados** faz uma nova consulta explícita.

No encerramento confirmado, o monitor acrescenta `ratingDiff` de cada jogador à fotografia salva. O rating inicial é preservado. A projeção exibida durante um 1v1 usa Elo genérico K=32, divisor 400, com arredondamento para pontos inteiros; não representa uma garantia do matchmaking de AoE2. Partidas rápidas e calibração podem divergir significativamente. O resultado confirmado da API tem prioridade sobre projeções na demonstração de partidas concluídas.

O teste automatizado com a API valida conexão, esquema, participantes e carregamento de estatísticas de um perfil público; ele não substitui o teste completo de início e fim dentro do jogo.
