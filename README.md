# GuiaSys Studio — site oficial

Site institucional e CMS da GuiaSys Studio, publicado exclusivamente no Firebase.

- Produção: <https://www.guiasys.com.br/>
- Projeto Firebase atual durante a transição: `guiasys`
- Projeto Firebase de destino: `guiasys-licensing` (`GuiaSys Platform`)
- Repositório: <https://github.com/guiasysstudio/GuiaSys>
- Stack: HTML, CSS e JavaScript modular; Firebase Authentication, Cloud Firestore, Storage, Hosting e Cloud Functions.

## Arquitetura

- `/` — Home institucional e projetos em destaque carregados do Firestore.
- `/projetos/` — catálogo dinâmico de projetos públicos.
- `/projetos/{slug}/` — página dinâmica de um projeto; não exige um HTML por projeto.
- `/admin/` — CMS protegido por `studioAdmins/{uid}.enabled == true`.
- `/conta/` e `/conta/perfil/` — conta autenticada e perfil do cliente.
- `studioContactMessages` — atendimento em tempo real no ADM.
- `studioProfiles/{uid}` — perfil do site, separado de `customerAccounts/{uid}` do Licensing.
- `studioProjects/{slug}` — conteúdo administrável dos projetos, sem colisão com o domínio de licenças.
- `studio-projects/{slug}/...` no Storage — logo, banner e galeria.
- `sitemap` — Cloud Function que inclui somente projetos públicos.

Não há seed automático nem projetos hardcoded. Um ambiente novo começa com o catálogo vazio.

## Configuração e publicação

```powershell
npm --prefix functions install
firebase emulators:start --only auth,functions,firestore,hosting,storage --project legacy
```

Os arquivos `.firebaserc`, `firebase.json`, `firestore.rules`, `storage.rules` e `firestore.indexes.json` são a fonte de verdade da infraestrutura versionada. GitHub Pages e `CNAME` não fazem parte do fluxo de produção.

## Primeiro administrador

O usuário deve existir no Firebase Authentication. Crie manualmente o documento `studioAdmins/{UID}` com:

```json
{ "enabled": true }
```

As regras não permitem que clientes criem ou promovam administradores.

## Preparação GuiaSys Platform (C01)

O target Hosting `studio` está mapeado localmente para o site atual `guiasys` e para o site planejado
`guiasys-studio-e1ea8` no projeto `guiasys-licensing`. Não há alias padrão: qualquer comando Firebase precisa
escolher explicitamente `legacy` ou `platform`, reduzindo o risco de publicar no projeto errado.

O navegador lê `__/firebase/init.json` do Hosting. Nos domínios oficiais `guiasys.com.br`, a configuração precisa
apontar para `guiasys-licensing`. Uma divergência interrompe a inicialização em vez de conectar silenciosamente
ao projeto errado.

Consulte [docs/C01-LOCAL-PREPARATION.md](docs/C01-LOCAL-PREPARATION.md) antes de qualquer etapa com produção.
O estado implantado de homologação está registrado em [docs/C02-HOMOLOGATION.md](docs/C02-HOMOLOGATION.md).

## Modelo de projeto

O CMS mantém nome, slug, logo, banner, galeria, descrições, categorias, plataformas, status, versão, requisitos, recursos, FAQ, links de download/suporte/licença, ordem, visibilidade, destaque na Home e metadados SEO.

Um projeto oculto não aparece na Home, catálogo, busca, contato, sitemap ou página individual. Campos vazios não geram seções ou ações públicas.
