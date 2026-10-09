# Circuito de Festivais — panorama nacional

Plataforma de consulta e administração de festivais de cinema brasileiros, construída a partir da planilha **[2025] ANEXO I — Relação de Festivais/Mostras**. O catálogo publicado contém os **633 registros** e os **19 campos** da aba `Anexo 2025`, sem preenchimento de lacunas ou correções editoriais automáticas.

Site: **https://circuitofestivais.github.io/circuito-2---nacional/**

## O que a plataforma faz

- busca em todos os campos e comentários da planilha;
- filtros combináveis formados apenas por colunas e valores da fonte;
- ordenação, contagem de resultados e consulta em celular ou computador;
- detalhe de cada festival com os 19 campos, notas e links clicáveis;
- filtros e festival aberto preservados na URL;
- estados de carregamento, erro, fonte offline, lista vazia e nenhum resultado;
- área administrativa protegida para criar, editar, arquivar e restaurar;
- cópia estática verificada para a consulta continuar funcionando se a base online falhar;
- histórico automático de alterações na base online.

## Arquitetura

```text
Planilha original (preservada, somente leitura)
        │
        ├── import_xlsx.py ──> JSON versionado e verificado ──> GitHub Pages
        │                                                    (fallback público)
        │
        └────────────────────> importação inicial no Supabase
                                                          │
Consulta pública <──────── leitura anônima só de ativos ──┤
Administração ── GitHub OAuth + RLS ── CRUD/arquivo ──────┘
```

O frontend usa React, TypeScript e Vite. Ele é totalmente estático e usa caminhos compatíveis com o subdiretório `/circuito-2---nacional/` do GitHub Pages. O Supabase é a camada mínima de persistência e autenticação:

- a chave **publishable/anon** pode aparecer no navegador porque não concede privilégios por si só;
- as políticas de Row Level Security (RLS) permitem ao público apenas ler registros ativos;
- somente a identidade GitHub permanente `337477512` da conta `circuitofestivais` pode gravar ou ler a lixeira;
- a autorização consulta `auth.identities.provider_id`, controlado pelo Supabase Auth, e não confia em e-mail, nome de usuário ou metadados editáveis;
- o frontend não contém token pessoal do GitHub, senha, `service_role`, chave privada ou outro segredo;
- cada criação, edição, arquivamento e restauração gera um registro em `festival_history`.

Sem Supabase configurado, o site público já funciona com o snapshot integral da planilha; a área administrativa permanece bloqueada de forma explícita. Essa separação permite publicar o catálogo antes de conceder qualquer credencial.

## Origem e estrutura dos dados

- original preservado: [`data/source/anexo-2025-festivais.xlsx`](data/source/anexo-2025-festivais.xlsx);
- catálogo consumido pelo site: [`public/data/festivals.json`](public/data/festivals.json);
- diagnóstico reproduzível: [`data/source/import-report.json`](data/source/import-report.json);
- importador somente leitura: [`scripts/import_xlsx.py`](scripts/import_xlsx.py).

Cada registro recebe um identificador técnico estável (`festival-0001` a `festival-0633`) derivado do número da coluna B. O nome público não é usado como chave, portanto edições de nome e festivais com nomes repetidos não produzem duplicação. Valores originais, vazios, acentos, quebras de linha, comentários e URLs são preservados no JSON. A interface pode aparar espaços apenas para exibição; o valor armazenado permanece intacto.

Para refazer a importação, use o Python empacotado no ambiente ou Python 3.11+ com `openpyxl`:

```powershell
python scripts/import_xlsx.py data/source/anexo-2025-festivais.xlsx public/data/festivals.json data/source/import-report.json
pnpm generate:static
pnpm check:data
```

O importador aborta se a sequência 1–633, a contagem de registros ou a estrutura esperada não coincidirem. Ele nunca grava na planilha original.

## Desenvolvimento local

Requisitos: Node.js 22+, pnpm 10+ e, apenas para reimportar a planilha, Python 3.11+ com `openpyxl`.

