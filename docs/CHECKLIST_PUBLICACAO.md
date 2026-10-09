# Checklist de publicação e manutenção

Use esta lista antes de cada atualização em produção.

## Dados

- [ ] A planilha original foi preservada e não foi sobrescrita.
- [ ] `pnpm check:data` confirma 633 registros, 19 colunas e o hash esperado (ou a mudança de contagem foi revisada e documentada).
- [ ] IDs técnicos, números da coluna B e nomes foram comparados.
- [ ] Duplicidades e inconsistências do novo relatório foram revisadas sem exclusão automática.
- [ ] Foi criado um backup/export da tabela `festivals` antes de importações em massa.

## Funcionalidade

- [ ] Busca, filtros combinados, ordenação e limpeza funcionam.
- [ ] Detalhe abre e todos os campos/notas aparecem.
- [ ] Links externos abrem em nova aba.
- [ ] Atualizar a página preserva a consulta pela URL.
- [ ] Criar, editar, cancelar, arquivar e restaurar funcionam com um e-mail autorizado.
- [ ] Um visitante anônimo não consegue gravar nem consultar a lixeira.
- [ ] Falha de rede exibe cache recente ou snapshot, com aviso.

## Qualidade e publicação

- [ ] `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check:dist` e `pnpm test:ui` passam.
- [ ] Não há erros de console ou requisições inesperadamente quebradas.
- [ ] A interface foi revisada em 375 px, 768 px e desktop.
- [ ] Não há tokens, senhas, `service_role`, chaves privadas ou credenciais no diff/histórico.
- [ ] O workflow do Pages terminou com sucesso.
- [ ] A URL publicada foi aberta e conferida após o deploy.
