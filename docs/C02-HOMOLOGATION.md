# C02 — homologação da GuiaSys Platform

Data: 2026-10-15

## Resultado

- project ID preservado: `guiasys-licensing`;
- nome de exibição: `GuiaSys Platform`;
- Web App separado: `GuiaSys Studio`;
- Hosting target: `studio`;
- Hosting site: `guiasys-studio-e1ea8`;
- URL de homologação: <https://guiasys-studio-e1ea8.web.app>;
- Functions codebase: `studio`, região `southamerica-east1`;
- Functions: `publicProjects`, `sitemap` e `adminProjectMedia`;
- Firestore `(default)`: Standard, `southamerica-east1`;
- regras compostas aplicadas após dry-run e compilação bem-sucedidos.

O identificador inicialmente planejado `guiasys-studio` estava reservado globalmente. O sufixo `e1ea8` foi
sugerido pelo Firebase e não altera o futuro domínio público `guiasys.com.br`.

## Authentication

Foram preservados os domínios autorizados existentes e acrescentados:

- `guiasys.com.br`;
- `www.guiasys.com.br`;
- `licencas.guiasys.com.br`;
- `painel.licencas.guiasys.com.br`;
- `guiasys-studio-e1ea8.web.app`;
- `guiasys-studio-e1ea8.firebaseapp.com`.

Nenhum usuário, provedor, senha, UID ou vínculo foi criado, removido ou alterado. Login real não foi executado
na C02 para não atualizar metadados de usuário como `lastLoginAt`.

## Smoke tests

- Home Studio: HTTP 200;
- `__/firebase/init.json`: projeto `guiasys-licensing` e Web App Studio correto;
- `/api/projects`: contrato válido e zero projetos, pois não houve migração;
- `/sitemap.xml`: HTTP 200 e canonical futuro `https://guiasys.com.br/`;
- sites Licensing público e admin: HTTP 200;
- `www.guiasys.com.br`, `licencas.guiasys.com.br` e `painel.licencas.guiasys.com.br`: HTTP 200.

## Limites preservados

- nenhum DNS ou registro Cloudflare foi alterado;
- nenhum domínio customizado foi conectado ao Hosting;
- nenhum documento Firestore ou objeto Storage foi criado, copiado, atualizado ou removido;
- nenhum commit ou push foi realizado;
- a codebase `licensing` e a Function `licensingApi` permaneceram implantadas.

## Rollback preparado

As regras anteriores deny-all estão em `docs/rollback/C02-firestore-before.rules`. Reaplicá-las bloquearia o
acesso direto aos namespaces Studio sem alterar dados do Licensing. A remoção do Web App, Hosting site ou
Functions é destrutiva e exige autorização separada; não faz parte desta etapa.

O nome de exibição pode voltar para `Guiasys Licensing`. Os seis domínios adicionados podem ser removidos da
lista do Auth sem tocar nos nove domínios preservados. Como ainda não existe DNS `.com.br`, não há cutover a
reverter.

## Próximo gate

A C03 deve começar com dry-run de identidade, Firestore e Storage, produzir apenas contagens e hashes de
controle sem PII e exigir autorização separada antes de qualquer cópia de dados.