```powershell
pnpm install
pnpm dev
```

Abra `http://localhost:5173/circuito-2---nacional/`.

Comandos de verificação:

```powershell
pnpm check:data   # contagem, IDs, colunas e hash dos registros
pnpm test         # busca, filtros, validação e preservação de duplicidades
pnpm typecheck    # tipos TypeScript
pnpm build        # build de produção
pnpm check:dist   # conteúdo e caminhos do build
pnpm test:ui      # fluxos públicos e CRUD em navegador isolado
```

O modo de teste da administração só é ativado por `.env.test` durante o Playwright. O build de produção não o ativa.

## Configuração da administração

Esta é a única etapa que depende do proprietário do projeto. Ela deve ser feita antes de usar a administração com dados reais.

1. Crie um projeto no [Supabase](https://supabase.com/) e mantenha a região e o plano adequados à política do projeto.
2. No **SQL Editor**, execute integralmente [`supabase/001_schema.sql`](supabase/001_schema.sql). O arquivo já autoriza exclusivamente o ID GitHub `337477512`, pertencente à conta `circuitofestivais`.
3. Em **Authentication → URL Configuration**, defina:
   - Site URL: `https://circuitofestivais.github.io/circuito-2---nacional/`
   - Redirect URL permitida: `https://circuitofestivais.github.io/circuito-2---nacional/`
4. Em **Authentication → Providers → GitHub**, copie a **Callback URL** apresentada pelo Supabase. Ela terá o formato `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
5. Na conta `circuitofestivais`, abra **Settings → Developer settings → OAuth Apps → New OAuth App** e use:
   - Application name: `Circuito de Festivais`;
   - Homepage URL: `https://circuitofestivais.github.io/circuito-2---nacional/`;
   - Authorization callback URL: a Callback URL copiada do Supabase;
   - Device Flow: desabilitado.
6. No GitHub, copie o **Client ID** e gere um **Client secret**. Cole ambos somente em **Supabase → Authentication → Providers → GitHub**, ative o provedor e salve. O Client secret nunca deve entrar no repositório.
7. Copie apenas a **Project URL** e a **publishable key** (ou `anon` legada) para [`public/config.json`](public/config.json):

   ```json
   {
     "supabaseUrl": "https://SEU-PROJETO.supabase.co",
     "supabasePublishableKey": "SUA_CHAVE_PUBLICA",
     "cacheTtlMinutes": 15,
     "maxStaleHours": 24
   }
   ```

8. Faça commit e envie essa configuração pública. **Nunca** use `service_role`, senha do banco, Client secret do GitHub, token pessoal, chave secreta ou privada nesse arquivo.
9. Abra `https://circuitofestivais.github.io/circuito-2---nacional/#admin`, clique em **Entrar com GitHub** e autorize o OAuth usando a conta `circuitofestivais`.
10. Clique em **Importar planilha verificada**. O botão só aparece enquanto a tabela online estiver vazia.

Outras contas GitHub podem chegar à tela de autenticação, mas recebem `403` e as políticas RLS bloqueiam leitura administrativa e escrita. Para revogar o único acesso sem apagar dados:

```sql
update public.admin_github_accounts
set active = false
where github_user_id = 337477512;
```

### Como editar um festival

1. Entre em `/#admin` com a conta GitHub `circuitofestivais`.
2. Localize o registro e clique em **Editar**.
3. Altere os campos ou notas e clique em **Salvar festival**.
4. **Cancelar sem salvar** descarta o rascunho e mantém a versão anterior.

Os campos sempre preenchidos na planilha são obrigatórios. Números, dependência da coluna `ON`, combinação `Multiformatos` e URLs em notas recebem validação antes do envio.

### Como adicionar um festival

1. Clique em **Adicionar festival**.
2. Preencha os mesmos 19 campos existentes na fonte; não há campos ou categorias paralelos.
3. O próximo número da coluna B é sugerido como identificador sequencial, mas todos os demais valores devem ser informados.
4. Salve. O ID técnico é gerado uma única vez e não muda se o nome for editado.

### Arquivamento, recuperação e histórico

**Arquivar** exige confirmação, registra a alteração e retira o festival da consulta pública. A aba **Lixeira** permite restaurá-lo. A interface não oferece exclusão definitiva. Para auditoria ou recuperação avançada, administradores podem consultar `festival_history` no Supabase; o snapshot versionado no Git também funciona como cópia de segurança da importação original.

Antes de alterações em massa, exporte a tabela `festivals` no painel do Supabase. Teste mudanças estruturais em outro projeto, nunca na produção.

## Sincronização e cache

Quando o Supabase está configurado, o site tenta ler a tabela online a cada abertura. Uma resposta válida substitui o cache local. Se a rede falhar, um cache de no máximo `maxStaleHours` é usado; depois desse limite, a plataforma volta ao snapshot versionado em vez de manter dados online antigos indefinidamente. A faixa no topo informa quando a consulta não está usando a base online.

Editar no Supabase não modifica automaticamente o arquivo XLSX. O XLSX é a fonte histórica preservada; a tabela online passa a ser a fonte operacional após a importação inicial. Para uma atualização integral futura a partir de nova planilha:

1. guarde a nova versão sem sobrescrever a anterior;
2. execute o importador e revise o relatório;
3. rode todos os testes;
4. faça backup do Supabase;
5. use a importação administrativa somente após comparar IDs e decidir conscientemente como mesclar mudanças.

Não use o botão de importação como sincronização recorrente: ele existe apenas para inicializar uma base vazia e evita sobrescrever edições posteriores.

## Publicação no GitHub Pages

O workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) valida dados, testes e build antes de publicar.

