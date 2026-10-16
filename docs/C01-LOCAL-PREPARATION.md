# C01 — preparação local para GuiaSys Platform

Estado: somente alterações locais. Nenhum recurso Firebase, domínio, dado, secret ou ambiente de produção foi alterado.

## Contrato de destino

- projeto Firebase: `guiasys-licensing`;
- nome de exibição planejado: `GuiaSys Platform`;
- Hosting Studio: target `studio`, site ID disponível `guiasys-studio-e1ea8`;
- Functions Studio: codebase isolada `studio`;
- domínio canônico futuro: `guiasys.com.br`;
- redirecionamento futuro: `www.guiasys.com.br` para `guiasys.com.br`;
- domínios legados: preservados apenas durante a transição já encerrada.

## Isolamento de dados

| Origem atual | Destino preparado | Motivo |
|---|---|---|
| `admins/{uid}` | `studioAdmins/{uid}` | não colidir com os administradores do Licensing |
| `users/{uid}` | `studioProfiles/{uid}` | separar perfil do site de `customerAccounts` |
| `projects/{slug}` | `studioProjects/{slug}` | `projects` já pertence ao domínio de licenciamento |
| `contactMessages/{id}` | `studioContactMessages/{id}` | explicitar propriedade e regras do Studio |
| Storage `projects/{slug}/...` | `studio-projects/{slug}/...` | evitar colisões de objetos |

O endpoint público `/api/projects` continua igual; somente sua fonte Firestore muda.

## Identidade

O UID do projeto `guiasys-licensing` é canônico. Para a conta com e-mail coincidente identificada na C00,
o perfil `users/{uidOrigem}` será transformado em `studioProfiles/{uidDestino}`. Não se cria uma segunda conta,
não se sobrescreve `customerAccounts/{uidDestino}` e nenhum e-mail ou UID deve aparecer em logs ou relatórios.

Usar o mesmo projeto Firebase unifica o diretório de usuários, mas não compartilha automaticamente a sessão
entre origens diferentes. O SSO transparente exige uma fase posterior com broker de sessão/token, validação de
origem, `state`/CSRF, cookies `HttpOnly; Secure; SameSite=Lax` e tokens de uso único. A C01 não simula isso com
tokens em URL, `localStorage` ou cookies acessíveis por JavaScript.

## Configuração segura durante a transição

O site lê `__/firebase/init.json`, servido pelo próprio Firebase Hosting:

- hosts legados aceitavam somente o projeto `guiasys`;
- hosts `.com.br` aceitam somente o projeto `guiasys-licensing`;
- uma incompatibilidade bloqueia a inicialização.

Não existe alias Firebase padrão. Os aliases `legacy` e `platform` exigem escolha explícita em uma fase
autorizada. O site ID inicialmente planejado, `guiasys-studio`, estava reservado globalmente; a C02 criou e
vinculou `guiasys-studio-e1ea8` ao Web App separado `GuiaSys Studio`.

## Ordem futura, fora da C01

1. confirmar o Web App/Hosting site `guiasys-studio-e1ea8` no projeto de destino;
2. cadastrar domínios autorizados no Authentication;
3. aplicar regras compostas e validar no Emulator Suite;
4. copiar dados para os namespaces `studio*` com contagens e hashes de controle, sem PII em logs;
5. remapear o único perfil sobreposto para o UID canônico do destino;
6. copiar objetos para `studio-projects/` e reescrever URLs/path em memória;
7. publicar em URL `web.app` de homologação e executar smoke tests;
8. conectar `.com.br`, observar e retirar os aliases legados;
9. somente depois avaliar SSO transparente e retirada do legado.

## Rollback

Até a troca de DNS, o rollback é simplesmente não publicar estas alterações. Depois da publicação, manter o
Hosting e os dados originais intactos permitiam reativar temporariamente os domínios legados; os namespaces novos não exigem
renomear ou destruir coleções do Licensing.
