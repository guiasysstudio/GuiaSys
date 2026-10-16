# C03-B — migração controlada de dados do Studio

Data: 2026-10-15

## Resultado

A migração autorizada do Studio para o Firebase `guiasys-licensing` foi concluída. Todas as escritas usaram
criação exclusiva, sem sobrescrita, e foram verificadas após a operação.

| Recurso criado | Quantidade |
|---|---:|
| `studioAdmins` | 1 |
| `studioProfiles` | 1 |
| `studioProjects` | 1 |
| `studioContactMessages` | 0 |
| Objetos em `studio-projects/` | 3 |

Nenhum dado pessoal, UID, nome de arquivo ou token foi incluído neste relatório ou emitido nos resultados da
execução.

## Preflight

Antes das escritas, o processo confirmou:

- 1 usuário Auth na origem e 4 no destino;
- uma única correspondência canônica, com provedor Google e UIDs diferentes;
- vínculo existente e válido da conta canônica com uma `customerAccount`;
- 3 documentos de origem e nenhum documento nos namespaces `studio*` do destino;
- 3 objetos referenciados, totalizando 5.200.040 bytes;
- ausência dos três caminhos de destino e ausência de colisões;
- compatibilidade dos documentos transformados com o contrato local.

O preflight era somente leitura e teria abortado a etapa caso qualquer condição tivesse mudado desde a C03-A.

## Firestore

Os três documentos foram criados em uma única operação atômica com precondição de inexistência:

- o administrador legado tornou-se administrador apenas do Studio sob o UID canônico;
- o perfil foi criado sob o UID canônico, sem mesclar nem substituir a `customerAccount`;
- o projeto foi criado em `studioProjects`, mantendo a coleção `projects` do Licensing separada;
- o campo legado `customActions` foi removido durante a transformação;
- caminhos e URLs de mídia foram atualizados para o bucket do destino.

Se qualquer um dos três documentos já existisse, a operação inteira teria falhado sem criar nenhum deles.

## Storage

Os três objetos referenciados foram copiados diretamente entre buckets para
`studio-projects/{slug}/{grupo}/{arquivo}`. O conteúdo não foi baixado localmente.

- total copiado e verificado: 3 objetos / 5.200.040 bytes;
- tipo de conteúdo e metadados funcionais foram preservados;
- cada objeto recebeu um novo token de download no destino;
- os tokens antigos não foram reutilizados nem exibidos;
- os dois objetos não referenciados, com 90.220 bytes, não foram copiados;
- os cinco objetos da origem permaneceram intactos.

Cada cópia usou precondição de geração zero, impedindo sobrescrita de um caminho existente.

## Identidade e dados do Licensing

- Auth permaneceu com 1 usuário na origem e 4 no destino;
- nenhuma conta, provedor, senha, UID ou vínculo Auth foi criado, atualizado ou removido;
- `customerAccounts` permaneceu com 3 documentos e com o vínculo canônico válido;
- `admins`, `adminUids`, `projects` e demais coleções do Licensing não foram alteradas;
- o novo `studioAdmin` não concede função administrativa no Licensing.

## Verificação final

Uma segunda passagem independente e somente leitura confirmou:

- origem: 3 documentos Firestore e 5 objetos de projeto preservados;
- destino: 3 documentos Studio e 3 objetos Studio;
- nenhuma URL de mídia do projeto aponta para o bucket antigo;
- `/api/projects` retorna exatamente 1 projeto público;
- o sitemap contém a página do projeto sob `https://guiasys.com.br`;
- Studio `web.app`, Licensing público e painel administrativo continuam respondendo;
- 5 de 5 verificações HTTP retornaram status 200.

## Limites preservados

Não houve alteração de regras, Functions, Hosting, deploys, usuários Auth, dados de origem, DNS, Cloudflare,
domínios customizados, secrets, IAM, commits ou pushes.

## Rollback

O rollback automático não foi acionado porque a migração e todas as verificações passaram. A origem permanece
como cópia operacional intacta.

Se um rollback for solicitado posteriormente, ele deve remover exclusivamente os três documentos `studio*` e
os três objetos `studio-projects/` criados nesta etapa, usando os vínculos recalculados em memória e
precondições de versão. Por ser uma remoção destrutiva posterior, exige autorização explícita separada.

## Próximo gate

Antes de conectar `guiasys.com.br`, executar uma homologação autenticada no `web.app`, avaliar App Check em
modo de monitoramento e validar o fluxo de administrador do Studio. Login real pode atualizar metadados Auth e
deve ser autorizado separadamente. DNS e Cloudflare continuam fora do escopo até aprovação posterior.