1. No GitHub, abra **Settings → Pages**.
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.
3. Envie alterações para `main` ou execute manualmente **Publicar no GitHub Pages** em **Actions**.
4. Aguarde os jobs `build` e `deploy` concluírem com sucesso.
5. Verifique a URL publicada, inclusive `/#admin`, em celular e computador.

Nenhum caminho depende da raiz do domínio; assets, configuração e dados funcionam no subdiretório do repositório.

## Segurança e manutenção

- revise dependências e alertas do GitHub periodicamente;
- mantenha RLS habilitado em todas as tabelas públicas;
- não crie política de escrita para `anon`;
- não coloque segredos em `config.json`, `.env`, commits, issues ou logs;
- revogue imediatamente e faça rotação de qualquer segredo publicado por engano;
- mantenha somente o ID GitHub `337477512` ativo em `admin_github_accounts`;
- guarde o Client secret do GitHub exclusivamente no Supabase e faça rotação se ele for exposto;
- faça exportações periódicas do Supabase e teste restauração;
- confira `festival_history` quando houver alteração inesperada;
- rode `pnpm check:data && pnpm test && pnpm build && pnpm check:dist` antes de publicar.

## Limitações conhecidas e achados da fonte

- o relatório vinculado à planilha menciona 630 eventos, enquanto o anexo recebido e atualizado em 20/09/2026 contém 633;
- o autofiltro salvo no XLSX termina na linha 638 e não alcança os seis últimos registros (linhas 639–644); a importação lê todas as linhas e inclui os seis;
- há sete grupos de nomes repetidos, todos preservados porque representam edições diferentes; não há duplicatas exatas quando a numeração é desconsiderada;
- quatro nomes terminam com quebra de linha e seis municípios têm espaço inicial/final; a exibição é normalizada, mas o conteúdo armazenado não foi alterado;
- a marcação `S` é visual na coluna A: 310 células têm preenchimento ciano e 323 não têm essa marcação; a característica foi preservada separadamente do valor textual vazio;
- comentários da planilha somam 504, distribuídos por 398 festivais, com 24 URLs identificadas;
- GitHub Pages não executa backend. Por isso a escrita depende do Supabase configurado pelo proprietário; sem essa etapa, o catálogo é completo, mas somente leitura.

Os detalhes completos e reproduzíveis estão em [`data/source/import-report.json`](data/source/import-report.json).
