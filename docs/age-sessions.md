# Sessões e pós-partida no Age 2 e Age 4

Na aba **Partida**, vincule o perfil e use **Iniciar sessão** antes de jogar. O placar e
os dez últimos resultados ficam salvos por jogo e perfil. **Encerrar sessão** preserva
o registro; **Nova sessão** substitui o placar anterior.

A contagem inclui apenas partidas iniciadas após o começo da sessão, com vitória,
derrota ou empate explicitamente confirmado pela fonte. Partidas ausentes, resultados
pendentes e falhas de rede não viram derrotas. Resultados repetidos são deduplicados
pelo ID; a publicação posterior de metadados ou variação de rating atualiza a mesma entrada.

- **Age 2:** acompanha as modalidades já detectadas pelo aplicativo, incluindo equipes.
  Os resultados disponíveis na consulta recente são recuperados enquanto a detecção está ativa.
- **Age 4:** permanece restrito a ranqueadas e rápidas de PC em 1v1. A consulta usa a
  última partida e, quando necessário, a partida que já estava sendo acompanhada.
  Jogos descartados e resultados sem decisão não contam para a sessão.

A retomada preserva os resultados salvos e aproveita o que a fonte ainda fornece nas
consultas recentes. Isso não representa um histórico completo de partidas jogadas com
o aplicativo fechado. A publicação da fonte pode atrasar. Partidas sem horário final
confiável não são acrescentadas retroativamente a uma sessão encerrada.

## Overlay

**Mostrar sessão no overlay** exibe placar, aproveitamento e sequência dos dez últimos
resultados. **Pós-partida (s)** controla o resumo temporário (0 desativa, padrão 8).
O resumo traz resultado, adversário ou equipe, mapa, duração e variação publicada,
quando disponíveis. Pontos ranqueados do Age 4 não são apresentados como MMR.

O resumo só é exibido para partidas acompanhadas nesta execução, após confirmação do
resultado, respeitando foco, ocultação manual, jogo e perfil. A leitura de uma partida
antiga ao iniciar não abre o resumo. Uma nova partida tem prioridade sobre o cartão anterior.

A duração do Age 2 é calculada a partir dos horários informados pela fonte. No Age 4,
usa o campo duration; updated_at é a atualização do registro e não a duração da partida.
Quando a fonte não informa uma duração válida, ela é omitida.

## Testar sem jogar

Desative a detecção e, na aba **Demonstração**, escolha jogadores fictícios. Use
**Resultado de teste** e **Testar pós-partida** para simular vitória, derrota ou empate.
A faixa e o resumo usam uma sessão fictícia, sem modificar o placar salvo. No Age 2,
a simulação também acompanha o formato escolhido, de 1v1 a 4v4.

No Age 4, a aba **Overlay** permite escolher **Compacto horizontal** ou **Compacto vertical**.
A opção fica salva por jogo e também pode ser guardada nos perfis de layout.

Fontes: [AoE II Companion](https://www.aoe2companion.com/) e [API do AoE4 World](https://aoe4world.com/api/).
