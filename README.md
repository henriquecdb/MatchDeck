<p align="center">
  <img src="src-tauri/icons/source.svg" alt="Logotipo do MatchDeck" width="96" height="96">
</p>

<h1 align="center">MatchDeck</h1>

<p align="center">Informações da sua partida, sem sair do jogo.</p>

<p align="center">
  <a href="https://github.com/henriquecdb/MatchDeck/releases/latest"><img src="https://img.shields.io/github/v/release/henriquecdb/MatchDeck?label=vers%C3%A3o" alt="Última versão"></a>
  <a href="https://github.com/henriquecdb/MatchDeck/actions/workflows/checks.yml"><img src="https://github.com/henriquecdb/MatchDeck/actions/workflows/checks.yml/badge.svg" alt="Verificações"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licen%C3%A7a-MIT-blue" alt="Código sob licença MIT"></a>
</p>

O MatchDeck é um overlay para Windows que mostra jogadores, civilizações e estatísticas durante a partida. Você escolhe a posição, o tamanho e a opacidade, com atalhos personalizáveis para controlar a exibição.

## Instalar e usar

1. Baixe o arquivo **x64-setup.exe** da [última versão](https://github.com/henriquecdb/MatchDeck/releases/latest) e execute o instalador.
2. Abra o MatchDeck, escolha o jogo e vincule seu perfil na aba **Partida**.
3. Ative a detecção e entre em uma partida com o jogo em **janela sem bordas**.

Não precisa instalar Node.js ou Rust. O overlay aparece quando a fonte identifica a partida e permanece até o encerramento. A detecção depende dos serviços de cada jogo e pode ter atraso.

Quer experimentar antes? Na aba **Demonstração**, use jogadores fictícios ou a última partida sincronizada. No Age 2, você pode testar de 1v1 a 4v4.

## Jogos suportados

| Jogo | Disponível |
| --- | --- |
| **Age of Empires II: DE** | Multiplayer ranqueado e rápido, rating por modalidade, vitórias, derrotas, civilizações e unidades únicas. A aba Perfil reúne estatísticas, últimas cinco partidas disponíveis e gráfico de rating para filas 1v1. |
| **Age of Empires IV** · experimental | Multiplayer ranqueado e rápido de PC em 1v1. Faixa compacta com civilizações, liga, posição no ranking, rating/pontos e resultados. Perfil com estatísticas, últimas cinco partidas disponíveis e gráfico recente de rating/MMR. |

Campanhas e skirmish offline não têm detecção. Lobbies personalizados do Age 2 dependem da cobertura da fonte e ainda precisam de validação; equipes e partidas personalizadas do Age 4 ainda não são suportadas.

Os dados vêm do [AoE II Companion](https://www.aoe2companion.com/) e do [AoE4 World](https://aoe4world.com/). Valores indisponíveis aparecem como **—**. Pontos ranqueados e MMR são medidas diferentes; a projeção de ganho/perda do Age 2 é opcional e não oficial.

## Do seu jeito

- Ajuste posição, escala, opacidade e monitor na aba **Overlay**.
- No Age 2, escolha o layout completo para 1v1 ou os compactos para duelos e equipes.
- Use a interface em português ou inglês. O idioma de civilizações e unidades é independente e começa em inglês.
- Personalize os atalhos em **Configurações**. Por padrão, **Ctrl+Shift+H** mostra/oculta o overlay e **Ctrl+Shift+O** trava/destrava sua posição e a passagem de cliques.

Por padrão, o overlay de uma partida real aparece com o jogo em primeiro plano. Você pode mudar isso na aba Overlay. O aplicativo também oferece bandeja do Windows e atualizações com notas da versão e progresso de instalação.

## Desenvolver

Requer **Node.js 22.12+**, Rust MSVC e os [pré-requisitos do Tauri para Windows](https://v2.tauri.app/start/prerequisites/).

```powershell
npm ci
npm run desktop
```

Para abrir somente a prévia no navegador, use `npm run dev`. A janela de overlay e a detecção real exigem o aplicativo desktop.

Veja como [contribuir](CONTRIBUTING.md), [testar a detecção do Age 2](docs/real-detection.md) e [testar o Age 4](docs/aoe4-local.md). O histórico fica no [changelog](CHANGELOG.md); detalhes de [publicação](docs/releases.md) e [segurança](docs/security.md) ficam na documentação.

A linha **0.5.x** está focada em consolidar o Age 4. A **0.6.0** será o início da integração com StarCraft II.

## Licença e créditos

O código original do MatchDeck está sob a [licença MIT](LICENSE). Imagens, nomes, traduções e marcas dos jogos, assim como dependências de terceiros, mantêm seus próprios direitos e condições de uso.

Consulte os créditos de [Age 2](public/units/NOTICE.md), [Age 4](public/aoe4/NOTICE.md) e [ícones dos jogos](public/games/NOTICE.md). MatchDeck é um projeto independente, sem vínculo ou endosso da Microsoft, Valve ou dos serviços de dados utilizados.
