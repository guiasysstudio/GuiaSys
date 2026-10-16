# C03-A — dry-run de identidade, Firestore e Storage

Data: 2026-10-15

## Escopo e garantias

Esta etapa consultou em modo somente leitura os projetos Firebase `guiasys` (origem) e
`guiasys-licensing` (destino). Nenhum usuário, documento, objeto, regra, configuração, deploy, domínio,
DNS ou recurso foi criado, atualizado ou removido.

Os registros foram avaliados somente em memória. O relatório contém apenas contagens, tipos e categorias;
não contém e-mails, UIDs, CPF, telefones, endereços, nomes de arquivos, tokens ou valores de metadados.
Não houve exportação ou download de conteúdo do Storage.

## Conclusão executiva

A migração de dados do Studio é viável com baixo volume e sem colisão no destino, desde que a etapa de
escrita aplique precondições de destino vazio e conserve o UID do Auth de `guiasys-licensing` como canônico.

- nenhuma conta Auth precisa ser criada, importada, mesclada ou removida;
- um perfil e uma concessão administrativa do Studio precisam trocar do UID legado para o UID canônico;
- um projeto pode ser transformado para `studioProjects` sem revisão manual;
- três objetos de mídia referenciados devem ser copiados e ter caminhos e URLs reescritos;
- dois objetos não referenciados devem permanecer apenas na origem e não entrar na primeira cópia;
- nenhuma coleção `studio*` ou objeto `studio-projects/` existente será sobrescrito.

## Authentication

| Verificação | `guiasys` | `guiasys-licensing` |
|---|---:|---:|
| Usuários | 1 | 4 |
| Habilitados | 1 | 4 |
| Desabilitados | 0 | 0 |
| E-mail verificado | 1 | 4 |
| Sem e-mail | 0 | 0 |
| Grupos de e-mail duplicado no próprio projeto | 0 | 0 |
| Google | 1 | 3 |
| E-mail/senha | 0 | 1 |
| Domínios autorizados | 6 | 15 |

Nos dois projetos, e-mail/senha está habilitado, enquanto acesso anônimo e telefone estão desabilitados.
A proteção contra enumeração de e-mails está desabilitada nos dois projetos e deve ser avaliada em uma etapa
separada, com teste de compatibilidade dos fluxos de login e recuperação.

### Sobreposição de identidade

- existe um grupo de e-mail coincidente entre origem e destino;
- as duas contas usam o mesmo provedor Google e têm e-mail verificado;
- os UIDs são diferentes;
- não existem usuários exclusivos na origem;
- o UID legado não está ocupado por outra conta do destino;
- a conta canônica do destino já está ligada a uma `customerAccount` válida.

Decisão: não alterar o Auth. O perfil `users/{uidLegado}` será transformado em
`studioProfiles/{uidCanonico}` e o acesso `admins/{uidLegado}` em `studioAdmins/{uidCanonico}`. A
`customerAccount` existente continuará intacta. O acesso concedido será somente de administrador do Studio;
não haverá promoção para administrador do Licensing.

## Firestore

Os dois bancos são Firestore Standard em `southamerica-east1`.

### Origem

| Coleção | Documentos | Destino |
|---|---:|---|
| `admins` | 1 | `studioAdmins` |
| `users` | 1 | `studioProfiles` |
| `projects` | 1 | `studioProjects` |
| `contactMessages` | 0 | `studioContactMessages` |

O documento de perfil e o documento administrativo estão corretamente vinculados ao único usuário Auth da
origem. Não há vínculo órfão.

### Destino

Foram encontradas 11 coleções de nível superior e 298 documentos de nível superior do Licensing. Entre os
dados relevantes ao vínculo de identidade:

- existem três `customerAccounts`;
- as três possuem vínculo `firebaseUid` válido com Auth;
- a conta canônica sobreposta é uma delas;
- `studioAdmins`, `studioProfiles`, `studioProjects` e `studioContactMessages` estão vazias/inexistentes;
- a coleção `projects` do Licensing contém quatro documentos e não será tocada.

### Simulação de transformação

| Transformação | Origem | Já existentes no destino | Colisões | Resultado |
|---|---:|---:|---:|---|
| `admins` → `studioAdmins` | 1 | 0 | 0 | compatível |
| `users` → `studioProfiles` | 1 | 0 | 0 | compatível após remapear UID |
| `projects` → `studioProjects` | 1 | 0 | 0 | compatível após normalização |
| `contactMessages` → `studioContactMessages` | 0 | 0 | 0 | nada a copiar |

Os três documentos passaram nas validações locais de campos, tipos, limites, formatos, caminhos e listas.
O projeto possui um campo legado `customActions`, não utilizado pelo código atual e não permitido pelo
contrato novo. Ele será descartado na transformação; nenhum outro campo exige revisão manual.

## Storage

Cada projeto possui três buckets gerenciados: dois de artefatos de Functions e um bucket Firebase padrão.
Somente os buckets Firebase padrão entram no plano de migração.

