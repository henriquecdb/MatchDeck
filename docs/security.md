# Verificações de segurança

A aprovação de testes, a assinatura do atualizador e uma varredura antivírus não garantem ausência de malware ou vulnerabilidades. Alertas devem ser investigados, sem orientar usuários a desativar proteções ou criar exclusões.

## Dependências e publicação

- `Dependency audit` executa `npm audit` incluindo dependências de desenvolvimento e `cargo audit` contra o banco RustSec, sem lista de vulnerabilidades ignoradas.
- Avisos RustSec continuam visíveis. Dependências com problemas de segurança de memória (`unsound`) bloqueiam a auditoria se fizerem parte do grafo Windows; o filtro usa `cargo metadata` para o alvo real e falha se o relatório ou grafo estiver incompleto.
- PRs geram um candidato Windows em um runner independente, sem chave de assinatura e sem publicação de release.
- O executável e o instalador são examinados pelo ClamAV em Linux, sem executá-los. O banco de assinaturas precisa ser atualizado com sucesso.
- Uma detecção, erro de scanner ou falha de atualização do banco impede a aprovação da varredura. Os relatórios e hashes SHA-256 ficam nos artefatos do Actions.
- Releases permanecem em rascunho até as auditorias de dependências e a varredura dos arquivos efetivamente publicados serem aprovadas. O cache Rust continua compartilhado; auditoria e build executam em paralelo.

## Alerta Kaspersky no desenvolvimento

Em 2026-11-03, o usuário informou uma detecção `VHO:Trojan-PSW.Win32.Greedy.gen` para o executável de testes `matchdeck-81f4a80f8705cbfe.exe`. O arquivo deixou de estar disponível no caminho original, portanto seu hash e a equivalência com outro build não foram confirmados. Não foi classificado como falso positivo.

Um resultado limpo de outro scanner ou de outro executável não invalida esse alerta. Não restaure o arquivo suspeito apenas para executar testes. A validação de um candidato novo deve registrar a versão, o commit, os hashes e o resultado do antivírus; qualquer reanálise do arquivo original depende de um procedimento adequado junto ao fornecedor.

## Avisos de outras plataformas

Na revisão inicial da 0.4.3, os avisos de `proc-macro-error`, `zbus_names`, `zvariant`, `zvariant_derive` e `glib` estavam fora do grafo Windows. Eles precisam ser reavaliados antes de qualquer distribuição para outros sistemas operacionais. Não foi adicionada uma lista de exceções por identificador.

## Assinaturas

A assinatura Minisign valida a origem e integridade dos pacotes aceitos pelo atualizador. Ela não equivale a assinatura Authenticode do executável ou do instalador. O projeto ainda não possui certificado Authenticode de editor Windows, e não promete ausência de avisos de reputação ou detecções em todos os antivírus.
