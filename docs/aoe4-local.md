# Age 4 · primeira iteração local

Build de desenvolvimento para testar a integração experimental do Age 4, com dados separados da instalação normal.

## Executar

Com Node e Rust disponíveis, execute `npm run desktop:local -- -- --locked` na raiz.
O resultado é `src-tauri/target/debug/matchdeck.exe`.

Esse comando gera **MatchDeck Local**, com o identificador `com.matchdeck.local`.
Perfis, preferências e cache ficam separados da instalação normal do MatchDeck.
O executável pode ser aberto diretamente; não é necessário instalar um pacote.

## Testar

1. Na tela inicial, selecione o cartão **Age of Empires IV**.
2. Para conferir a faixa, abra **Demonstração → Iniciar demonstração**.
3. Encerre a demonstração antes de ativar a detecção.
4. Em **Partida**, informe seu ID ou link `https://aoe4world.com/players/ID` e ative a detecção.
5. Inicie um 1v1 ranqueado ou rápido, com o jogo em janela sem bordas.
6. Confira os dois jogadores, mapa, modalidade e estatísticas. Verifique também o término, Alt+Tab e os atalhos de ocultar e travar.

Para trocar de jogo, use o ícone e nome do jogo no topo da lateral, ou **Jogos** no cabeçalho.
A troca encerra a detecção anterior. Partidas e demonstrações ativas bloqueiam a troca.
Marque **Abrir no último jogo usado** na tela inicial ou em Configurações para pular a seleção ao abrir.
Cada jogo mantém seu próprio perfil, última partida e configurações de overlay.

## Escopo

- Somente 1v1 ranqueado e rápido de PC, quando publicado pelo AoE4 World.
- Faixa horizontal de 900 × 64 px, ajustável pela escala, posição e opacidade.
- Civilização, liga, nome, posição no ranking, rating, vitórias, derrotas e aproveitamento.
- Nas ranqueadas, o número principal representa pontos ranqueados; não é o MMR de pareamento.
- Estatísticas ausentes aparecem como `—`. Dados não são substituídos por estatísticas de outra modalidade.
- Uma consulta leve a cada 20 segundos; estatísticas completas são buscadas ao capturar uma nova partida. Falhas usam intervalo progressivo e preservam o overlay atual.
- Sem leitura de memória, injeção no jogo, novas dependências ou imagens remotas.

Equipes, partidas personalizadas, campanhas, histórico e aba Perfil do Age 4 ficam para outras iterações.
O funcionamento de uma partida real precisa ser confirmado no teste local; demonstração não valida a cobertura da fonte.

API: https://aoe4world.com/api
Créditos das imagens: `public/aoe4/NOTICE.md`.