Na origem, `projects/` contém cinco objetos, totalizando 5.290.260 bytes:

- três objetos estão referenciados pelo documento do projeto, totalizam 5.200.040 bytes e possuem token de
  download do Firebase;
- dois objetos não são referenciados, totalizam 90.220 bytes e serão deixados na origem;
- todas as três referências do Firestore apontam para objetos existentes;
- as três URLs atuais apontam para o bucket da origem e precisam ser substituídas.

No destino existe exatamente um bucket Firebase padrão. Não há objeto em `studio-projects/` e a transformação
dos três caminhos referenciados não gera colisão nem duplicata.

Plano seguro: copiar somente os três objetos referenciados para `studio-projects/{slug}/{grupo}/{arquivo}`,
preservar tipo de conteúdo, criar novos tokens de download no destino e reescrever as três URLs em memória.
Tokens não devem ser reutilizados, persistidos em relatório ou exibidos em logs.

## Matriz de riscos

| Risco | Impacto | Situação no dry-run | Controle para a escrita |
|---|---|---|---|
| Associar o perfil ao UID errado | Alto | um e-mail, UIDs diferentes | correspondência por e-mail normalizado + provedor; UID do destino é canônico |
| Sobrescrever `customerAccounts` | Crítico | conta canônica já possui vínculo | escrever somente em `studioProfiles`; bloquear qualquer escrita em `customerAccounts` |
| Promover privilégio indevido | Alto | um admin legado será remapeado | criar apenas `studioAdmins`; não tocar `admins`/`adminUids` do Licensing |
| Colidir com `projects` do Licensing | Crítico | quatro projetos de Licensing existentes | usar exclusivamente `studioProjects` |
| Sobrescrever destino parcial | Alto | namespaces Studio vazios | criação com precondição de inexistência; abortar diante de qualquer colisão |
| Manter URLs no bucket antigo | Alto | três URLs legadas | copiar primeiro, gerar URL nova e só então criar `studioProjects` |
| Copiar arquivos órfãos | Baixo | dois objetos não referenciados | não copiar na primeira migração; manter na origem |
| Campo legado fora das regras | Médio | um `customActions` | remoção determinística antes da validação |
| Abuso de Auth por enumeração | Médio | proteção desabilitada | avaliar habilitação em etapa separada e testar fluxos |
| Abuso do formulário público | Alto | App Check ainda pendente | ativar App Check em monitoramento e rate limit antes do domínio público |

## Plano de C03-B

1. Repetir o preflight e abortar se qualquer contagem, vínculo ou colisão tiver mudado.
2. Copiar os três objetos referenciados para `studio-projects/`, usando criação exclusiva e tokens novos.
3. Verificar tamanho, tipo de conteúdo e presença dos três objetos, sem imprimir nomes ou tokens.
4. Criar `studioProjects` com os três caminhos/URLs novos e sem `customActions`.
5. Criar `studioProfiles` sob o UID canônico, atualizando apenas os campos internos `uid` e o ID do documento.
6. Criar `studioAdmins` sob o mesmo UID canônico, isolado dos papéis administrativos do Licensing.
7. Verificar contagens, contrato de `/api/projects`, sitemap e leitura pública em `web.app`.
8. Não modificar Auth, `customerAccounts`, coleções do Licensing, dados de origem, DNS ou Cloudflare.

Todas as gravações devem usar semântica create-only. A etapa deve parar e reverter os itens criados durante a
própria execução se houver falha antes da verificação final.

## Testes de aceite da C03-B

- Auth continua com 1 usuário na origem e 4 no destino;
- `customerAccounts` continua com três documentos e os mesmos vínculos;
- destino passa a ter 1 `studioAdmin`, 1 `studioProfile`, 1 `studioProject` e 0 mensagens;
- existem exatamente três objetos referenciados em `studio-projects/` e nenhuma referência quebrada;
- nenhuma URL do projeto aponta para o bucket da origem;
- `/api/projects` retorna um projeto compatível sem campos privados;
- `/sitemap.xml` inclui o projeto sob `https://guiasys.com.br`;
- os três sites `web.app` existentes continuam respondendo;
- os domínios legados, DNS e Cloudflare permanecem inalterados durante esta etapa histórica.

## Rollback

A origem permanecerá intacta e funcionará como cópia de segurança operacional. Como os namespaces de destino
estão vazios antes da migração, o rollback consiste em remover exclusivamente os três documentos e três
objetos criados pela execução C03-B, cujos identificadores podem ser recalculados em memória a partir da
origem e do vínculo Auth. Não é necessário armazenar UIDs ou nomes de arquivos em manifesto.

O rollback não altera contas Auth, `customerAccounts`, coleções do Licensing, Functions, Hosting, regras,
domínios ou DNS. Qualquer remoção posterior exige autorização explícita por ser destrutiva.

## Gate

A C03-A está concluída. Nenhuma escrita da C03-B foi realizada. A próxima etapa exige autorização explícita
separada para criar os três documentos e copiar os três objetos no projeto `guiasys-licensing`.
